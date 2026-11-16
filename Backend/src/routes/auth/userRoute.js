const express = require("express");
const controller = require("../../controllers/auth/userController");
const router = express.Router();

router.get("/users", controller.getUsersInfo);
router.patch("/users/:userId/status", controller.updateUserStatus);

module.exports = router;
