const express = require('express');
const listingRouter = express.Router()
const listingController = require("../controllers/listingController")


listingRouter.post("/create-new", listingController.newListing);
listingRouter.get("/all-listing", listingController.allListing);
listingRouter.get("/all-verified-listing", listingController.allVerifiedListing);
listingRouter.get("/staycation/:staycationId", listingController.oneListing);
listingRouter.patch("/staycation/:staycationId/verify", listingController.socialMedia);


module.exports = listingRouter;