const express = require("express");
const controller = require("../../controllers/candidates/candidateApplicationController");

const router = express.Router();

router.post("/jobs/:jobId/applications", controller.applyToJob);
router.get("/applications", controller.listApplications);
router.get("/applications/:applicationId", controller.getApplication);
router.patch("/applications/:applicationId/withdraw", controller.withdrawApplication);

module.exports = router;
