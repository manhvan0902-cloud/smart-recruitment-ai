const express = require("express");
const controller = require("../../controllers/recruiters/recruiterInterviewController");

const router = express.Router();

router.get("/interviews", controller.listInterviews);
router.post("/applications/:applicationId/interviews", controller.createInterview);
router.patch("/interviews/:interviewId", controller.updateInterview);
router.patch("/interviews/:interviewId/cancel", controller.cancelInterview);
router.patch("/interviews/:interviewId/complete", controller.completeInterview);

module.exports = router;
