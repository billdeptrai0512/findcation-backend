const express = require('express');
const adminRouter = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const isAdmin = require('../middleware/isAdmin');
const adminController = require('../controllers/adminController');

// All admin routes require authentication + admin role
adminRouter.patch('/host/:id/verify-contact', jwtAuth, isAdmin, adminController.verifyContact);
adminRouter.patch('/staycation/:id/verify-address', jwtAuth, isAdmin, adminController.verifyAddress);
adminRouter.patch('/staycation/:id/verify-active', jwtAuth, isAdmin, adminController.verifyActive);

module.exports = adminRouter;
