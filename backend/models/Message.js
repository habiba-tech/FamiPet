const mongoose = require("mongoose");

// =========================================================
// PetGPT Message (Phase 2)
// ---------------------------------------------------------
// A single persisted turn inside a Conversation. Roles are
// assigned by the backend only; clients never supply them.
// Schema stays minimal: status/provider metadata belong to
// the durable-generation phase (Phase 4), not here.
// =========================================================

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    role: {
      type: String,
      required: true,
      enum: ["user", "assistant", "system"],
      index: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Phase 5: bounded trace of the tool calls executed to produce this
    // assistant message ({ name, arguments?, ok, error? }). Absent on
    // messages generated without tools. Metadata only — never API keys,
    // auth headers, provider payloads, or raw record dumps. The worker
    // writes it bounded (backed by ai/tool-calling.TOOL_CALLS_METADATA_MAX).
    toolCalls: {
      type: [
        {
          name: { type: String, required: true },
          arguments: { type: mongoose.Schema.Types.Mixed, default: undefined },
          ok: { type: Boolean, required: true },
          error: { type: String, default: undefined },
        },
      ],
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);