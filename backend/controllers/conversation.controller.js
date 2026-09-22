// =========================================================
// PetGPT conversations controller (Phase 2 + Phase 4)
// ---------------------------------------------------------
// Persistent, ownership-scoped chat. The DB is the source of
// truth for conversation history: page refresh, navigation,
// focus changes, and reconnects do not lose chat state.
// Every operation reads/writes via req.user._id — never via
// client-supplied ownership fields.
//
// Exchange flow (POST .../messages):
//
//   validate -> ownership-check conversation -> idempotency check
//     -> scope gate (immediate synchronous scope answer)
//     -> persist user message -> enqueue generation job -> 202
//
// AI generation no longer runs inside this request. The durable
// job (Phase 4) is claimed by the background worker, which calls
// the provider, persists the assistant message, and completes or
// fails the job. This request may end long before generation does.
//
//   HTTP request lifecycle          AI generation lifecycle
//   ─────────────────────          ────────────────────────
//   auth/ownership/validate         job queued
//   persist user message     ──►    worker claims (processing)
//   enqueue job                     provider call
//   return 202 (.userMessage,       persist assistant message
//     .job, no assistant)           job completed/failed
//   ─── request ends here ──►   (keeps running)
// =========================================================

const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const GenerationJob = require("../models/GenerationJob");
const { AI_CONFIG, outOfScopeResponse } = require("../config/ai");
const { publicMessage, updateConversationMetadata } = require("../ai/context");
const { publicJob } = require("./job.controller");
const { enforceGenerationQuota } = require("../ai/quota");

const DEFAULT_TITLE = "New conversation";
const IDEMPOTENCY_KEY_MAX = 200;

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
// A turn whose job is still running shows its single (user) message here
// until the worker persists the assistant reply.
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

