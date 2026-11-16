const express = require("express");
const controller = require("../../controllers/candidates/candidateCertificationController");

const router = express.Router();

router.get("/certifications", controller.listCertifications);
router.post("/certifications", controller.createCertification);
router.patch("/certifications/:id", controller.updateCertification);
router.delete("/certifications/:id", controller.deleteCertification);

module.exports = router;
