const { getWeeklyTrafficStats, sendPerformanceEmail } = require("./traffic");
const prisma = require("../../prisma/client");

(async function () {
    try {

        const hosts = await prisma.user.findMany({
            where: {
                staycations: {
                some: {}     // means: at least one staycation exists
                }
            },
            select: {
                id: true,
                email: true,
                staycations: true,
            }
        });

    for (const host of hosts) {
      const stats = await getWeeklyTrafficStats(host.id);
      await sendPerformanceEmail(host, stats);
      console.log(`📨 Sent report to host ${host.email}`);
    }

    console.log("✅ Weekly traffic reports completed.");
  } catch (e) {
    console.error("❌ Weekly report failed:", e);
  }
})();
