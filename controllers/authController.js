const jwt = require("jsonwebtoken");
const prisma = require('../prisma/client')
const axios = require("axios");
const passport = require('passport');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);
const { generateCodeVerifier, generateCodeChallenge, createZaloState, parseZaloState} = require("../utils/pkce.js") ;


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


exports.userConnectZalo = async (req, res, next) => {

  const { redirect } = req.query;

  try {

    const userId = req.user.id; // hoặc lấy từ JWT/session
    console.log("userId:", userId);
    // Step 1: create verifier + challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const state = createZaloState(userId, codeVerifier)

    res.cookie("redirect_after_login", redirect, { httpOnly: true });

    console.log("redirect to " + process.env.ZALO_REDIRECT_URI)

    // Step 2: redirect tới Zalo login
    const authURL = `https://oauth.zaloapp.com/v4/permission?app_id=${process.env.ZALO_APP_ID}&redirect_uri=${encodeURIComponent(
      process.env.ZALO_REDIRECT_URI
    )}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log("authURL generated:", authURL);

    return res.redirect(authURL);

  } catch (err) {
    next(err);
  }
}

exports.zaloCallback = async (req, res, next) => {

  const { code, state } = req.query; // state = userId
  const redirectAfter = req.cookies.redirect_after_login || "http://localhost:3000";
  console.log("code" + code)
  console.log("state" + state)

  try {
    // Step 3: exchange code + code_verifier for access_token
    const { userId, codeVerifier } = parseZaloState(state);

    const qs = new URLSearchParams({
      app_id: process.env.ZALO_APP_ID,
      app_secret: process.env.ZALO_APP_SECRET,
      code,
      redirect_uri: process.env.ZALO_REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const tokenRes = await axios.post(
      "https://oauth.zaloapp.com/v4/access_token",
      qs.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;

    // Step 4: get Zalo profile
    const profileRes = await axios.get("https://graph.zalo.me/v2.0/me", {
      params: { access_token: accessToken, fields: "id,name,picture" },
    });

    console.log("profileRes.data:", profileRes.data);

    const zaloUser = profileRes.data;

    // Step 5: link with your app’s user
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { zaloUid: zaloUser.id, zaloName: zaloUser.name },
    });

    //update status on front page
        res.redirect(
      `${redirectAfter}?zalo_id=${zaloUser.id}&name=${encodeURIComponent(zaloUser.name)}`
    );
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(400).json({ error: "Failed to link Zalo" });
  }
}

exports.userConnectFacebook = async (req, res, next) => {
  const { redirect } = req.query;
  const redirectUri = process.env.FB_REDIRECT_URI; // backend callback

  // Save where to return after login
  res.cookie("redirect_after_login", redirect, { httpOnly: true });

  // Redirect user to Facebook OAuth dialog
  const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${process.env.FB_APP_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=public_profile`;

  return res.redirect(authUrl); // only once
};

exports.facebookCallback = async (req, res, next) => {

  const code = req.query.code;
  const redirectAfter = req.cookies.redirect_after_login || "http://localhost:3000";
  const userId = req.user.id;

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await axios.get(
      `https://graph.facebook.com/v23.0/oauth/access_token`,
      {
        params: {
          client_id: process.env.FB_APP_ID,
          client_secret: process.env.FB_APP_SECRET,
          redirect_uri: process.env.FB_REDIRECT_URI,
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Step 2: Get user profile
    const userRes = await axios.get(
      `https://graph.facebook.com/me?fields=id,name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const fbUser = userRes.data;

    // Step 3: Save Facebook info into your DB
    // Example with Prisma:
    await prisma.user.update({
      where: { id: userId },
      data: {
        facebookId: fbUser.id,
        facebookName: fbUser.name,
        facebookAccessToken: accessToken, // optional if you need future API calls
      },
    });

    console.log(fbUser)

    // Step 4: Redirect back to frontend success page
    res.redirect(
      `${redirectAfter}?fb_id=${fbUser.id}&name=${encodeURIComponent(fbUser.name)}`
    );

  } catch (err) {
    console.error("failed" + err.message);
    res.status(500).send("Failed to link Facebook");
  }
}

exports.userConnectInstagram = async (req, res, next) => {
  const { redirect } = req.query;
  const redirectUri = process.env.FB_REDIRECT_URI; // backend callback

  // Save where to return after login
  res.cookie("redirect_after_login", redirect, { httpOnly: true });

  // Redirect user to Facebook OAuth dialog
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.FB_APP_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=user_profile&response_type=code`;

  console.log(authUrl)

  return res.redirect(authUrl); // only once
};

exports.instagramCallback = async (req, res, next) => {

  const code = req.query.code;
  const redirectAfter = req.cookies.redirect_after_login || "http://localhost:3000";
  const userId = req.user.id;

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await axios.get(
      `https://graph.facebook.com/v23.0/oauth/access_token`,
      {
        params: {
          client_id: process.env.FB_APP_ID,
          client_secret: process.env.FB_APP_SECRET,
          redirect_uri: 'http://localhost:3000/auth/instagram/callback',
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Step 2: Get user profile
    const userRes = await axios.get(
      `https://graph.instagram.com/me?fields=id,name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const fbUser = userRes.data;

    // Step 3: Save Facebook info into your DB
    // Example with Prisma:
    await prisma.user.update({
      where: { id: userId },
      data: {
        instagramId: fbUser.id,
        instagramName: fbUser.name,
        instagramAccessToken: accessToken, // optional if you need future API calls
      },
    });

    console.log(fbUser)

    // Step 4: Redirect back to frontend success page
    res.redirect(
      `${redirectAfter}?fb_id=${fbUser.id}&name=${encodeURIComponent(fbUser.name)}`
    );

  } catch (err) {
    console.error("failed");
    res.status(500).send("Failed to link Facebook");
  }
}


