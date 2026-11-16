const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "quotation_received",
  "quotation_updated",
  "quotation_withdrawn",
  "quotation_accepted",
  "quotation_rejected",
  "order_created",
  "order_status_updated",
  "review_received",
  "verification_approved",
  "verification_rejected"
];

const NOTIFICATION_RELATED_TYPES = [
  "requirement",
  "quotation",
  "order",
  "conversation",
  "business"
];

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [120, "Notification title cannot exceed 120 characters"]
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Notification message cannot exceed 500 characters"]
    },
    relatedType: {
      type: String,
      enum: [...NOTIFICATION_RELATED_TYPES, null],
      default: null
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.NOTIFICATION_RELATED_TYPES = NOTIFICATION_RELATED_TYPES;
