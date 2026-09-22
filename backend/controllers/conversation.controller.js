// =========================================================
// PetGPT conversations controller (Phase 2)
// ---------------------------------------------------------
// Persistent, ownership-scoped chat. The DB is the source of
// truth for conversation history: page refresh, navigation,
// focus changes, and reconnects do not lose chat state.
// Every operation reads/writes via req.user._id — never via
// client-supplied ownership fields.
//
// Flow of an exchange (POST .../messages):
//   validate -> ownership-check conversation -> pet context
//   -> load capped history -> persist user message
//   -> scope gate / provider -> persist assistant message
//   -> update conversation metadata -> return both messages
//
// The persisted assistant message is the source of truth; the
// response does not depend on the HTTP request staying alive.
// =========================================================

const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { AI_CONFIG, outOfScopeResponse } = require("../config/ai");
const { generatePetGPTResponse } = require("../ai");
const { fallbackAnswer, loadPetContext } = require("./ai.controller");

const DEFAULT_TITLE = "New conversation";
const TITLE_CHARS = 60;
const PREVIEW_CHARS = 60;

function publicConversation(c) {
  return {
    id: c._id,
    title: c.title,
    lastMessageAt: c.lastMessageAt || null,
    lastMessagePreview: c.lastMessagePreview || "",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function publicMessage(m) {
  return { id: m._id, role: m.role, content: m.content, createdAt: m.createdAt };
}

function notFound(res) {
  return res.status(404).json({ success: false, message: "Conversation not found or not owned by you." });
}

function invalidId(res) {
  return res.status(400).json({ success: false, message: "Invalid conversation ID." });
}

// POST /api/ai/conversations — create a conversation.
// Also serves "start a new conversation": creating a fresh
// conversation IS starting a new one (no duplicate endpoint).
exports.createConversation = async (req, res) => {
  try {
    const raw = req.body && req.body.title;
    const title = raw === undefined || raw === null ? "" : String(raw).trim();
    if (title.length > AI_CONFIG.maxQuestionLength) {
      return res.status(400).json({
        success: false,
        message: `Title is too long. Maximum length is ${AI_CONFIG.maxQuestionLength} characters.`,
      });
    }

    const conversation = await Conversation.create({
      owner: req.user._id,
      title: title || DEFAULT_TITLE,
    });
    res.status(201).json({ success: true, conversation: publicConversation(conversation) });
  } catch (error) {
    console.error("PetGPT: create conversation failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// GET /api/ai/conversations — list the authenticated user's conversations.
exports.listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ owner: req.user._id })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, conversations: conversations.map(publicConversation) });
  } catch (error) {
    console.error("PetGPT: list conversations failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// GET /api/ai/conversations/:conversationId — conversation + full message list.
exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return invalidId(res);

    const conversation = await Conversation.findOne({ _id: conversationId, owner: req.user._id });
    if (!conversation) return notFound(res);

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    res.json({
      success: true,
      conversation: publicConversation(conversation),
      messages: messages.map(publicMessage),
    });
  } catch (error) {
    console.error("PetGPT: get conversation failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// POST /api/ai/conversations/:conversationId/messages — add a user message,
// run the PetGPT flow, persist the assistant message, return both.
exports.addMessage = async (req, res) => {
  const startedAt = Date.now();
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return invalidId(res);

    const raw = req.body && req.body.content;
    const content = raw === undefined || raw === null ? "" : String(raw).trim();
    if (!content) {
      return res.status(400).json({ success: false, message: "Message content is required." });
    }
    if (content.length > AI_CONFIG.maxQuestionLength) {
      return res.status(400).json({
        success: false,
        message: `Message is too long. Maximum length is ${AI_CONFIG.maxQuestionLength} characters.`,
      });
    }

    const conversation = await Conversation.findOne({ _id: conversationId, owner: req.user._id });
    if (!conversation) return notFound(res);

    const petContext = await loadPetContext(req.user._id);

    // Capped conversation history (oldest-first) to use as provider context.
    // Loaded before persisting the current message so it stays self-contained.
    const history = await Message.find({
      conversation: conversationId,
      role: { $in: ["user", "assistant"] },
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(AI_CONFIG.maxHistoryMessages)
      .lean();
    history.reverse();

    const userMessage = await Message.create({
      conversation: conversationId,
      role: "user",
      content,
    });

    // Scope gate short-circuits before any provider call (Phase 0 rule).
    const scope = outOfScopeResponse(content);
    let answer;
    if (scope) {
      console.log(`PetGPT: out-of-scope question blocked for user ${req.user._id}.`);
      answer = scope;
    } else {
      const generated = await generatePetGPTResponse(content, petContext, history);
      // Provider failure -> existing fallback behaviour; the persisted
      // assistant message is whatever the user actually saw. No fabricated
      // "provider success" is ever stored.
      answer = generated || fallbackAnswer(content);
    }

    const assistantMessage = await Message.create({
      conversation: conversationId,
      role: "assistant",
      content: answer,
    });

    if (!conversation.title || conversation.title === DEFAULT_TITLE) {
      conversation.title = content.slice(0, TITLE_CHARS) + (content.length > TITLE_CHARS ? "…" : "");
    }
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = answer.slice(0, PREVIEW_CHARS) + (answer.length > PREVIEW_CHARS ? "…" : "");
    await conversation.save();

    console.log(
      `PetGPT: conversation ${conversationId} exchange done in ${Date.now() - startedAt}ms (${conversation.title}).`
    );

    res.json({
      success: true,
      conversationId,
      userMessage: publicMessage(userMessage),
      assistantMessage: publicMessage(assistantMessage),
    });
  } catch (error) {
    console.error("PetGPT: add message failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// DELETE /api/ai/conversations/:conversationId — "clear chat" as a real
// backend operation: hard-deletes the conversation and every message.
// Messages first, then the conversation; a mid-sequence failure leaves
// either the conversation intact (retry-safe) or an unreachable orphan
// (all reads are conversation-scoped), never a leaked history.
// ponytail: sequential deletes, not a transaction — wrap in a Mongo
// transaction if multi-document atomicity ever matters (Phase 4).
exports.clearConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return invalidId(res);

    const conversation = await Conversation.findOne({ _id: conversationId, owner: req.user._id });
    if (!conversation) return notFound(res);

    await Message.deleteMany({ conversation: conversationId });
    await Conversation.deleteOne({ _id: conversationId, owner: req.user._id });

    console.log(`PetGPT: conversation ${conversationId} cleared for user ${req.user._id}.`);
    res.json({ success: true, message: "Conversation cleared." });
  } catch (error) {
    console.error("PetGPT: clear conversation failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};