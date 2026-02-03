const express = require('express');
const geojsonRouter = express.Router()
const geojsonController = require("../controllers/geojsonController")


geojsonRouter.get("/", geojsonController.islandGeoJSON);
geojsonRouter.get("/location", geojsonController.getLocationFromIP);
//get all listing 



module.exports = geojsonRouter;