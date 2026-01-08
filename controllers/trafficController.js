const prisma = require('../prisma/client');
const { getWeeklyTrafficStats, sendPerformanceEmail } = require('../utils/email/weeklyPerformanceContent');

exports.getAllTraffic = async (req, res) => {
  try {
    const traffic = await prisma.traffic.findMany({
      include: {
        staycation: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(traffic);
  } catch (error) {
    console.error("Failed to fetch all traffic", error);
    res.status(500).json({ error: "Failed to fetch all traffic" });
  }
};

exports.recordTraffic = async (req, res) => {
  const staycationId = Number(req.params.staycationId);
  const { trafficType, platform, sessionId } = req.body;

  try {
    // Upsert daily traffic record for today
    await prisma.traffic.create({
      data: {
        staycationId: staycationId,
        sessionId: sessionId,

        trafficType: trafficType,
        platform: platform,
      }
    });

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to record view' });
  }
};


exports.sendWeeklyPerformance = async (req, res) => {
  const hostId = Number(req.params.hostId);

  try {
    const host = await prisma.user.findUnique({
      where: { id: hostId },
      select: { email: true },
    });

    if (!host) return res.status(404).json({ error: "Host not found" });

    const statsByStaycation = await getWeeklyTrafficStats(hostId);

    await sendPerformanceEmail(host, statsByStaycation);

    res.json({ success: true, stats: statsByStaycation });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to send performance email" });
  }
};




