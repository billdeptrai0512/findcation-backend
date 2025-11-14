const express = require('express');
const trafficRouter = express.Router()
const trafficController = require("../controllers/trafficController")

trafficRouter.post("/:staycationId", trafficController.recordStaycationClick);
trafficRouter.get("/weekly-report/:hostId", trafficController.sendWeeklyPerformance);

module.exports = trafficRouter;