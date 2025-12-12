const express = require('express');
const authRouter = express.Router()
const authController = require("../controllers/authController")
const jwtAuth = require("../middleware/jwtAuth");


// authRouter.get("/", authController.verifyAuth)
authRouter.get("/me", jwtAuth, authController.userRefresh);
authRouter.get("/:hostId", authController.userProfile)
authRouter.post("/login", authController.userLogin);
authRouter.post("/logout", authController.userLogout);
authRouter.post("/google", authController.userLoginGoogle);
authRouter.post("/register", authController.userRegister);
authRouter.patch("/contact/:hostId", authController.userContact);



module.exports = authRouter;