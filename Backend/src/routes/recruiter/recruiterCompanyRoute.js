const express = require("express");
const controller = require("../../controllers/recruiters/recruiterCompanyController");

const router = express.Router();

router.get("/catalog", controller.catalog);
router.get("/profile", controller.getProfile);
router.post("/profile", controller.createProfile);
router.patch("/profile", controller.updateProfile);

module.exports = router;
