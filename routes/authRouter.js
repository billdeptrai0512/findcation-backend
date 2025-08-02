const express = require('express');
const authRouter = express.Router()
const authController = require("../controllers/authController")

authRouter.get("/", authController.verifyAuth)
authRouter.post("/logout", authController.userLogout);
authRouter.post("/forgot-password", authController.verifyEmail);
authRouter.post("/reset-password", authController.updatePassword);
authRouter.post("/verify-pin", authController.verifyPinCode);


//register via email ?
//forgot password ?
//verify email ?



module.exports = authRouter;