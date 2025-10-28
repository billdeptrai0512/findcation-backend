const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client')
const bcrypt = require('bcryptjs')
const { sendResetEmail } = require('../utils/sendEmail');
const otpStore = new Map(); 


exports.checkEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Missing email' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return res.status(200).json({ hasPassword: false, hasRegister: false }); // Show register form
    }

    if (user && user.password === null) {
        return res.status(200).json({ hasPassword: false, hasRegister: true }) //Use google to login once - show register form + google login
    } 

    return res.status(200).json({ hasPassword: true, hasRegister: true }); // Show password field
};

exports.verifyEmail = async (req, res) => {

    const { email } = req.body;
  
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

exports.newEmail = async (req, res) => {
    const { newEmail } = req.body;

    const code = generate6DigitCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(newEmail, { code, expiresAt });

    await sendResetEmail(newEmail, code); // only send the 6-digit code
    console.log("OTP for new email:", newEmail, code);

    res.json({ message: "Reset code sent to email" });
};

exports.changeEmail = async (req, res) => {
    const { newEmail, code } = req.body;

    try {

        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "No token provided" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const entry = otpStore.get(newEmail);
        if (!entry) return res.status(400).json({ message: "No verification code requested" });

        if (entry.expiresAt < Date.now()) {
            otpStore.delete(newEmail);
            return res.status(400).json({ message: "Code expired" });
        }

        if (entry.code !== code) {
            return res.status(400).json({ message: "Incorrect code" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: newEmail },
        });

        if (existingUser) {
            return res.status(400).json({ message: "Email đã được đăng ký" });
        }

        // 3️⃣ Update user email
        await prisma.user.update({
            where: { id: user.id },
            data: { email: newEmail },
        });

        otpStore.delete(newEmail);

        // 4️⃣ Issue new JWT (since email changed)
        const payload = {
            id: user.id,
            name: user.name,
            email: newEmail,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
        };

        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie("token", jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.json({ message: "Đổi email thành công", user: payload, token: jwtToken });

    } catch (err) {
        console.error("Error during email change:", err.name, err.message);
    }
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
        console.log(token)
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

        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
        };

        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.json({ user: payload, token: jwtToken });

    } catch (err) {
        console.error("Error during password reset:", err.name, err.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

exports.changePassword = async (req, res) => {
    const { password, newPassword } = req.body;

    try {
        // 1. Verify token
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // 2. Find user
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3. Compare old password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
        }

        // 4. Hash and save new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });

        // 5. (Optional) Reissue token
        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
        };

        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie("token", jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.json({ message: "Đổi mật khẩu thành công", user: payload, token: jwtToken });

    } catch (err) {
        console.error("Error during password change:", err.name, err.message);
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
};



function generate6DigitCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // e.g., 123456
}
  

  







