const express = require("express");
const { protect } = require("../middleware/auth");
const {
  createConversation,
  listConversations,
  getConversation,
  addMessage,
  clearConversation,
} = require("../controllers/conversation.controller");

const router = express.Router();

// Every conversation route requires an authenticated user.
router.use(protect);

// Create conversation / "start a new conversation".
router.post("/", createConversation);

// List the user's conversations.
router.get("/", listConversations);

// Get a conversation with its messages.
router.get("/:conversationId", getConversation);

// Add a user message + run the PetGPT flow (persists assistant reply).
router.post("/:conversationId/messages", addMessage);

// Clear/delete a conversation (hard delete, messages included).
router.delete("/:conversationId", clearConversation);

module.exports = router;