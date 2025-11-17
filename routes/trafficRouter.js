const express = require('express');
const trafficRouter = express.Router()
const trafficController = require("../controllers/trafficController")

trafficRouter.post("/:staycationId", trafficController.recordStaycationClick);
trafficRouter.get("/weekly-report/:hostId", trafficController.sendWeeklyPerformance);
trafficRouter.get("/allTraffic", trafficController.getAllTraffic);

module.exports = trafficRouter;