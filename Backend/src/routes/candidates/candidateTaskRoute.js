const express = require("express");
const controller = require("../../controllers/candidates/candidateTaskController");

const router = express.Router();

router.get("/ai-tasks/:taskId", controller.getAiTask);

module.exports = router;
