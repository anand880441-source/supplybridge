const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const {
  createConversation,
  getMyConversations,
  getConversationMessages,
  sendMessage
} = require("./conversation.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createConversation);
router.get("/", getMyConversations);
router.get("/:id/messages", getConversationMessages);
router.post("/:id/messages", sendMessage);

module.exports = router;
