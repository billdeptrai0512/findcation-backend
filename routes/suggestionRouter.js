const express = require('express');
const suggestionRouter = express.Router()
const suggestionController = require("../controllers/suggestionController.js");

suggestionRouter.get("/", suggestionController.allSuggestion);
suggestionRouter.post("/", suggestionController.newSuggestion);

module.exports = suggestionRouter;