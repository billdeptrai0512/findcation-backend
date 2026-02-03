const logger = require('../utils/logger');

// Custom error class for application errors
class AppError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    if (process.env.NODE_ENV === 'development') {
        logger.error(err.stack);
    }

    // Prisma errors
    if (err.code === 'P2002') {
        return res.status(409).json({
            status: 'error',
            message: 'A record with this value already exists',
            errorCode: 'DUPLICATE_ENTRY',
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({
            status: 'error',
            message: 'Record not found',
            errorCode: 'NOT_FOUND',
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: err.message,
            errorCode: 'VALIDATION_ERROR',
            errors: err.errors,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid token',
            errorCode: 'INVALID_TOKEN',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Token expired',
            errorCode: 'TOKEN_EXPIRED',
        });
    }

    // Multer errors
    if (err.name === 'MulterError') {
        return res.status(400).json({
            status: 'error',
            message: err.message,
            errorCode: 'FILE_UPLOAD_ERROR',
        });
    }

    // Default error response
    const response = {
        status: err.status || 'error',
        message: err.message || 'Internal server error',
    };

    if (err.errorCode) {
        response.errorCode = err.errorCode;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
};

// 404 handler
const notFoundHandler = (req, res, next) => {
    const noisyRoutes = ['/sitemap.xml', '/.env', '/enhancecp'];
    const isNoisy = noisyRoutes.some(route => req.originalUrl.includes(route));

    if (isNoisy) {
        // Return 404 but don't log as error to keep PM2 logs clean
        return res.status(404).json({
            status: 'error',
            message: `Route ${req.originalUrl} not found`,
            errorCode: 'NOT_FOUND',
        });
    }

    const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
    next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    asyncHandler,
};
