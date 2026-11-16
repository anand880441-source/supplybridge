const Notification = require("../../models/Notification");
const { sendToUser } = require("../../realtime/realtime");

const formatNotification = (notification) => {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedType: notification.relatedType || null,
    relatedId: notification.relatedId
      ? notification.relatedId.toString()
      : null,
    isRead: Boolean(notification.isRead),
    readAt: notification.readAt || null,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt
  };
};

const getUnreadCount = (userId) => {
  return Notification.countDocuments({
    recipientId: userId,
    isRead: false
  });
};

const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  relatedType = null,
  relatedId = null
}) => {
  if (!recipientId) {
    return null;
  }

  try {
    const notification = await Notification.create({
      recipientId,
      type,
      title,
      message,
      relatedType,
      relatedId
    });
    const unreadCount = await getUnreadCount(recipientId);

    sendToUser(recipientId, {
      type: "notification",
      data: formatNotification(notification),
      unreadCount
    });

    return notification;
  } catch (error) {
    console.error("Create notification error:", error.message);
    return null;
  }
};

module.exports = {
  createNotification,
  formatNotification,
  getUnreadCount
};
