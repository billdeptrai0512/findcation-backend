const express = require('express');
const loginRouter = express.Router();
const loginController = require("../controllers/loginController");
const { authLimiter } = require("../middleware/rateLimiter");

// All login-related routes should have rate limiting to prevent brute force
loginRouter.post("/email", authLimiter, loginController.checkEmail);

loginRouter.post("/forgot-password", authLimiter, loginController.verifyEmail);
loginRouter.post("/reset-password", authLimiter, loginController.updatePassword);

loginRouter.post("/new-email", authLimiter, loginController.newEmail);
loginRouter.post("/change-email", authLimiter, loginController.changeEmail);

loginRouter.post("/change-password", authLimiter, loginController.changePassword);
loginRouter.post("/verify-pin", authLimiter, loginController.verifyPinCode);

module.exports = loginRouter;