const express = require('express');
const mapRouter = express.Router()
const mapController = require("../controllers/mapController.js");

mapRouter.get("/", mapController.map);
mapRouter.get("/search", mapController.search);

module.exports = mapRouter;