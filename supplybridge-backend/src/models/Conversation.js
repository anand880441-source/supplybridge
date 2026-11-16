const mongoose = require("mongoose");

const { MESSAGE_MAX_LENGTH } = require("../constants/communicationOptions");

// One private conversation exists per quotation. The buyer owns the
// requirement, and the seller sent that quotation.
const conversationSchema = new mongoose.Schema(
  {
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      required: true
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    buyerBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    sellerBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true
    },
    lastMessage: {
      type: String,
      trim: true,
      maxlength: [MESSAGE_MAX_LENGTH, "Message is too long"],
      default: ""
    },
    lastMessageAt: {
      type: Date,
      default: null
    },
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    buyerUnreadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    sellerUnreadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    buyerLastReadAt: {
      type: Date,
      default: null
    },
    sellerLastReadAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ quotationId: 1 }, { unique: true });
conversationSchema.index({ requirementId: 1, sellerId: 1 }, { unique: true });
conversationSchema.index({ buyerId: 1, lastMessageAt: -1 });
conversationSchema.index({ sellerId: 1, lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
