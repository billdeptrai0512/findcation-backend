const express = require('express');
const loginRouter = express.Router()
const loginController = require("../controllers/loginController")

loginRouter.post("/email", loginController.checkEmail);
loginRouter.post("/register", loginController.userRegister);
loginRouter.post("/forgot-password", loginController.verifyEmail);
loginRouter.post("/reset-password", loginController.updatePassword);
loginRouter.post("/verify-pin", loginController.verifyPinCode);

//register via email ?
//forgot password ?
//verify email ?



module.exports = loginRouter;