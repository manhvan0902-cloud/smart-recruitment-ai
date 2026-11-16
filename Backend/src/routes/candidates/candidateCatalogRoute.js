const express = require("express");
const controller = require("../../controllers/candidates/candidateCatalogController");

const router = express.Router();

router.get("/catalog", controller.catalog);

module.exports = router;
