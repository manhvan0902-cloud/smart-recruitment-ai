const express = require("express");
const controller = require("../../controllers/recruiters/recruiterNotificationController");

const router = express.Router();

router.get("/notifications", controller.listNotifications);
router.patch("/notifications/read-all", controller.markAllNotificationsRead);
router.patch("/notifications/:notificationId/read", controller.markNotificationRead);

module.exports = router;
