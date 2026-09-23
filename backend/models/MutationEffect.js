const mongoose = require("mongoose");

// =========================================================
// PetGPT mutation idempotency ledger (Phase 6)
// ---------------------------------------------------------
// Records ONE row per successfully executed mutating tool call,
// keyed server-side by (owner, deterministic key). The key derives
// from the durable GenerationJob id + tool name + normalized
// arguments (see backend/ai/tools/registry.js), so a job that is
// retried or re-enqueued after a crash replays the recorded result
// instead of executing the mutation a second time.
//
// Not a job/queue system — it is a write-once audit/replay ledger
// for side effects only. Read-only tools never touch it.
//
// Security: stores no secrets. `result` is the tool's normalized,
// bounded result (ids/names/dates, never API keys, auth material,
// or raw provider payloads). GenerationJob itself stays free of
// business data.
// =========================================================

const mutationEffectSchema = new mongoose.Schema(
  {
    // Owner of both the job and the mutation. Lookups are always
    // re-scoped through this owner; a foreign/unknown key never resolves.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The durable job this mutation ran inside (same job id on retry ->
    // same deterministic key -> replay, not duplicate).
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GenerationJob",
      required: true,
      index: true,
    },

    // Registered tool that performed the mutation.
    tool: {
      type: String,
      required: true,
    },

    // sha256(jobId:tool:normalizedArgs) — server-derived, never
    // client/model-supplied. Unique per owner.
    key: {
      type: String,
      required: true,
    },

    // The normalized, bounded result returned to the model on replay.
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One execution per (owner, key). The key embeds the job id, so the
// same mutation across different jobs always has a different key.
mutationEffectSchema.index({ owner: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("MutationEffect", mutationEffectSchema);