const express = require('express');
const listingRouter = express.Router()
const listingController = require("../controllers/listingController")

listingRouter.post("/create-new", listingController.newListing);
listingRouter.get("/all-listing", listingController.allListing);
listingRouter.get("/one-listing/:staycationId", listingController.allListing);
//get all listing 



module.exports = listingRouter;