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

const sendPerformanceEmail = async (host, stats) => {
  // Check if any of the host's staycations are verified
  const isVerified = host.staycations.some(s => s.verify);
  const hasTraffic = stats && (stats.views >= 1 || stats.cancel >= 1);

  // Skip only if NOT verified AND has NO traffic
  if (!isVerified && !hasTraffic) {
    console.log(`⏭️ Skipping email for ${host.email} (not verified and no traffic)`);
    return;
  }

  console.log(stats)

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Get date range for last week
  const { lastMonday, lastSunday } = getLastWeekRange();
  const dateRange = `${formatDate(lastMonday)} - ${formatDate(lastSunday)}`;
  const staycation_name = host.staycations[0].name

  const html = `
    <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #333; background:#fafafa;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="20" style="background:#ffffff; max-width:600px; border-radius:8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin: 0 auto;">
              <tr>
                <td>
                  <div style="text-align:center; margin-bottom:20px;">
                    <img src="https://api.findcation.vn/assets/logo.png" alt="Findcation" style="height:60px; max-width: 100%; object-fit: contain;">
                  </div>
                  <div style=" font-size:16px; color:#222; margin-bottom:12px; font-weight: 600;">
                    Hello, anh/chị ${staycation_name}
                  </div>
                  <div style=" font-size:14px; color:#444; margin-bottom:20px; line-height: 1.5;">
                    Dưới đây là báo cáo traffic trong tuần vừa qua.
                  </div>

                  <div style="background:#f8f9fa; border-radius:12px; padding:24px; margin-bottom:24px; text-align: center;">
                    <div style="display: inline-block; margin: 0 20px;">
                      <div style="font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 4px;">Tổng lượt xem</div>
                      <div style="font-size: 28px; font-weight: 700; color: #2c3e50;">${stats.views}</div>
                    </div>
                  </div>

                  <div style="border-top: 1px solid #eee; padding-top: 20px;">
                    <div style="font-size: 14px; font-weight: 600; color: #222; margin-bottom: 14px;">Trong đó:</div>
                    <table width="100%" style="font-size: 14px; color: #444;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">Lượt click liên hệ</td>
                        <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600;">${stats.clicks}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">Lượt nhìn thấy cảnh báo</td>
                        <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600;">${stats.warnings}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600; padding: 8px 0; border-bottom: 1px solid #f0f0f0; color: #ec2424ff;">Lượt rời đi khi thấy cảnh báo</td>
                        <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; color: #ec2424ff; font-weight: 600;">${stats.cancel}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">Lượt tiếp tục (vượt qua cảnh báo)</td>
                        <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-weight: 600;">${stats.continues}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600;padding: 8px 0; color: #28a745;">Lượt liên lạc thành công</td>
                        <td align="right" style="padding: 8px 0; font-weight: 600; color: #28a745;">${stats.successes}</td>
                      </tr>
                    </table>
                  </div>

                  <div style="border-top: 1px solid #eee; padding-top: 24px;">
                    <div style="font-size: 16px; font-weight: 600; color: #222; margin-bottom:4px; line-height: 1.5;">
                      Findcation là bản đồ kết nối dành riêng cho các staycation self-checkin.
                    </div>
                    <div style="text-align:center; margin-bottom:20px;">
                      <img src="https://api.findcation.vn/assets/warning.png" alt="Findcation's Staycation Warning" style="max-width: 100%; height: auto;">
                    </div>
                    <div style="font-size:14px; font-weight: 600; color: #222; margin-bottom:20px; line-height: 1.5;">
                      Vì vậy Findcation hiển thị cảnh báo đối với các staycation:
                    </div>
                    <ul style="font-size: 14px; color: #444; margin-bottom: 20px; line-height: 1.5;">
                      <li>Chưa xác minh thông tin liên lạc</li>
                      <li>Chưa xác minh địa chỉ</li>
                      <li>Chưa xác nhận vẫn đang hoạt động kinh doanh</li>
                    </ul>
                    
                    <div style=" font-size:14px; font-weight: 600; color: #222; margin-bottom:20px; line-height: 1.5;">
                      Điều này giúp:
                    </div>
                    <ul style="font-size: 14px; color: #444; margin-bottom: 20px; line-height: 1.5;">
                      <li>Khách chủ động cân nhắc trước khi nhắn tin</li>
                      <li>Giữ trải nghiệm minh bạch cho người dùng</li>
                      <li>Giải quyết tình trạng giả mạo trên không gian mạng</li>
                    </ul>

                    <a href="https://www.facebook.com/findcation" style="margin-bottom: 16px; color: linear-gradient(135deg, #ec2424, #ff5f6d); text-decoration: none; font-weight: 600; font-size: 14px;">
                      ${stats.cancel > 0 ? `Giữ lại ${stats.cancel} lượt khách đã rời đi` : 'Trở thành đối tác của Findcation'}
                    </a>

                    <ul style="font-size: 14px; color: #444; margin-bottom: 20px; line-height: 1.5;">
                      <li><strong>51.200đ / tháng</strong> · Có thể dừng bất kỳ lúc nào</li>
                      <li>Findcation sẽ đến địa chỉ đăng ký để xác minh.</li>
                      <li>Findcation sẽ gửi mã để xác minh thông tin liên lạc.</li>
                    </ul> 
                  </div>
                  <div style="text-align:center; margin-bottom:8px;">
                    <img src="https://api.findcation.vn/assets/verified.png" alt="Findcation's Staycation Warning" style="max-width: 100%; height: auto;">
                  </div>
                  <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;"> © 2026 Findcation Team. All rights reserved. </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div >
  `;

  await transporter.sendMail({
    from: '"Findcation" <no-reply@findcation.vn>',
    to: 'findcationn@gmail.com',
    // to: host.email, 
    subject: `Báo cáo traffic từ ngày ${dateRange} `,
    html,
  });
};


const getWeeklyTrafficStats = async (hostId) => {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  // 1. Get all staycation IDs for this host
  const staycations = await prisma.staycation.findMany({
    where: { hostId },
    select: { id: true },
  });

  const staycationIds = staycations.map((s) => s.id);

  if (staycationIds.length === 0) {
    return {
      views: 0,
      clicks: 0,
      warnings: 0,
      cancel: 0,
      continues: 0,
      successes: 0,
    };
  }

  // 2. Aggregate all daily traffic records for these staycations in the last 7 days
  const dailyRecords = await prisma.dailyTraffic.findMany({
    where: {
      staycationId: { in: staycationIds },
      date: { gte: weekAgo, lte: today },
    },
  });

  const aggregateTraffic = {
    views: 0,
    clicks: 0,
    warnings: 0,
    cancel: 0,
    continues: 0,
    successes: 0,
  };

  dailyRecords.forEach((record) => {
    aggregateTraffic.views += record.views;
    aggregateTraffic.clicks += record.clicks;
    aggregateTraffic.warnings += record.warnings;
    aggregateTraffic.cancel += record.cancel;
    aggregateTraffic.continues += record.continues;
    aggregateTraffic.successes += record.successes;
  });

  return aggregateTraffic;
};




module.exports = { getWeeklyTrafficStats, sendPerformanceEmail };
