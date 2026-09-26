// =========================================================
// PetGPT shared conversation assembly (Phase 2 + Phase 4)
// ---------------------------------------------------------
// The one place that assembles what an exchange hands to the
// provider layer and what responses expose to clients, so the
// synchronous scope path and the durable worker path reuse the
// exact same bounded-history / pet-context / preview behaviour.
// ---------------------------------------------------------

const { AI_CONFIG } = require("../config/ai");
const Message = require("../models/Message");
const { loadPetContext } = require("./pet-context");
const { userPetsText } = require("./provider");

const DEFAULT_TITLE = "New conversation";
const TITLE_CHARS = 60;
const PREVIEW_CHARS = 60;

// Public message shape used across the API (never leaks internal fields).
// toolCalls is a bounded, secret-free trace of tool executions that shaped
// this assistant message; absent when no tools ran.
function publicMessage(m) {
  if (!m) return null;
  const out = { id: m._id, role: m.role, content: m.content, createdAt: m.createdAt };
  if (m.toolCalls && m.toolCalls.length) out.toolCalls = m.toolCalls;
  return out;
}

// Assistant message shape handed to a generateWithTools adapter on the
// FIRST round of the tool-calling exchange. Mirrors the exact user-turn
// shape the openai.generate() adapter builds for the non-tool path, so a
// provider sees identical context whether or not the tool path is used.
function buildProviderMessages({ system, history, petContext, question }) {
  return [
    { role: "system", content: system },
    ...(history || []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userPetsText(petContext) + "User asks: " + question },
  ];
}

// Loads the user's owned pet context PLUS the capped conversation
// history for provider prompts. Same bounded behaviour as the Phase 2
// flow, shared so the worker never diverges from it. excludeMessageId
// drops the current user turn (already persisted by the time the
// worker queries, so it must not be replayed as history).
async function buildConversationContext({ conversationId, userId, excludeMessageId }) {
  const petContext = await loadPetContext(userId);

  const filter = { conversation: conversationId, role: { $in: ["user", "assistant"] } };
  if (excludeMessageId) filter._id = { $ne: excludeMessageId };

  const history = await Message.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(AI_CONFIG.maxHistoryMessages)
    .lean();
  history.reverse();

  return { petContext, history };
}

// Updates conversation list metadata after an assistant message lands
// (title derivation on first exchange, lastMessageAt, preview).
async function updateConversationMetadata(conversation, userMessageContent, assistantContent) {
  if (!conversation.title || conversation.title === DEFAULT_TITLE) {
    conversation.title =
      userMessageContent.slice(0, TITLE_CHARS) + (userMessageContent.length > TITLE_CHARS ? "…" : "");
  }
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview =
    assistantContent.slice(0, PREVIEW_CHARS) + (assistantContent.length > PREVIEW_CHARS ? "…" : "");
  await conversation.save();
}

module.exports = { publicMessage, buildProviderMessages, buildConversationContext, updateConversationMetadata };