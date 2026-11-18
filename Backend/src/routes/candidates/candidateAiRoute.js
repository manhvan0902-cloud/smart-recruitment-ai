const router = require("express").Router();
const controller = require("../../controllers/candidates/candidateAiController");
router.post("/cvs/:cvId/analyze", controller.analyzeCv);
router.post("/cvs/:cvId/ai-matches", controller.matchCv);
module.exports = router;
