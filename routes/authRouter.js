const express = require('express');
const authRouter = express.Router();
const authController = require("../controllers/authController");
const jwtAuth = require("../middleware/jwtAuth");
const { authLimiter } = require("../middleware/rateLimiter");

// Public routes with rate limiting
authRouter.post("/login", authLimiter, authController.userLogin);
authRouter.post("/google", authLimiter, authController.userLoginGoogle);
authRouter.post("/register", authLimiter, authController.userRegister);

// Protected routes
authRouter.get("/me", jwtAuth, authController.userRefresh);
authRouter.post("/logout", authController.userLogout);

// Public profile view
authRouter.get("/:hostId", authController.userProfile);

// Protected contact update
authRouter.patch("/contact/:hostId", jwtAuth, authController.userContact);

module.exports = authRouter;