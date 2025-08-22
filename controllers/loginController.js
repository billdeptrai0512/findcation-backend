const jwt = require('jsonwebtoken');
const passport = require('passport');
const prisma = require('../prisma/client')

exports.userLogin = (req, res, next) => {
    console.log('Login attempt');
  
    passport.authenticate('local', { session: false }, (err, user, info) => {
      console.log("Inside passport.authenticate callback");
      if (err) {
        console.error('Passport error:', err);
        return res.status(500).json({ message: 'Internal error', error: err });
      }
  
      if (!user) {
        console.warn('Invalid credentials:', info);
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
  
      console.log("User found:", user);
  
      req.login(user, { session: false }, (loginErr) => {
        console.log("Inside req.login callback");
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.status(500).json({ message: 'Login failed', error: loginErr });
        }
  
        console.log("req.user after login:", req.user);
  
        // sign token & set cookie
        const payload = { id: user.id, name: user.name, isAdmin: user.isAdmin };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          maxAge: 24 * 60 * 60 * 1000,
        });
  
        console.log('Cookie set successfully');
        return res.json({ user: payload });
      });
    })(req, res, next);
  };
  

// --- VERIFY AUTH (for frontend to check login status) ---
exports.verifyAuth = (req, res) => {
    const token = req.cookies?.token;
    if (!token) return res.sendStatus(401);
  
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      res.json({ user });
    } catch {
      res.sendStatus(401);
    }
  };
  
  // --- LOGOUT ---
exports.userLogout = (req, res) => {
    res.clearCookie("token");
    res.sendStatus(200);
};

exports.checkEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Missing email' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return res.status(200).json({ hasRegister: false }); // Show register form
    }

    if (user && user.password === null) {
        return res.status(200).json({ user, googleLogin: true, hasRegister: true }) //Already login google once
    } 

    return res.status(200).json({ googleLogin: false, hasRegister: true }); // Show password field
};






