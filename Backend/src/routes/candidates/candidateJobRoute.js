const express = require("express");
const controller = require("../../controllers/candidates/candidateJobController");

const router = express.Router();

router.get("/jobs", controller.listJobs);
router.get("/jobs/:jobId", controller.getJob);

module.exports = router;
