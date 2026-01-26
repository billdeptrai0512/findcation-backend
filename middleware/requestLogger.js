const morgan = require('morgan');
const logger = require('../utils/logger');

// Create a stream object for Morgan to use with Winston
const stream = {
    write: (message) => logger.http(message.trim()),
};

// Skip logging for health check endpoints
const skip = (req) => {
    return req.url === '/health' || req.url === '/';
};

// Custom Morgan token for response time in ms
const developmentFormat =
    ':method :url :status :response-time ms - :res[content-length]';

const productionFormat =
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" ' +
    ':status :res[content-length] ":referrer" ":user-agent" :response-time ms';


// Create middleware based on environment
const requestLogger = morgan(
    process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    { stream, skip }
);

module.exports = requestLogger;
