const express = require("express");
const controller = require("../../controllers/recruiters/recruiterCompanyMediaController");

const router = express.Router();

router.post("/profile/logo", controller.uploadMiddleware, controller.uploadLogo);
router.delete("/profile/logo", controller.deleteLogo);

module.exports = router;
