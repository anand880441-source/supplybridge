const mongoose = require("mongoose");

const { MESSAGE_MAX_LENGTH } = require("../constants/communicationOptions");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    body: {
      type: String,
      required: [true, "Message cannot be empty"],
      trim: true,
      minlength: [1, "Message cannot be empty"],
      maxlength: [MESSAGE_MAX_LENGTH, "Message is too long"]
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
