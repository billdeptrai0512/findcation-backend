// utils/sendEmail.js
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
    subject: "Findcation - Reset Password",
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

module.exports = sendResetEmail;
