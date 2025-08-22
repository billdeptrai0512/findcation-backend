const express = require('express');
const authRouter = express.Router()
const authController = require("../controllers/authController")
const jwtAuth = require("../middleware/jwtAuth");


// authRouter.get("/", authController.verifyAuth)
authRouter.post("/login", authController.userLogin);
authRouter.post("/logout", authController.userLogout);
authRouter.post("/google", authController.userLoginGoogle);

authRouter.get("/zalo", jwtAuth, authController.userConnectZalo);
authRouter.get("/zalo/callback", authController.zaloCallback);
authRouter.get("/facebook", jwtAuth, authController.userConnectFacebook);
authRouter.get("/facebook/callback", jwtAuth, authController.facebookCallback);
authRouter.get("/instagram", jwtAuth, authController.userConnectInstagram);
authRouter.get("/instagram/callback", jwtAuth, authController.instagramCallback);




module.exports = authRouter;