const prisma = require('../prisma/client')

exports.recordStaycationClick = async (req, res) => {
  const { contactType } = req.body;
  console.log(contactType)
  const staycationId = Number(req.params.staycationId); // ✅ convert to number
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // Upsert traffic record for today
    await prisma.traffic.upsert({
      where: {
        staycationId_platform_date: {
          staycationId: staycationId,
          platform: contactType,
          date: today,
        },
      },
      update: {
        clicks: { increment: 1 },
      },
      create: {
        staycationId: staycationId,
        platform: contactType,
        date: today,
        clicks: 1,
      },
    });

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to record click' });
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



  
