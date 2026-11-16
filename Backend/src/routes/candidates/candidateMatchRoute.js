const express = require("express");
const controller = require("../../controllers/candidates/candidateMatchController");

const router = express.Router();

router.post("/cvs/:cvId/matches", controller.createCvMatches);
router.get("/cvs/:cvId/matches", controller.listCvMatches);

module.exports = router;
