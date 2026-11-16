const express = require("express");
const controller = require("../../controllers/candidates/candidateProjectController");

const router = express.Router();

router.get("/projects", controller.listProjects);
router.post("/projects", controller.createProject);
router.patch("/projects/:id", controller.updateProject);
router.delete("/projects/:id", controller.deleteProject);

module.exports = router;
