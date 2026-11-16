const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead
} = require("./notification.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.get("/unread-count", getNotificationUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
