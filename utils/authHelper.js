const jwt = require('jsonwebtoken');

/**
 * Signs a JWT token and sets it in an HttpOnly cookie
 * @param {Object} res - Express response object
 * @param {Object} user - User payload to include in the token
 */
const setSessionCookie = (res, user) => {
    // Standardize the payload to avoid leaking sensitive info and keep it consistent
    const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        // Include staycations if available (used in frontend for navigation)
        staycations: user.staycations || []
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1d'
    });

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        domain: process.env.NODE_ENV === "production" ? ".findcation.vn" : undefined,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return payload;
};

module.exports = {
    setSessionCookie
};
