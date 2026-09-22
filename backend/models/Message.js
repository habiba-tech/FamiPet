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
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);