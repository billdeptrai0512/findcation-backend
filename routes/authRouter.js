const express = require('express');
const authRouter = express.Router()
const authController = require("../controllers/authController")
const jwtAuth = require("../middleware/jwtAuth");


authRouter.get("/", authController.verifyAuth)
authRouter.post("/logout", authController.userLogout);
authRouter.post("/forgot-password", authController.verifyEmail);
authRouter.post("/reset-password", authController.updatePassword);
authRouter.post("/verify-pin", authController.verifyPinCode);

authRouter.get("/zalo", jwtAuth, authController.userConnectZalo);
authRouter.get("/zalo/callback", authController.zaloCallback);
authRouter.get("/facebook", jwtAuth, authController.userConnectFacebook);
authRouter.get("/facebook/callback", jwtAuth, authController.facebookCallback);
authRouter.get("/instagram", jwtAuth, authController.userConnectInstagram);
authRouter.get("/instagram/callback", jwtAuth, authController.instagramCallback);
// authRouter.post("/register", authController.userRegister);



module.exports = authRouter;