const express = require('express');
const loginRouter = express.Router()
const loginController = require("../controllers/loginController")

loginRouter.post("/email", loginController.checkEmail);

loginRouter.post("/forgot-password", loginController.verifyEmail);
loginRouter.post("/reset-password", loginController.updatePassword);

loginRouter.post("/new-email", loginController.newEmail);
loginRouter.post("/change-email", loginController.changeEmail);

loginRouter.post("/change-password", loginController.changePassword);
loginRouter.post("/verify-pin", loginController.verifyPinCode);

//register via email ?
//forgot password ?
//verify email ?



module.exports = loginRouter;