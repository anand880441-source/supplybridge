const mongoose = require("mongoose");

const Notification = require("../../models/Notification");
const {
  formatNotification,
  getUnreadCount
} = require("./notification.service");

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getNotifications = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(
      parsePositiveInteger(req.query.limit, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const unreadOnly = req.query.unread === "true";
    const filter = { recipientId: req.user._id };

    if (unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      getUnreadCount(req.user._id)
    ]);

    return res.status(200).json({
      success: true,
      data: notifications.map(formatNotification),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch notifications"
    });
  }
};

const getNotificationUnreadCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount(req.user._id);

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error("Get notification count error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the notification count"
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification id"
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipientId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const unreadCount = await getUnreadCount(req.user._id);

    return res.status(200).json({
      success: true,
      data: formatNotification(notification),
      unreadCount
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update the notification"
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      unreadCount: 0
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications"
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead
};
