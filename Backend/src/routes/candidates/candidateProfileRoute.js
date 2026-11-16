const express = require("express");
const controller = require("../../controllers/candidates/candidateProfileController");

const router = express.Router();

router.get("/profile", controller.getCandidateProfile);
router.post("/profile", controller.createCandidateProfile);
router.patch("/profile", controller.updateCandidateProfile);

module.exports = router;
