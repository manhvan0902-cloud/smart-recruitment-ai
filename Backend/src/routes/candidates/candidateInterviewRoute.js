const express = require("express");
const controller = require("../../controllers/candidates/candidateInterviewController");

const router = express.Router();

router.get("/interviews", controller.listInterviews);
router.patch("/interviews/:interviewId/response", controller.respondToInterview);

module.exports = router;
