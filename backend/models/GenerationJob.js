const mongoose = require("mongoose");

// =========================================================
// PetGPT durable generation job (Phase 4)
// ---------------------------------------------------------
// A unit of AI work that outlives the HTTP request that queued
// it. The DB is the source of truth for generation state:
//   queued -> processing -> completed
//                     └──> failed
// Transitions are claimed with atomic status-conditioned
// updates (findOneAndUpdate), so two workers/loops can never
// complete the same job twice. Retries are bounded by
// attemptCount vs AI_CONFIG.worker.maxAttempts (see scan).
//
// Security: this doc holds NO secrets. It stores only provider
// observability labels (name/model), the client-safe error code
// and message, and object references. API keys, auth headers,
// and full provider requests/responses never live here (they
// live, encrypted, on AiProvider only).
// =========================================================

const generationJobSchema = new mongoose.Schema(
  {
    // Job owner (authenticated user). The worker resolves every
    // resource (provider, pets, conversation) through this owner —
    // never through client-supplied ownership fields.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    // The user turn that triggered this job (persisted by the
    // controller before the job exists).
    userMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },

    // Set only when the worker persists the assistant reply.
    assistantMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Lifecycle state (see the state machine above).
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },

    // Observability labels only — resolved and set by the worker.
    // "env" means system-level configuration; otherwise the user's
    // stored provider display name. Never contains credentials.
    provider: {
      type: String,
      default: "",
    },

    model: {
      type: String,
      default: "",
    },

    // Incremented on every claim (queued -> processing).
    attemptCount: {
      type: Number,
      default: 0,
    },

    // Client-safe failure state. code is one of a small stable set
    // ("provider" | "timeout" | "conversation" | "message" | "internal");
    // message is a generic, human-safe sentence. Internal provider
    // errors are logged server-side only, never stored here.
    error: {
      code: { type: String, default: "" },
      message: { type: String, default: "" },
    },

    // Client-supplied idempotency key, scoped to the owner by the
    // unique partial index below. Only present on jobs created with
    // a key; absent otherwise (partial index keeps it sparse).
    idempotencyKey: {
      type: String,
      default: undefined,
    },

    startedAt: { type: Date },
    completedAt: { type: Date },
    failedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Worker claims in FIFO order.
generationJobSchema.index({ status: 1, createdAt: 1 });

// Idempotency: one job per (owner, idempotencyKey). The partial
// filter means documents without a key are not constrained. A
// duplicate insert raises E11000, which the controller turns into
// "return the existing job" or 409 on cross-conversation reuse.
generationJobSchema.index(
  { owner: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

module.exports = mongoose.model("GenerationJob", generationJobSchema);