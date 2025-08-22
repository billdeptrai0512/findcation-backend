const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs')
const prisma = require('../prisma/client')
const axios = require("axios");
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

const {   generateCodeVerifier,
  generateCodeChallenge,
  createZaloState,
  parseZaloState, } = require("../utils/pkce.js") ;

exports.userConnectZalo = async (req, res, next) => {

  const { redirect } = req.query;

  try {

    const userId = req.user.id; // hoặc lấy từ JWT/session
    console.log("userId:", userId);
    // Step 1: create verifier + challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const state = createZaloState(userId, codeVerifier);

    console.log(codeVerifier, codeChallenge)
    console.log(state)

    res.cookie("redirect_after_login", redirect, { httpOnly: true });

    console.log("redirect to " + process.env.ZALO_REDIRECT_URI)

    // Step 2: redirect tới Zalo login
    const authURL = `https://oauth.zaloapp.com/v4/permission?app_id=${process.env.ZALO_APP_ID}&redirect_uri=${encodeURIComponent(
      process.env.ZALO_REDIRECT_URI
    )}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log("authURL generated:", authURL);

    res.redirect(authURL);

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


