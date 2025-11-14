// utils/sendEmail.js
const prisma = require('../prisma/client');
const dotenv = require("dotenv");
dotenv.config();
const nodemailer = require("nodemailer");

const sendResetEmail = async (to, code) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // your Gmail address
      pass: process.env.EMAIL_PASS, // Gmail App Password (not your Gmail login)
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Quên mật khẩu",
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #333;">🔐 Password Reset Request</h2>
        <p>Hi there,</p>
        <p>Use the 6-digit code below to reset your password:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 20px auto; padding: 10px 20px; background-color: #f2f2f2; display: inline-block; border-radius: 6px;">
          ${code}
        </div>
        <p style="margin-top: 30px;">This code will expire in 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">Findcation Team</p>
      </div>
    `,
  });
};

const sendVerifyEmail = async (to, staycation) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // your Gmail address
      pass: process.env.EMAIL_PASS, // Gmail App Password
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: "billnguyen05121998@gmail.com", // for early listing
    subject: "Xác minh thông tin liên lạc",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background:#fafafa;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px; text-align:center; border-bottom:1px solid #eee;">
              <h2 style="margin:0; font-size:22px; color:#2c3e50;">Xin chào, ${staycation.name} - ${staycation.id}</h2>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; font-size:15px; line-height:1.6; color:#444;">
              <p>Để xác minh thông tin liên lạc của bạn, vui lòng làm theo hướng dẫn bên dưới:</p>
              <ul style="margin: 10px 0 20px 20px;">
                <li>Sao chép mã xác minh của từng nền tảng bên dưới.</li>
                <li>Sử dụng tài khoản mạng xã hội mà <b>bạn đã đăng ký</b>.</li>
                <li>Gửi mã đến <b>Findcation</b> trên <b>nền tảng tương ứng</b>.</li>
              </ul>
            </td>
          </tr>

          ${contactSection("Facebook", staycation.contacts.facebook?.url, "#3b5998", staycation.contacts.facebook?.code)}
          ${contactSection("Instagram", staycation.contacts.instagram?.url, "#d62976", staycation.contacts.instagram?.code)}
          ${contactSection("Zalo", staycation.contacts.zalo?.url, "#0068ff", staycation.contacts.zalo?.code)}

          <tr>
            <td style="padding:20px; text-align:center; color:#999; font-size:12px; border-top:1px solid #eee;">
              Findcation Team
            </td>
          </tr>
        </table>
      </div>
    `,
  });
};

const contactSection = (platform, url, color, code) => {
  if (!url || !code) return ""; // không render nếu url hoặc code trống

  return `
    <tr>
      <td style="padding: 20px; border-top:1px solid #eee; border-bottom:1px solid #eee;">
        <table width="100%">
          <tr>
            <td style="text-align:center;">
              <h3 style="margin:0 0 10px; color:${color};">
                <a href="${url}" target="_blank" style="color:${color}; font-weight:bold;">
                  ${platform}
                </a>
              </h3>
              <div style="font-size:26px; font-weight:bold; letter-spacing:3px; background:#f2f2f2; padding:12px 24px; border-radius:6px; display:inline-block; margin-bottom:10px;">
                ${code}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
};

const sendPerformaceEmail = async (host) => {
  console.log(JSON.stringify(host, null, 2))

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const staycationTraffic = host.staycations.map((stay) => {
    const traffic = { FACEBOOK: 0, INSTAGRAM: 0, ZALO: 0 };

    stay.clicks.forEach((clickRecord) => {
      clickRecord.contactClicks.forEach((contactClick) => {
        const type = contactClick.contactType;
        traffic[type] += contactClick.clicks;
      });
    });

    const totalClicks = traffic.FACEBOOK + traffic.INSTAGRAM + traffic.ZALO;

    return {
        name: stay.location.address,
        traffic,
        totalClicks
      };
  });

  // 🔹 Create dynamic HTML for each staycation
  const staycationBlocks = host.staycations.map((stay) => {
  
    const totalClicks = stay.clicks.reduce((sum, day) => sum + day.totalClicks, 0);
    console.log(totalClicks)
    const facebookClicks = stay.clicks.filter(c => c.platform === "facebook").length;
    const zaloClicks = stay.clicks.filter(c => c.platform === "zalo").length;
    const instagramClicks = stay.clicks.filter(c => c.platform === "instagram").length;

    // Example % change if you want (here just mock value)
    const trend = totalClicks > 100 ? "▲ +12%" : "▼ -5%";
    const trendColor = totalClicks > 100 ? "#16a34a" : "#dc2626";

    return `
      <div style="border:1px solid #eee; border-radius:10px; padding:14px 18px; margin-bottom:12px; background:#fafafa;">
        <div style="font-weight:600; font-size:16px; color:#222;">${stay.location?.address || "Địa điểm chưa có tên"}</div>
        <ul style="list-style:none; padding:8px 0 0; margin:0; font-size:14px; color:#444;">
          <li>Tổng cộng: <strong>${staycationTraffic}</strong> <span style="color:${trendColor};">${trend}</span></li>
        </ul>
      </div>
    `;
  }).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background:#fafafa;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FAFBF8; text-align:center;">
        <tr>
          <td align="center">
            <img src="cid:logo" alt="Logo" width="86" height="86" style="display:block;" />
          </td>
        </tr>
      </table>

      <!-- Summary Section -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:10px; margin-bottom:20px;">
        <div style="margin-top:20px; background:#fff; border-radius:8px; padding:20px;">
          <h3 style="font-size:18px; margin:0 0 10px; color:#333;">Dưới đây là số lần các địa điểm của bạn được liên lạc trong tuần vừa qua</h3>

          ${staycationBlocks}

        </div>
      </table>

      <!-- Footer -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="text-align:center; color:#999;">
        <tr>
          <td style="font-size:12px; padding-top:10px;">
            © 2025 Findcation. All rights reserved.<br/>
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: "Findcation",
    to: "billnguyen05121998@gmail.com",
    subject: "[Findcation] Báo cáo hiệu suất hàng tuần",
    html,
    attachments: [
      {
        filename: "logo.png",
        path: __dirname + "/../assets/logo.png",
        cid: "logo",
      },
    ],
  });
};


async function test() {
  const staycation = {
    name : "billdeptrai",
    contacts : {
      facebook: { code : "123456" },
      zalo: { code : "123456" },
      instagram: { code : "123456" }
    }
  };

  const host = await prisma.user.findUnique({
    where: { id: 1 },
    select: {
      staycations: {
        select: {
          location: true,
          clicks: {
            select: {
              contactClicks: {
                select: {
                  contactType: true,
                  clicks: true
                }
              }
            }
          }
        }
      }
    }
  });

  console.log(host)

  // await sendVerifyEmail("billnguyen05121998@gmail.com", staycation);
  await sendPerformaceEmail(host)
}

// test();


module.exports = { sendResetEmail , sendVerifyEmail };
