// middleware/jwtAuth.js
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

// Helper to add CORS headers to error responses
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
};

function jwtAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    logger.info(`Unauthorized access attempt to ${req.originalUrl} from ${req.ip}`);
    setCorsHeaders(req, res);
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      errorCode: 'NO_TOKEN',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Log successful authentication in debug mode
    logger.debug(`User ${decoded.id} authenticated for ${req.method} ${req.originalUrl}`);

    next();
  } catch (error) {
    logger.warn(`Invalid token from ${req.ip}: ${error.message}`);
    setCorsHeaders(req, res);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        errorCode: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      errorCode: 'INVALID_TOKEN',
    });
  }
}

module.exports = jwtAuth;