// POST /api/ai/conversations/:conversationId/messages — enqueue a durable
// AI generation for a user message.
//
// Behaviors:
//   * out-of-scope  -> immediate synchronous canned scope answer
//     (preserved Phase 2 behavior; no job).
//   * in-scope      -> persist user message, queue a GenerationJob,
//     return 202 immediately. The assistant reply is written by the
//     background worker and is never part of this response.
//   * idempotency   -> { idempotencyKey } scoped to the authenticated
//     user: a repeat submission with the same key returns the original
//     job/message (no duplicates); reusing a key against a DIFFERENT
//     conversation fails with 409.
exports.addMessage = async (req, res) => {
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

    let idempotencyKey;
    if (req.body && req.body.idempotencyKey !== undefined && req.body.idempotencyKey !== null) {
      idempotencyKey = String(req.body.idempotencyKey).trim();
      if (!idempotencyKey) {
        return res.status(400).json({ success: false, message: "idempotencyKey must not be empty." });
      }
      if (idempotencyKey.length > IDEMPOTENCY_KEY_MAX) {
        return res.status(400).json({
          success: false,
          message: `idempotencyKey is too long. Maximum length is ${IDEMPOTENCY_KEY_MAX} characters.`,
        });
      }
    }

    const conversation = await Conversation.findOne({ _id: conversationId, owner: req.user._id });
    if (!conversation) return notFound(res);

    // Idempotency (Phase 4): one (owner, key) -> one job. A prior
    // submission with the same key and the same conversation returns
    // the existing persisted message + job verbatim; the same key on
    // a different conversation is a conflicting reuse -> 409.
    if (idempotencyKey) {
      const existing = await GenerationJob.findOne({ owner: req.user._id, idempotencyKey }).lean();
      if (existing) {
        if (String(existing.conversation) !== String(conversationId)) {
          return res.status(409).json({
            success: false,
            message: "Idempotency key was already used for a different conversation.",
          });
        }
        const userMessage = await Message.findById(existing.userMessage).lean();
        console.log(`PetGPT: idempotent resubmission for user ${req.user._id} -> reused job ${existing._id}.`);
        return res.json({
          success: true,
          reused: true,
          conversationId,
          userMessage: publicMessage(userMessage),
          job: publicJob(existing),
        });
      }
    }

    // Scope gate short-circuits before any provider work (Phase 0 rule).
    // Preserved immediate behavior: user message + canned scope answer
    // persisted synchronously, no generation job created.
    const scope = outOfScopeResponse(content);
    if (scope) {
      console.log(`PetGPT: out-of-scope question block for user ${req.user._id}.`);
      const userMessage = await Message.create({ conversation: conversationId, role: "user", content });
      const scopeMessage = await Message.create({ conversation: conversationId, role: "assistant", content: scope });
      await updateConversationMetadata(conversation, content, scope);
      return res.json({
        success: true,
        scopeHandled: true,
        conversationId,
        userMessage: publicMessage(userMessage),
        assistantMessage: publicMessage(scopeMessage),
      });
    }

    // Per-user generation quota (Phase 6): check AFTER the scope gate
    // (out-of-scope exchanges create no jobs and cost nothing) and BEFORE
    // persisting the message or creating a job, so an exceeded window
    // returns a deterministic 429 and never leaves an orphan message. The
    // durable GenerationJob collection IS the usage ledger via
    // enforceGenerationQuota().
    const quota = await enforceGenerationQuota(req.user._id);
    if (!quota.allowed) {
      console.log(`PetGPT: rate limit exceeded for user ${req.user._id} (${quota.count}/${quota.max}).`);
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Please try again later.",
      });
    }

    // Durable generation: persist the user turn and enqueue the job.
    // The response returns before generation runs — the background
    // worker owns the rest (provider resolution happens there, at the
    // correct point, owner-scoped).
    const userMessage = await Message.create({ conversation: conversationId, role: "user", content });

    let job;
    try {
      job = await GenerationJob.create({
        owner: req.user._id,
        conversation: conversationId,
        userMessage: userMessage._id,
        idempotencyKey: idempotencyKey || undefined,
      });
    } catch (error) {
      // Unique (owner, idempotencyKey) collision: a concurrent identical
      // submission won the race. Drop our orphan message and adopt the
      // winner's job so exactly one user message + one job survive.
      if (error && (error.code === 11000 || (error.name === "MongoServerError" && error.code === 11000))) {
        await Message.deleteOne({ _id: userMessage._id });
        const existing = await GenerationJob.findOne({ owner: req.user._id, idempotencyKey }).lean();
        if (!existing || String(existing.conversation) !== String(conversationId)) {
          return res.status(409).json({
            success: false,
            message: "Idempotency key was already used for a different conversation.",
          });
        }
        const winnerMessage = await Message.findById(existing.userMessage).lean();
        return res.json({
          success: true,
          reused: true,
          conversationId,
          userMessage: publicMessage(winnerMessage),
          job: publicJob(existing),
        });
      }
      throw error;
    }

    console.log(`PetGPT: queued job ${job._id} for conversation ${conversationId} (user ${req.user._id}).`);
    res.status(202).json({
      success: true,
      conversationId,
      userMessage: publicMessage(userMessage),
      job: publicJob(job),
    });
  } catch (error) {
    console.error("PetGPT: add message failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// DELETE /api/ai/conversations/:conversationId — "clear chat" as a real
// backend operation: hard-deletes the conversation, every message, and
// every generation job for it. Messages and jobs first, then the
// conversation; a mid-sequence failure leaves either the conversation
// intact (retry-safe) or an unreachable orphan (all reads are
// conversation-scoped), never a leaked history.
// ponytail: sequential deletes, not a transaction — wrap in a Mongo
// transaction if multi-document atomicity ever matters.
exports.clearConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return invalidId(res);

    const conversation = await Conversation.findOne({ _id: conversationId, owner: req.user._id });
    if (!conversation) return notFound(res);

    await Message.deleteMany({ conversation: conversationId });
    await GenerationJob.deleteMany({ conversation: conversationId });
    await Conversation.deleteOne({ _id: conversationId, owner: req.user._id });

    console.log(`PetGPT: conversation ${conversationId} cleared for user ${req.user._id}.`);
    res.json({ success: true, message: "Conversation cleared." });
  } catch (error) {
    console.error("PetGPT: clear conversation failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};