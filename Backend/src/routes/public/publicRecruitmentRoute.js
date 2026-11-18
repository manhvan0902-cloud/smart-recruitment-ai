const express = require("express");
const controller = require("../../controllers/public/publicRecruitmentController");
const { catalog } = require("../../controllers/candidates/candidateCatalogController");
const router = express.Router();

router.get("/catalog", catalog);
router.get("/jobs", controller.listJobs);
router.get("/jobs/:jobId", controller.getJob);
router.get("/companies/:companyId", controller.getCompany);
router.get("/companies/:companyId/jobs", controller.listCompanyJobs);

module.exports = router;
