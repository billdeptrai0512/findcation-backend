const express = require('express');
const listingRouter = express.Router()
const listingController = require("../controllers/listingController")


listingRouter.post("/create-new", listingController.newListing);
listingRouter.get("/all-listing", listingController.allListing);
listingRouter.get("/all-verified-listing", listingController.allVerifiedListing);
listingRouter.get("/staycation/:staycationId", listingController.oneListing);
listingRouter.delete("/staycation/:staycationId", listingController.removeListing);
listingRouter.patch("/staycation/:staycationId/verify", listingController.socialMedia);
listingRouter.patch("/staycation/:staycationId/editor", listingController.editor);
listingRouter.post("/staycation/:staycationId/editor/cover-images", listingController.editorImage);
listingRouter.post("/staycation/:staycationId/editor/rooms/:roomId", listingController.editorRoomImage);

module.exports = listingRouter;