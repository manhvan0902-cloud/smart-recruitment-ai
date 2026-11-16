const express = require("express");
const controller = require("../../controllers/recruiters/recruiterJobController");

const router = express.Router();

router.get("/jobs", controller.listJobs);
router.post("/jobs", controller.createJob);
router.get("/jobs/:jobId", controller.getJob);
router.patch("/jobs/:jobId", controller.updateJob);
router.put("/jobs/:jobId/skills", controller.replaceJobSkills);
router.post("/jobs/:jobId/publish", controller.publishJob);
router.post("/jobs/:jobId/close", controller.closeJob);

module.exports = router;
