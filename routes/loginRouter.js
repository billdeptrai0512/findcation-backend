const express = require('express');
const loginRouter = express.Router()
const loginController = require("../controllers/loginController")

loginRouter.post("/", loginController.userLogin);
loginRouter.post("/email", loginController.checkEmail);
//register via email ?
//forgot password ?
//verify email ?



module.exports = loginRouter;