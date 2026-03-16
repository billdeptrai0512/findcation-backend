const prisma = require('../prisma/client')
const axios = require("axios");
const passport = require('passport');
const bcrypt = require('bcryptjs')
const fs = require("fs");
const path = require("path")
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);
const { setSessionCookie } = require('../utils/authHelper');


exports.userRefresh = (req, res) => {
  if (req.user) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ user: null });
}

exports.userLogin = (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Passport error:', err);
      return res.status(500).json({ message: 'Internal error' });
    }

    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    }

    req.login(user, { session: false }, (loginErr) => {
      if (loginErr) {
        console.error('Login error:', loginErr);
        return res.status(500).json({ message: 'Login failed' });
      }

      const payload = setSessionCookie(res, user);
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
        include: {
          staycations: true
        }
      });
    }

    const payloadUser = setSessionCookie(res, user);
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
  return res.status(200).json({ message: "Logged out successfully" });
};


exports.userRegister = async (req, res, next) => {
  const { password, email } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { staycations: true }
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    let user;

    if (existingUser) {
      if (existingUser.password) {
        return res.status(400).json({ message: "Email already registered. Please login." });
      } else {
        // Case: Google account, no password yet -> update with new password
        user = await prisma.user.update({
          where: { email },
          data: { password: hashedPassword },
          include: { staycations: true }
        });
      }
    } else {
      // Case: brand new user
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          isAdmin: false, // Security: Never allow client to set isAdmin
          contacts: { facebook: "", zalo: "", instagram: "" },
        },
        include: { staycations: true }
      });
    }

    const payload = setSessionCookie(res, user);
    return res.json({ user: payload });

  } catch (error) {
    console.error("Register error:", error);
    next(error);
  }
};


exports.userProfile = async (req, res, next) => {

  const { hostId } = req.params;

  if (!hostId) {
    return res.status(400).json({ message: "Host ID is required" });
  }

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

    // Detect whether the handle actually changed
    const existing = currentContacts[type];
    const existingUrl = typeof existing === 'string' ? existing : existing?.url;

    let updatedPlatform;
    if (url !== existingUrl) {
      // Handle changed → reset verification so admin must re-verify
      updatedPlatform = { url, verify: false, code: null, codeExpiresAt: null };
    } else {
      // Same handle → preserve existing verify/code state, just normalise to object shape
      updatedPlatform = typeof existing === 'object' && existing !== null
        ? { ...existing, url }
        : { url, verify: false, code: null, codeExpiresAt: null };
    }

    const updatedContacts = {
      ...currentContacts,
      [type]: updatedPlatform
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

exports.allHost = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
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
            rooms: true,
            verify: true,
            active: true,
          },
        },
      },
    });

    return res.json(users);
  } catch (error) {
    console.error(error);
    next(error);
  }
}

