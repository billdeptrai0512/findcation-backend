const prisma = require('../prisma/client');
const { startOfDay, subDays, endOfDay } = require('date-fns');

async function aggregateTraffic(targetDate = null) {
    const date = startOfDay(targetDate || subDays(new Date(), 1));
    const end = endOfDay(date);

    console.log('[CRON] Aggregating traffic for:', date.toISOString());

    // 1️⃣ Get all traffic for the day
    const traffics = await prisma.traffic.findMany({
        where: {
            createdAt: {
                gte: date,
                lt: end,
            },
            sessionId: { not: null },
        },
        select: {
            staycationId: true,
            sessionId: true,
            trafficType: true,
        },
    });

    // 2️⃣ Group by staycation + session
    const map = new Map();

    for (const t of traffics) {
        const key = `${t.staycationId}:${t.sessionId}`;

        if (!map.has(key)) {
            map.set(key, {
                staycationId: t.staycationId,
                sessionId: t.sessionId,
                types: new Set(),
            });
        }

        map.get(key).types.add(t.trafficType);
    }

    // 3️⃣ Aggregate per staycation
    const stats = {};

    for (const { staycationId, types } of map.values()) {
        if (!stats[staycationId]) {
            stats[staycationId] = {
                views: 0,
                clicks: 0,
                warnings: 0,
                cancel: 0,
                continues: 0,
                successes: 0,
            };
        }

        if (types.has('VIEW')) stats[staycationId].views++;
        if (types.has('CONTACT_CLICK')) stats[staycationId].clicks++;
        if (types.has('CONTACT_WARNING_SHOWN')) stats[staycationId].warnings++;
        if (types.has('CONTACT_WARNING_CANCEL')) stats[staycationId].cancel++;
        if (types.has('CONTACT_CONTINUE')) stats[staycationId].continues++;
        if (types.has('CONTACT_SUCCESS')) stats[staycationId].successes++;
    }

    // 4️⃣ Upsert DailyTraffic (ONE ROW PER STAYCATION)
    for (const staycationId in stats) {
        await prisma.dailyTraffic.upsert({
            where: {
                staycationId_date: {
                    staycationId: Number(staycationId),
                    date,
                },
            },
            update: stats[staycationId],
            create: {
                staycationId: Number(staycationId),
                date,
                ...stats[staycationId],
            },
        });
    }

    console.log('[CRON] Done. Staycations aggregated:', Object.keys(stats).length);
}

const argDate = process.argv[2] ? new Date(process.argv[2]) : null;

aggregateTraffic(argDate)
    .catch((err) => {
        console.error('[CRON] Failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
