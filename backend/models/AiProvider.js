const mongoose = require("mongoose");

// =========================================================
// PetGPT provider configuration (Phase 3)
// ---------------------------------------------------------
// One doc per user-owned provider configuration. Credentials
// live here — never on Conversation/Message. apiKeyEnc holds
// the AES-256-GCM ciphertext (see utils/cipher.js); plaintext
// keys never reach the database.
// =========================================================

const aiProviderSchema = new mongoose.Schema(
  {
    // Configuration owner (authenticated user). Never trust
    // client-supplied ownership fields.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Provider type — must match a registered adapter name in the
    // provider registry (backend/ai). Registry stays generic; any
    // registered provider type becomes a valid configuration.
    provider: {
      type: String,
      required: true,
      trim: true,
    },

    // Display name chosen by the user (defaults to provider type).
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Endpoint root for OpenAI-compatible providers (empty for
    // providers without a configurable host, e.g. google).
    baseUrl: {
      type: String,
      default: "",
      trim: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    // Encrypted API key (iv:tag:ciphertext, base64). Required.
    apiKeyEnc: {
      type: String,
      required: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    // At most one active provider per owner; the controller enforces
    // this by deactivating siblings when active=true is written.
    active: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

aiProviderSchema.index({ owner: 1, active: 1 });

module.exports = mongoose.model("AiProvider", aiProviderSchema);