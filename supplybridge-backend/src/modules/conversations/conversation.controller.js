const mongoose = require("mongoose");

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const Quotation = require("../../models/Quotation");
const Requirement = require("../../models/Requirement");
const {
  BUSINESS_PUBLIC_FIELDS,
  formatBusinessSummary
} = require("../../utils/businessSummary");
const {
  REQUIREMENT_SUMMARY_FIELDS,
  formatRequirementSummary
} = require("../../utils/requirementSummary");
const {
  validateMessageBody,
  validateQuotationId
} = require("./conversation.validation");
const { sendToUser } = require("../../realtime/realtime");

const MESSAGE_PAGE_SIZE = 100;

const populateConversation = (query) => {
  return query
    .populate("requirementId", REQUIREMENT_SUMMARY_FIELDS)
    .populate("quotationId", "offerType totalPrice status")
    .populate("buyerBusinessId", BUSINESS_PUBLIC_FIELDS)
    .populate("sellerBusinessId", BUSINESS_PUBLIC_FIELDS);
};

const isParticipant = (conversation, user) => {
  return (
    conversation.buyerId.toString() === user._id.toString() ||
    conversation.sellerId.toString() === user._id.toString()
  );
};

const formatQuotationSummary = (quotation) => {
  if (!quotation || !quotation.status) {
    return null;
  }

  return {
    id: quotation._id,
    offerType: quotation.offerType,
    totalPrice: quotation.totalPrice,
    status: quotation.status
  };
};

const formatConversation = (conversation, user) => {
  const isBuyer = conversation.buyerId.toString() === user._id.toString();
  const isSeller = conversation.sellerId.toString() === user._id.toString();
  const counterpartBusiness = isBuyer
    ? conversation.sellerBusinessId
    : conversation.buyerBusinessId;

  return {
    id: conversation._id,
    requirement: formatRequirementSummary(conversation.requirementId),
    quotation: formatQuotationSummary(conversation.quotationId),
    counterpart: {
      role: isBuyer ? "seller" : "buyer",
      business: formatBusinessSummary(counterpartBusiness)
    },
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: isBuyer
      ? conversation.buyerUnreadCount
      : conversation.sellerUnreadCount,
    isBuyer,
    isSeller,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  };
};

const formatMessage = (message, user, recipientLastReadAt = null) => {
  const isMine = message.senderId.toString() === user._id.toString();
  const isRead =
    isMine &&
    Boolean(recipientLastReadAt) &&
    new Date(recipientLastReadAt).getTime() >=
      new Date(message.createdAt).getTime();

  return {
    id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    isMine,
    isRead,
    createdAt: message.createdAt
  };
};

const getUnreadTotal = async (userId) => {
  const conversations = await Conversation.find({
    $or: [{ buyerId: userId }, { sellerId: userId }],
    lastMessageAt: { $ne: null }
  })
    .select("buyerId buyerUnreadCount sellerUnreadCount")
    .lean();

  return conversations.reduce((total, conversation) => {
    const isBuyer = conversation.buyerId.toString() === userId.toString();

    return (
      total +
      (isBuyer
        ? conversation.buyerUnreadCount
        : conversation.sellerUnreadCount)
    );
  }, 0);
};

// POST /api/conversations
// A buyer and the seller behind a pending or accepted quotation can open the
// same conversation from either side.
const createConversation = async (req, res) => {
  try {
    const body = req.body || {};
    const quotationValidation = validateQuotationId(body.quotationId);

    if (quotationValidation.error) {
      return res.status(400).json({
        success: false,
        message: quotationValidation.error
      });
    }

    const quotation = await Quotation.findById(quotationValidation.value);
    const requirement = quotation
      ? await Requirement.findById(quotation.requirementId)
      : null;

    if (!quotation || !requirement) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const isBuyer = requirement.buyerId.toString() === req.user._id.toString();
    const isSeller = quotation.sellerId.toString() === req.user._id.toString();

    // Do not reveal quotations to unrelated users.
    if (!isBuyer && !isSeller) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found"
      });
    }

    const existingConversation = await populateConversation(
      Conversation.findOne({ quotationId: quotation._id })
    );

    // Existing threads stay reachable after a quotation is rejected,
    // withdrawn, or expires. New threads require an actionable quotation.
    if (existingConversation) {
      return res.status(200).json({
        success: true,
        message: "Conversation already exists",
        created: false,
        data: formatConversation(existingConversation, req.user)
      });
    }

    if (!["pending", "accepted"].includes(quotation.status)) {
      return res.status(400).json({
        success: false,
        message:
          "You can only start a conversation for a pending or accepted quotation"
      });
    }

    let conversation;

    try {
      conversation = await Conversation.create({
        requirementId: requirement._id,
        quotationId: quotation._id,
        buyerId: requirement.buyerId,
        sellerId: quotation.sellerId,
        buyerBusinessId: requirement.businessId,
        sellerBusinessId: quotation.businessId
      });
    } catch (error) {
      // A double tap or two devices can race to create the same thread.
      if (error.code === 11000) {
        const racedConversation = await populateConversation(
          Conversation.findOne({ quotationId: quotation._id })
        );

        if (racedConversation) {
          return res.status(200).json({
            success: true,
            message: "Conversation already exists",
            created: false,
            data: formatConversation(racedConversation, req.user)
          });
        }
      }

      throw error;
    }

    const populatedConversation = await populateConversation(
      Conversation.findById(conversation._id)
    );

    return res.status(201).json({
      success: true,
      message: "Conversation created",
      created: true,
      data: formatConversation(populatedConversation, req.user)
    });
  } catch (error) {
    console.error("Create conversation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create the conversation"
    });
  }
};

