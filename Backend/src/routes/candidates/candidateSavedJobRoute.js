const express = require("express");
const controller = require("../../controllers/candidates/candidateSavedJobController");

const router = express.Router();

router.get("/saved-jobs", controller.listSavedJobs);
router.put("/saved-jobs/:jobId", controller.saveJob);
router.delete("/saved-jobs/:jobId", controller.removeSavedJob);

module.exports = router;
