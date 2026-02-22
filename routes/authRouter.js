const express = require('express');
const authRouter = express.Router();
const authController = require("../controllers/authController");
const { generateCode } = require("../controllers/adminController");
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
authRouter.get("/allHost", authController.allHost);
authRouter.get("/:hostId", authController.userProfile);

// Host: generate a verification code for their own contact
authRouter.post("/host/:id/generate-code", jwtAuth, generateCode);

// Protected contact update
authRouter.patch("/contact/:hostId", jwtAuth, authController.userContact);

module.exports = authRouter;