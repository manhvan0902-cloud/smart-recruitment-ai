const express = require("express");
const controller = require("../../controllers/candidates/candidateNotificationController");

const router = express.Router();

router.get("/notifications", controller.listNotifications);
router.patch("/notifications/read-all", controller.markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", controller.markNotificationRead);

module.exports = router;
