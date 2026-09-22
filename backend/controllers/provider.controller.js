// =========================================================
// PetGPT provider configuration controller (Phase 3)
// ---------------------------------------------------------
// CRUD + test for user-owned provider configurations. Every
// operation resolves the document via { _id, owner: req.user._id }
// — ownership is never client-supplied, so cross-user read /
// modify / delete / key-use is impossible (foreign ids return 404,
// identical to "not found").
//
// Secrets: API keys are encrypted before storage (utils/cipher.js)
// and never appear in responses, logs, or error messages. Safe
// responses expose metadata plus a `configured: true` mask.
// =========================================================

const mongoose = require("mongoose");
const AiProvider = require("../models/AiProvider");
const { buildSystemPrompt } = require("../config/ai");
const { encryptSecret } = require("../utils/cipher");
const { buildProviderRequest, getProviderNames } = require("../ai");

// Field caps (Phase 7): provider configuration values are echoed to remote
// providers and stored in MongoDB, so oversized values are rejected
// deterministically (400) instead of persisting. Keys max out well below any
// real provider token length.
const NAME_MAX = 100;
const MODEL_MAX = 200;
const API_KEY_MAX = 500;

// Safe response shape — never exposes apiKeyEnc or anything derivable
// from it beyond the configured boolean mask.
function safeProvider(p) {
  return {
    id: p._id,
    provider: p.provider,
    name: p.name,
    baseUrl: p.baseUrl || "",
    model: p.model,
    enabled: p.enabled,
    active: p.active,
    configured: Boolean(p.apiKeyEnc),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function notFound(res) {
  return res.status(404).json({ success: false, message: "Provider configuration not found or not owned by you." });
}

function invalidId(res) {
  return res.status(400).json({ success: false, message: "Invalid provider configuration ID." });
}

function isDuplicateKey(error) {
  return !!(error && error.code === 11000);
}

// Deactivate every provider config but (optionally) one. Enforces the
// "at most one active provider per owner" invariant BEFORE writing, so a
// create/promote lands in a clean state; the unique { owner } where
// active:true index (model) backstops concurrent writers.
async function deactivateOthers(ownerId, exceptId) {
  const filter = { owner: ownerId };
  if (exceptId) filter._id = { $ne: exceptId };
  await AiProvider.updateMany(filter, { $set: { active: false } });
}

// Create an active config, retrying once if a concurrent promotion won the
// race (E11000 on the partial unique index). Deterministic, never a 500.
async function createActiveConfig(ownerId, fields) {
  try {
    return await AiProvider.create(fields);
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    await deactivateOthers(ownerId);
    return AiProvider.create(fields);
  }
}

function cfgError(message) {
  const error = new Error(message);
  error.validation = true;
  return error;
}

function normalizeBaseUrl(raw) {
  const value = String(raw || "").trim();
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw cfgError("baseUrl must be a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw cfgError("baseUrl must use http(s).");
  }
  return parsed.toString().replace(/\/+$/, "");
}

// Validates a (possibly merged) payload and returns the normalized
// fields to store. Throws cfgError (400) on invalid input. apiKey is
// normalized to trim/empty string when absent; the caller decides
// whether an absent key is allowed (update) or required (create).
function validatePayload(body) {
  const provider = String(body.provider || "").trim();
  if (!provider) throw cfgError("provider is required.");
  if (!getProviderNames().includes(provider)) {
    throw cfgError(`Unsupported provider type "${provider}".`);
  }

  const name = String(body.name || "").trim() || provider;
  const model = String(body.model || "").trim();
  if (!model) throw cfgError("model is required.");
  if (name.length > NAME_MAX) throw cfgError(`name must be at most ${NAME_MAX} characters.`);
  if (model.length > MODEL_MAX) throw cfgError(`model must be at most ${MODEL_MAX} characters.`);

  let baseUrl = "";
  if (provider === "openai") {
    if (!String(body.baseUrl || "").trim()) throw cfgError("baseUrl is required for OpenAI-compatible providers.");
    baseUrl = normalizeBaseUrl(body.baseUrl);
  }

  const apiKey = body.apiKey === undefined ? undefined : String(body.apiKey || "").trim();
  if (apiKey && apiKey.length > API_KEY_MAX) {
    throw cfgError(`apiKey must be at most ${API_KEY_MAX} characters.`);
  }

  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
  const active = body.active === undefined ? false : Boolean(body.active);

  return { provider, name, baseUrl, model, apiKey, enabled, active };
}

// GET /api/ai/providers
exports.listProviders = async (req, res) => {
  try {
    const providers = await AiProvider.find({ owner: req.user._id }).sort({ createdAt: 1, _id: 1 });
    res.json({ success: true, providers: providers.map(safeProvider) });
  } catch (error) {
    console.error("PetGPT: list providers failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// POST /api/ai/providers
exports.createProvider = async (req, res) => {
  try {
    const data = validatePayload(req.body);
    if (!data.apiKey) throw cfgError("apiKey is required.");

    // First configuration for the owner becomes their active provider;
    // otherwise explicit active:true is required (only one stays active).
    let active = data.active;
    if (!active) {
      const existing = await AiProvider.exists({ owner: req.user._id });
      if (!existing) active = true;
    }

    const fields = {
      owner: req.user._id,
      provider: data.provider,
      name: data.name,
      baseUrl: data.baseUrl,
      model: data.model,
      apiKeyEnc: encryptSecret(data.apiKey),
      enabled: data.enabled,
      active,
    };

    let provider;
    if (active) {
      await deactivateOthers(req.user._id);
      provider = await createActiveConfig(req.user._id, fields);
    } else {
      provider = await AiProvider.create(fields);
    }
    res.status(201).json({ success: true, provider: safeProvider(provider) });
  } catch (error) {
    if (error && error.validation) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("PetGPT: create provider failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// PATCH /api/ai/providers/:id — partial update.
exports.updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId(res);

    const doc = await AiProvider.findOne({ _id: id, owner: req.user._id });
    if (!doc) return notFound(res);

    const merged = {
      provider: req.body.provider === undefined ? doc.provider : req.body.provider,
      name: req.body.name === undefined ? doc.name : req.body.name,
      baseUrl: req.body.baseUrl === undefined ? doc.baseUrl : req.body.baseUrl,
      model: req.body.model === undefined ? doc.model : req.body.model,
      apiKey: req.body.apiKey === undefined ? undefined : req.body.apiKey,
      enabled: req.body.enabled === undefined ? doc.enabled : req.body.enabled,
      active: req.body.active === undefined ? doc.active : req.body.active,
    };
    const data = validatePayload(merged);

    if (data.apiKey !== undefined) {
      if (!data.apiKey) throw cfgError("apiKey must not be empty.");
      doc.apiKeyEnc = encryptSecret(data.apiKey);
    }

    // Promote-to-active: detect BEFORE mutating doc.active.
    const promoting = data.active && !doc.active;

    doc.provider = data.provider;
    doc.name = data.name;
    doc.baseUrl = data.baseUrl;
    doc.model = data.model;
    doc.enabled = data.enabled;
    doc.active = data.active;

    if (promoting) {
      // Clearing the siblings, then save. If a concurrent promote won the
      // race (E11000 on the partial unique index), clear again and retry once.
      await deactivateOthers(req.user._id, doc._id);
      try {
        await doc.save();
      } catch (error) {
        if (!isDuplicateKey(error)) throw error;
        await deactivateOthers(req.user._id, doc._id);
        await doc.save();
      }
    } else {
      await doc.save();
    }

    res.json({ success: true, provider: safeProvider(doc) });
  } catch (error) {
    if (error && error.validation) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("PetGPT: update provider failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// DELETE /api/ai/providers/:id
exports.deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId(res);

    const doc = await AiProvider.findOneAndDelete({ _id: id, owner: req.user._id });
    if (!doc) return notFound(res);

    res.json({ success: true, message: "Provider configuration deleted." });
  } catch (error) {
    console.error("PetGPT: delete provider failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// POST /api/ai/providers/:id/test — uses the stored credentials to
// exercise the configured provider. Never persists anything (no test
// message enters a conversation) and never returns the secret.
exports.testProvider = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return invalidId(res);

    const doc = await AiProvider.findOne({ _id: id, owner: req.user._id });
    if (!doc) return notFound(res);

    let request;
    try {
      request = buildProviderRequest(doc);
    } catch (error) {
      // Decryption failure (missing/wrong encryption key) -> normalized
      // failure; the secret is never returned.
      return res.json({ success: true, ok: false, provider: doc.provider, error: { code: "config" } });
    }

    const startedAt = Date.now();
    try {
      const result = await request.adapter.generate({
        system: buildSystemPrompt(),
        question: "Reply only with: OK",
        petContext: [],
        history: [],
        config: request.config,
      });
      res.json({
        success: true,
        ok: true,
        provider: doc.provider,
        model: doc.model,
        latencyMs: typeof result.latencyMs === "number" ? result.latencyMs : Date.now() - startedAt,
      });
    } catch (error) {
      res.json({
        success: true,
        ok: false,
        provider: doc.provider,
        error: { code: error && error.code ? error.code : "unknown", status: error && error.status ? error.status : undefined },
      });
    }
  } catch (error) {
    console.error("PetGPT: test provider failed:", error.message);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};