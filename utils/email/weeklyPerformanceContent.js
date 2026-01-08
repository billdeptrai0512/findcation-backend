// utils/sendEmail.js
const prisma = require('../../prisma/client');
const dotenv = require("dotenv");
dotenv.config();
const nodemailer = require("nodemailer");

// Get last week's Monday and Sunday dates
const getLastWeekRange = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Calculate last Sunday (end of last week)
  const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysToLastSunday);

  // Calculate last Monday (start of last week) = last Sunday - 6 days
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  return { lastMonday, lastSunday };
};

// Format date as "dd/MM"
const formatDate = (date) => {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

const sendPerformanceEmail = async (host, statsByStaycation) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Build HTML blocks per staycation
  const staycationStatsBlocks = () => statsByStaycation.map((stay) => {
    const { address, traffic } = stay;

    return `
        <div style="border:1px solid #eee; border-radius:10px; padding:14px 18px; margin-bottom:12px; background:#fafafa;">
            <div style="font-weight:600; font-size:14px; color:#222;">Địa chỉ: ${address.details.street} - ${address.details.ward} - ${address.details.city}</div>
            <ul style="list-style-type: disc; padding-left: 20px; padding-top: 8px; margin:0; font-size:13px; color:#444;">
                <li><strong>Lượt xem:</strong> ${traffic.views}</li>
                <li><strong>Lượt click liên hệ:</strong> ${traffic.clicks}</li>
                <li><strong>Lượt xem cảnh báo:</strong> ${traffic.warnings}</li>
                <li><strong>Lượt tiếp tục:</strong> ${traffic.continues}</li>
                <li><strong>Lượt thành công:</strong> ${traffic.successes}</li>
            </ul>
        </div>
        `;
  }).join("");

  const totalViews = statsByStaycation.reduce((sum, stay) => sum + stay.traffic.views, 0);
  const totalClicks = statsByStaycation.reduce((sum, stay) => sum + stay.traffic.clicks, 0);
  // Get date range for last week
  const { lastMonday, lastSunday } = getLastWeekRange();
  const dateRange = `${formatDate(lastMonday)} - ${formatDate(lastSunday)}`;
  const name = statsByStaycation[0]?.name || "";

  const html = `
    <div style="font-family: Inter, sans-serif; padding: 20px; color: #333; background:#fafafa;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="20" style="background:#ffffff; max-width:600px; border-radius:8px;">
                        <tr>
                            <td>
                                <div style="text-align:center; margin-bottom:8px;">
                                    <img src="https://api.findcation.vn/assets/logo.png" alt="Findcation" style="height:60px;">
                                </div>
                                <div style=" font-size:14px; color:#222; margin-bottom:8px;">
                                    Xin chào, ${name}
                                </div>
                                <div style=" font-size:14px; color:#222; margin-bottom:8px;">
                                    Findcation gửi bạn báo cáo traffic từ ${dateRange}
                                </div>
                                <div style=" font-size:14px; color:#222; margin-bottom:16px;">
                                    Tổng cộng tuần qua: <strong>${totalViews}</strong> lượt xem và <strong>${totalClicks}</strong> lượt click liên hệ.
                                </div>
                                ${staycationStatsBlocks()}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `;

  await transporter.sendMail({
    from: 'Findcation',
    to: 'findcationn@gmail.com', // host.email when in production
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

  // Get traffic stats for each staycation
  const statsByStaycation = await Promise.all(staycations.map(async (stay) => {
    const dailyRecords = await prisma.dailyTraffic.findMany({
      where: {
        staycationId: stay.id,
        date: { gte: weekAgo, lte: today },
      },
    });

    const traffic = {
      views: 0,
      clicks: 0,
      warnings: 0,
      continues: 0,
      successes: 0,
    };

    dailyRecords.forEach((record) => {
      traffic.views += record.views;
      traffic.clicks += record.clicks;
      traffic.warnings += record.warnings;
      traffic.continues += record.continues;
      traffic.successes += record.successes;
    });

    return {
      name: stay.name,
      address: stay.location,
      traffic,
    };
  }));

  return statsByStaycation;
};




module.exports = { getWeeklyTrafficStats, sendPerformanceEmail };