// GET /api/conversations
const getMyConversations = async (req, res) => {
  try {
    const conversations = await populateConversation(
      Conversation.find({
        $or: [{ buyerId: req.user._id }, { sellerId: req.user._id }],
        // Empty threads stay hidden until someone sends the first message.
        lastMessageAt: { $ne: null }
      })
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .limit(100)
    );

    const data = conversations.map((conversation) =>
      formatConversation(conversation, req.user)
    );

    return res.status(200).json({
      success: true,
      data,
      unreadTotal: data.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0
      )
    });
  } catch (error) {
    console.error("Get conversations error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your conversations"
    });
  }
};

// GET /api/conversations/:id/messages
// Fetching a thread marks it as read for the current participant.
const getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id"
      });
    }

    const conversation = await Conversation.findById(id);

    if (!conversation || !isParticipant(conversation, req.user)) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    const isBuyer = conversation.buyerId.toString() === req.user._id.toString();
    const recipientLastReadAt = isBuyer
      ? conversation.sellerLastReadAt
      : conversation.buyerLastReadAt;
    const readAt = new Date();
    const readUpdate = isBuyer
      ? { buyerUnreadCount: 0, buyerLastReadAt: readAt }
      : { sellerUnreadCount: 0, sellerLastReadAt: readAt };

    await Conversation.updateOne({ _id: conversation._id }, { $set: readUpdate });

    const recentMessages = await Message.find({
      conversationId: conversation._id
    })
      .sort({ createdAt: -1 })
      .limit(MESSAGE_PAGE_SIZE);

    const messages = recentMessages.reverse();
    const populatedConversation = await populateConversation(
      Conversation.findById(conversation._id)
    );
    const unreadTotal = await getUnreadTotal(req.user._id);

    return res.status(200).json({
      success: true,
      data: messages.map((message) =>
        formatMessage(message, req.user, recipientLastReadAt)
      ),
      conversation: formatConversation(populatedConversation, req.user),
      unreadTotal
    });
  } catch (error) {
    console.error("Get conversation messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch messages"
    });
  }
};

// POST /api/conversations/:id/messages
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation id"
      });
    }

    const conversation = await Conversation.findById(id);

    if (!conversation || !isParticipant(conversation, req.user)) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    const body = req.body || {};
    const messageValidation = validateMessageBody(body.body);

    if (messageValidation.error) {
      return res.status(400).json({
        success: false,
        message: messageValidation.error
      });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      body: messageValidation.value
    });

    const isSenderBuyer =
      conversation.buyerId.toString() === req.user._id.toString();
    const recipientId = isSenderBuyer
      ? conversation.sellerId
      : conversation.buyerId;
    const recipientUnreadField = isSenderBuyer
      ? "sellerUnreadCount"
      : "buyerUnreadCount";

    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          lastMessage: message.body,
          lastMessageAt: message.createdAt,
          lastMessageSenderId: req.user._id
        },
        $inc: { [recipientUnreadField]: 1 }
      }
    );

    const recipientUnreadTotal = await getUnreadTotal(recipientId);

    sendToUser(recipientId, {
      type: "message",
      data: {
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
        senderId: req.user._id.toString(),
        body: message.body,
        createdAt: message.createdAt
      },
      unreadTotal: recipientUnreadTotal
    });

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: formatMessage(message, req.user)
    });
  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send the message"
    });
  }
};

module.exports = {
  createConversation,
  getMyConversations,
  getConversationMessages,
  sendMessage
};
