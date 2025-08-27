const jwt = require("jsonwebtoken");
const prisma = require('../prisma/client')
const axios = require("axios");
const passport = require('passport');
const bcrypt = require('bcryptjs')
const fs = require("fs");
const path = require("path")
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);

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
    };

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
                    avatar: avatarRelativePath, // You can prefix this on frontend with your Imgix URL
                },
            });
        }

        const payloadUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
        };

        const token = jwt.sign(payloadUser, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.json({ user: payloadUser });

    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
};

exports.userLogout = (req, res) => {
  res.clearCookie("token");
  res.sendStatus(200);
};

exports.userRegister = async (req, res, next) => {
    
  const {firstName, lastName , password, email, isAdmin} = req.body

  try {

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
          data: {
              name: firstName + " " + lastName,
              password: hashedPassword,
              email: email,
              isAdmin: isAdmin
          }
      })

      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      };


      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      
      res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          maxAge: 24 * 60 * 60 * 1000,
      });


      return res.json({ user: payload });

  } catch (error) {
      console.error(error);
      next(error);
    }
};

