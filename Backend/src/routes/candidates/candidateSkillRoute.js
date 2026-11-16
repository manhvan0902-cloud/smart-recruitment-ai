const express = require("express");
const controller = require("../../controllers/candidates/candidateSkillController");

const router = express.Router();

router.get("/skills", controller.getSkills);
router.put("/skills", controller.replaceSkills);

module.exports = router;
