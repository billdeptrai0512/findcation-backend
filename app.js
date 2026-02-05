// app.js
require('dotenv').config();
require('./passport');
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require('cookie-parser');
const path = require('path');

// Import middleware
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// CORS Configuration - Use environment variable for allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173']; // Default for development

// Handle OPTIONS preflight requests FIRST - MUST be before any other middleware
// This ensures CORS headers are always set before Helmet or auth can interfere
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
            return res.sendStatus(204);
        }
        logger.warn(`CORS preflight blocked from origin: ${origin}`);
        return res.sendStatus(403);
    }
    next();
});

// CORS middleware for actual requests
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Trust proxy - required for express-rate-limit to work correctly behind Nginx
// Set to 1 to trust the first proxy (e.g. Nginx)
app.set('trust proxy', 1);
logger.info('🛡️ Trust proxy enabled (1 hop)');

// Security: Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable if serving static files
    crossOriginEmbedderPolicy: false,
}));

// Request logging
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Static assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/assets/avatar', express.static(path.join(__dirname, 'assets/avatar')));
app.use("/assets/staycations", express.static(path.join(__dirname, "assets/staycations")));
app.use("/assets/geo", express.static(path.join(__dirname, "assets/geo")));

// Apply rate limiting to all routes
app.use(apiLimiter);

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Serve logo as favicon to stop 404s in logs and show branding
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'logo.png'));
});

// Basic robots.txt for SEO
app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, 'assets', 'robots.txt'));
});

// Routers
const map = require("./routes/mapRouter");
const login = require("./routes/loginRouter");
const auth = require("./routes/authRouter");
const suggestion = require("./routes/suggestionRouter");
const listing = require("./routes/listingRouter");
const traffic = require("./routes/trafficRouter");
const geojson = require("./routes/geojsonRouter");

app.use("", map);
app.use("/auth", auth);
app.use("/login", login);
app.use("/suggestion", suggestion);
app.use("/listing", listing);
app.use("/traffic", traffic);
app.use("/geojson", geojson);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

const PORT = process.env.PORT || 3333;

// Validate critical environment variables on startup
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    logger.error('Please check your .env file. See .env.example for reference.');
    process.exit(1);
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET.length < 32) {
    logger.warn('⚠️  JWT_SECRET should be at least 32 characters for security!');
}

app.listen(PORT, () => {
    logger.info(`🚀 Express app listening on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);
});

