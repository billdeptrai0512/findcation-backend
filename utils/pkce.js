const jwt = require("jsonwebtoken");
const crypto = require("crypto") 

function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("hex"); // ~128 chars
}

function generateCodeChallenge(verifier) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createZaloState(userId, codeVerifier) {
    return jwt.sign(
      { userId, codeVerifier },
      process.env.ZALO_APP_SECRET,
      { expiresIn: "5m" }
    );
};

function parseZaloState(token) {
    return jwt.verify(token, process.env.ZALO_APP_SECRET);
};
  

module.exports = { generateCodeVerifier, generateCodeChallenge, createZaloState, parseZaloState };
