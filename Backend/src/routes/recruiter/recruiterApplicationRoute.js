const express = require("express");
const controller = require("../../controllers/recruiters/recruiterApplicationController");

const router = express.Router();

router.get("/jobs/:jobId/applications", controller.listApplications);
router.get("/applications", controller.listApplications);
router.get("/applications/:applicationId", controller.getApplication);
router.patch("/applications/:applicationId/status", controller.updateApplicationStatus);
router.get("/applications/:applicationId/cv-download", controller.getApplicationCvDownload);

module.exports = router;
