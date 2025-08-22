// middleware/jwtAuth.js
const jwt = require("jsonwebtoken");

function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1] || req.cookies.token; // ✅ check cookie too
  
  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // ✅ put user on request
    next();
  } catch {
    return res.sendStatus(401);
  }
}

module.exports = jwtAuth;
