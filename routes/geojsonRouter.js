const express = require('express');
const geojsonRouter = express.Router()
const geojsonController = require("../controllers/geojsonController")


geojsonRouter.get("/", geojsonController.islandGeoJSON);
geojsonRouter.get("/location", geojsonController.getLocationFromIP);
geojsonRouter.get("/test-location", geojsonController.testLocationLookup); // Debug endpoint
//get all listing 



module.exports = geojsonRouter;