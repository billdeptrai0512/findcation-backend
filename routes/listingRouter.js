const express = require('express');
const listingRouter = express.Router();
const listingController = require("../controllers/listingController");
const { uploadLimiter } = require("../middleware/rateLimiter");
const jwtAuth = require("../middleware/jwtAuth");

// Public routes
listingRouter.get("/all-listing", listingController.allListing);
listingRouter.get("/all-verified-listing", listingController.allVerifiedListing);
listingRouter.get("/staycation/:staycationId", listingController.oneListing);

// Protected routes - require authentication
listingRouter.post("/create-new", jwtAuth, uploadLimiter, listingController.newListing);
listingRouter.delete("/staycation/:staycationId", jwtAuth, listingController.removeListing);
listingRouter.patch("/staycation/:staycationId/verify", jwtAuth, listingController.socialMedia);
listingRouter.patch("/staycation/:staycationId/editor", jwtAuth, listingController.editor);
listingRouter.post("/staycation/:staycationId/editor/cover-images", jwtAuth, uploadLimiter, listingController.editorImage);
listingRouter.post("/staycation/:staycationId/editor/rooms/:roomId", jwtAuth, uploadLimiter, listingController.editorRoomImage);

module.exports = listingRouter;