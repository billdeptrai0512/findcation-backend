// utils/sendEmail.js
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
    to,
    subject: "Xác minh thông tin liên lạc",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background:#fafafa;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px; text-align:center; border-bottom:1px solid #eee;">
              <h2 style="margin:0; font-size:22px; color:#2c3e50;">Xin chào, ${staycation.name}</h2>
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

          <!-- Facebook -->
          <tr>
            <td style="padding: 20px; border-top:1px solid #eee; border-bottom:1px solid #eee;">
              <table width="100%">
                <tr>
                  <td style="text-align:center;">
                    <h3 style="margin:0 0 10px; color:#3b5998;">
                      <a href="https://www.facebook.com/findcation" target="_blank" style="color:#3b5998; font-weight:bold;">
                        Facebook
                      </a>
                    </h3>
                    <div style="font-size:26px; font-weight:bold; letter-spacing:3px; background:#f2f2f2; padding:12px 24px; border-radius:6px; display:inline-block; margin-bottom:10px;">
                      ${staycation.contacts.facebook.code}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Instagram -->
          <tr>
            <td style="padding: 20px; border-bottom:1px solid #eee;">
              <table width="100%">
                <tr>
                  <td style="text-align:center;">
                    <h3 style="margin:0 0 10px; color:#d62976;">
                      <a href="https://www.instagram.com/findcationnn" target="_blank" style="color:#d62976; font-weight:bold;">
                        Instagram
                      </a>
                    </h3>
                    <div style="font-size:26px; font-weight:bold; letter-spacing:3px; background:#f2f2f2; padding:12px 24px; border-radius:6px; display:inline-block; margin-bottom:10px;">
                      ${staycation.contacts.instagram.code}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Zalo -->
          <tr>
            <td style="padding: 20px;">
              <table width="100%">
                <tr>
                  <td style="text-align:center;">
                    <h3 style="margin:0 0 10px; color:#0068ff;">
                      <a href="https://zalo.me/0902822192" target="_blank" style="color:#0068ff; font-weight:bold;">
                        Zalo
                      </a>
                    </h3>
                    <div style="font-size:26px; font-weight:bold; letter-spacing:3px; background:#f2f2f2; padding:12px 24px; border-radius:6px; display:inline-block; margin-bottom:10px;">
                      ${staycation.contacts.zalo.code}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

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

// async function test() {
//   const staycation = {
//     name : "billdeptrai",
//     contacts : {
//       facebook: { code : "123456" },
//       zalo: { code : "123456" },
//       instagram: { code : "123456" }
//     }
//   };

//   await sendVerifyEmail("billnguyen05121998@gmail.com", staycation);
// }

// test();


module.exports = { sendResetEmail , sendVerifyEmail };
