const express = require('express');
const registerRouter = express.Router()
const registerController = require("../controllers/registerController.js");

registerRouter.post("/", registerController.userRegister);
registerRouter.post("/auth/google", registerController.userRegisterGoogleAuth);
//register via email ?
//forgot password ?
//verify email ?
module.exports = registerRouter;