const express = require('express');
const geojsonRouter = express.Router()
const geojsonController = require("../controllers/geojsonController")


geojsonRouter.get("/", geojsonController.islandGeoJSON);
//get all listing 



module.exports = geojsonRouter;