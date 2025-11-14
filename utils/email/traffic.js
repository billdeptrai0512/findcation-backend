// utils/sendEmail.js
const prisma = require('../../prisma/client');
const dotenv = require("dotenv");
dotenv.config();
const nodemailer = require("nodemailer");

const sendPerformanceEmail = async (host, statsByStaycation) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        },
    });

  // Build HTML blocks per staycation
    const staycationStatsBlocks = statsByStaycation.map((stay) => {
    const { address, traffic } = stay;

    return `
      <div style="border:1px solid #eee; border-radius:10px; padding:14px 18px; margin-bottom:12px; background:#fafafa;">
        <div style="font-weight:600; font-size:16px; color:#222;">${address}</div>
        <ul style="list-style-type: disc; padding-left: 20px; padding-top: 8px; margin:0; font-size:14px; color:#444;">
            <li> <strong>Facebook: ${traffic.FACEBOOK} </strong> truy cập</li>
            <li> <strong>Instagram: ${traffic.INSTAGRAM} </strong> truy cập</li>
            <li> <strong>Zalo: ${traffic.ZALO} </strong> truy cập</li>
        </ul>
      </div>
    `;
    }).join("");

    const name = statsByStaycation[0].name
    const totalClicks = statsByStaycation.reduce((sum, stay) => {
        const t = stay.traffic;
        return sum + (t.FACEBOOK || 0) + (t.INSTAGRAM || 0) + (t.ZALO || 0);
    }, 0);
    // const trend = totalClicks > 100 ? "▲ +12%" : "▼ -5%";
    // const trendColor = totalClicks > 100 ? "#16a34a" : "#dc2626";
    // <span style="color:${trendColor};">${trend}</span>

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background:#fafafa;">
        <h2>Thống kê traffic mỗi tuần của từng địa chỉ:</h2>
        ${staycationStatsBlocks}
        <div style="font-weight:600; font-size:16px; color:#222;">
            Vậy là đã có ${totalClicks} khách hàng liên lạc với ${name} thông qua Findcation</div>
        </div>
    `;

    await transporter.sendMail({
        from: "Findcation",
        to: host.email,
        subject: "[Findcation] Báo cáo traffic hàng tuần",
        html,
    });
};

const getWeeklyTrafficStats = async (hostId) => {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  // Get all staycations for the host
  const staycations = await prisma.staycation.findMany({
    where: { hostId },
    select: {
      id: true,
      name: true,
      location: true,
    },
  });

  console.log(staycations)

  // Get traffic stats for each staycation
  const statsByStaycation = await Promise.all(staycations.map(async (stay) => {
    const trafficRecords = await prisma.traffic.findMany({
      where: {
        staycationId: stay.id,
        date: { gte: weekAgo, lte: today },
      },
      select: { platform: true, clicks: true },
    });

    const traffic = { FACEBOOK: 0, INSTAGRAM: 0, ZALO: 0 };
    trafficRecords.forEach((record) => {
      traffic[record.platform] += record.clicks;
    });

    return {
        name: stay.name,
        address: stay.location?.address,
        traffic,
    };
  }));

  return statsByStaycation;
};


async function test() {

  const hostId = 1;

  try {
    const host = await prisma.user.findUnique({
      where: { id: hostId },
      select: { email: true },
    });

    if (!host) return console.log({ error: "Host not found" });

    const statsByStaycation = await getWeeklyTrafficStats(hostId);

    await sendPerformanceEmail(host, statsByStaycation);

    console.log({ success: true, stats: statsByStaycation });
  } catch (e) {
    console.error(e);
    console.log({ error: "Failed to send performance email" });
  }
}

test();


module.exports = { getWeeklyTrafficStats, sendPerformanceEmail };
