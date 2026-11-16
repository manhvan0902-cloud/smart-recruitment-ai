const express = require("express");
const controller = require("../../controllers/candidates/candidateCvController");

const router = express.Router();

router.post("/cvs", controller.uploadMiddleware, controller.uploadCv);
router.get("/cvs", controller.listCvs);
router.get("/cvs/:cvId", controller.getCv);
router.get("/cvs/:cvId/download", controller.downloadCv);
router.patch("/cvs/:cvId/archive", controller.archiveCv);
router.post("/cvs/:cvId/parse", controller.parseCv);
router.get("/cvs/:cvId/ai-tasks", controller.listCvTasks);

module.exports = router;
