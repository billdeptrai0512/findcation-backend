// middleware/jwtAuth.js
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

function jwtAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    logger.warn(`Unauthorized access attempt to ${req.originalUrl} from ${req.ip}`);
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
