// middleware/isAdmin.js
// Must run after jwtAuth (which populates req.user from the JWT token)
function isAdmin(req, res, next) {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

module.exports = isAdmin;
