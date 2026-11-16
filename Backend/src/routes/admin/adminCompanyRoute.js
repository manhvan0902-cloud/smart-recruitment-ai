const express = require("express");
const controller = require("../../controllers/admin/adminCompanyController");
const router = express.Router();

router.get("/companies", controller.listCompanies);
router.patch("/companies/:companyId/verification", controller.verifyCompany);

module.exports = router;
