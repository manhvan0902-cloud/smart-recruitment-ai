const router = require("express").Router();
const controller = require("../../controllers/recruiters/recruiterAiController");
router.post("/jobs/:jobId/ai-description", controller.generateJd);
router.get("/jobs/:jobId/ai-tasks", controller.listJobTasks);
router.post("/applications/:applicationId/interview-questions", controller.generateQuestions);
router.get("/applications/:applicationId/ai-tasks", controller.listQuestionTasks);
module.exports = router;
