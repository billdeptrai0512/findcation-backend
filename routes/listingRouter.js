const express = require('express');
const listingRouter = express.Router()
const listingController = require("../controllers/listingController")
const jwtAuth = require("../middleware/jwtAuth");


listingRouter.post("/create-new", jwtAuth, listingController.newListing);
listingRouter.get("/all-listing", listingController.allListing);
listingRouter.get("/staycation/:staycationId", listingController.oneListing);



module.exports = listingRouter;