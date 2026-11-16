const express = require("express");
const controller = require("../../controllers/candidates/candidateExperienceController");

const router = express.Router();

router.get("/experiences", controller.listExperiences);
router.post("/experiences", controller.createExperience);
router.patch("/experiences/:id", controller.updateExperience);
router.delete("/experiences/:id", controller.deleteExperience);

module.exports = router;
