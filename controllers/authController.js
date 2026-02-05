const jwt = require("jsonwebtoken");
const prisma = require('../prisma/client')
const axios = require("axios");
const passport = require('passport');
const bcrypt = require('bcryptjs')
const fs = require("fs");
const path = require("path")
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);

exports.userRefresh = (req, res) => {
  if (req.user) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ user: null });
}

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
      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        staycations: user.staycations
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        domain: process.env.NODE_ENV === "production" ? ".findcation.vn" : undefined,
        maxAge: 24 * 60 * 60 * 1000,
      });

      console.log('Cookie set successfully');

      return res.json({ user: payload });
    });
  })(req, res, next);
};

exports.userLoginGoogle = async (req, res, next) => {
  const { credential } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        staycations: true
      }
    });

    // If not, create new user
    if (!user) {
      // Define local avatar path
      const avatarFileName = `${sub}.jpg`;
      const avatarRelativePath = `/avatar/${avatarFileName}`;
      const avatarFullPath = path.join(__dirname, '..', 'assets', 'avatar', avatarFileName);

      // Download and save avatar
      try {
        const response = await axios.get(picture, { responseType: 'arraybuffer' });
        fs.writeFileSync(avatarFullPath, response.data);
      } catch (e) {
        console.error('❌ Failed to download Google avatar:', e.message);
      }

      // Create user with local avatar path
      user = await prisma.user.create({
        data: {
          name,
          email,
          isAdmin: false,
          avatar: avatarRelativePath,
          contacts: { facebook: "", zalo: "", instagram: "" }
        },
      });
    }

    const payloadUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      staycations: user.staycations ? user.staycations : []
    };

    console.log(payloadUser)

    const token = jwt.sign(payloadUser, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain: process.env.NODE_ENV === "production" ? ".findcation.vn" : undefined,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: payloadUser });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Invalid Google token' });
  }
};

exports.userLogout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    domain: process.env.NODE_ENV === "production" ? ".findcation.vn" : undefined,
  });
  res.sendStatus(200);
};

exports.userRegister = async (req, res, next) => {
  const { password, email, isAdmin } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;

    if (existingUser) {
      if (existingUser.password) {
        // Case: User already has password -> prevent duplicate register
        return res.status(400).json({ message: "Email already registered. Please login." });
      } else {
        // Case: Google account, no password yet -> update with new password
        user = await prisma.user.update({
          where: { email },
          data: { password: hashedPassword },
        });
      }
    } else {

      // Case: brand new user
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          isAdmin: isAdmin || false,
          contacts: { facebook: "", zalo: "", instagram: "" },
        },
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      staycations: user.staycations ? user.staycations : []
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain: process.env.NODE_ENV === "production" ? ".findcation.vn" : undefined,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: payload });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.userProfile = async (req, res, next) => {

  const { hostId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(hostId, 10) },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isAdmin: true,
        contacts: true,
        staycations: {
          select: {
            id: true,
            name: true,
            numberOfRoom: true,
            type: true,
            images: true,
            location: true,
            prices: true,
            features: true,
            rooms: true
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);

  } catch (error) {
    console.error(error);
    next(error);
  }
}

exports.userContact = async (req, res, next) => {
  const { hostId } = req.params;
  const { type, url } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(hostId, 10) },
      select: { contacts: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Parse existing contacts (could be null on first time)
    const currentContacts = user.contacts || {};

    // Update only the selected type (e.g. facebook, zalo, etc.)
    const updatedContacts = {
      ...currentContacts,
      [type]: url
    };

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(hostId, 10) },
      data: {
        contacts: updatedContacts
      },
      select: {
        id: true,
        contacts: true
      }
    });

    return res.json({
      message: `Updated ${type} contact successfully`,
      contacts: updatedUser.contacts
    });

  } catch (error) {
    console.error("Update user contact failed", error);
    next(error);
  }
};

