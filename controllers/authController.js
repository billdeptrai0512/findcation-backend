const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs')
const prisma = require('../prisma/client')
const sendResetEmail = require("../utils/sendEmail");

const otpStore = new Map(); // key: email, value: { code, token, expiresAt }

function generate6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // e.g., 123456
}

exports.verifyAuth = async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.sendStatus(401);

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user });
  } catch {
    res.sendStatus(401);
  }
};

exports.verifyEmail = async (req, res) => {
  const { email } = req.body;
  
  console.log(email)
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ message: "Email not found" });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const code = generate6DigitCode();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  otpStore.set(email, { code, token, expiresAt });

  await sendResetEmail(email, code); // only send the 6-digit code
  console.log(code)
  res.json({ message: "Reset code sent to email"});
};

exports.verifyPinCode = async (req, res) => {
  const { email, code } = req.body;

  const entry = otpStore.get(email);
  if (!entry) return res.status(400).json({ message: "No reset requested" });

  if (entry.expiresAt < Date.now()) {
    otpStore.delete(email);
    return res.status(400).json({ message: "Code expired" });
  }

  if (entry.code !== code) {
    return res.status(400).json({ message: "Incorrect code" });
  }

  // success: send token so frontend can redirect
  const token = entry.token;
  otpStore.delete(email);
  res.json({ token });
};

exports.updatePassword = async (req, res) => {
  const { token, password } = req.body;

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      console.log("User not found in DB");
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    return res.json({ user: { id: user.id }, token: jwtToken });

  } catch (err) {
    console.error("Error during password reset:", err.name, err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

exports.userLogout = (req, res, next) => {
  res.clearCookie('token');
  res.sendStatus(200);;
};
