const mongoose = require("mongoose");

// =========================================================
// PetGPT Conversation (Phase 2)
// ---------------------------------------------------------
// One per user chat session. Owns Message records. Every
// read/write must be scoped to the authenticated owner.
// ---------------------------------------------------------
// ponytail: hard-delete strategy (no deleted flag) — cleared
// conversations vanish with their messages; see clearConversation.
// =========================================================

const conversationSchema = new mongoose.Schema(
  {
    // Conversation owner (authenticated user). Never trust
    // client-supplied ownership fields.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      default: "New conversation",
      trim: true,
    },

    // Last-activity metadata for the conversation list.
    lastMessageAt: {
      type: Date,
    },

    lastMessagePreview: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ owner: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);