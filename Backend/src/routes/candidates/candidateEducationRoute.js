const express = require("express");
const controller = require("../../controllers/candidates/candidateEducationController");

const router = express.Router();

router.get("/educations", controller.listEducations);
router.post("/educations", controller.createEducation);
router.patch("/educations/:id", controller.updateEducation);
router.delete("/educations/:id", controller.deleteEducation);

module.exports = router;
