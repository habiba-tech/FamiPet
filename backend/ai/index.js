// =========================================================
// PetGPT AI service — entry point for the provider layer.
// ---------------------------------------------------------
// Registers the provider adapters, selects the active one,
// calls it, and normalizes outcomes:
//   success  -> returns assistant text (truthy)
//   failure  -> logs provider + normalized code, returns null
//               (the controller then falls back to static answers)
//
// Phase 3 provider configuration: the caller may pass a resolved
// user-owned provider configuration (see resolveActiveProviderConfig).
// When present, its stored (encrypted) credentials are decrypted here
// — and only here — immediately before the provider request, and the
// named provider adapter is used. When absent, the legacy system-level
// environment configuration (AI_CONFIG) is used unchanged.
//
// Logs identify the provider and outcome but never contain
// API keys, auth headers, or request bodies.
// =========================================================

const { buildSystemPrompt } = require("../config/ai");
const {
  AI_ERROR_CODES,
  register,
  getProvider,
  getProviderNames,
  getActiveProvider,
} = require("./provider");
const { decryptSecret } = require("../utils/cipher");
const AiProvider = require("../models/AiProvider");

register("google", require("./gemini"));
register("openai", require("./openai"));

// Resolve the authenticated user's active, enabled provider
// configuration (Phase 3). Returns a lean doc whose apiKey remains
// ENCRYPTED, or null — null means "keep the system-level environment
// configuration". The resolution is strictly owner-scoped, so a user
// can never select/see another user's provider.
async function resolveActiveProviderConfig(userId) {
  return AiProvider.findOne({ owner: userId, active: true, enabled: true })
    .select("provider name baseUrl model apiKeyEnc")
    .lean();
}

// Build the adapter call for a stored provider configuration. The API
// key is decrypted here, and only here, right before a real request.
// Throws on unknown provider type or on a missing/wrong encryption
// key (fail closed: never return or log the plaintext).
function buildProviderRequest(configDoc) {
  const adapter = getProvider(configDoc.provider);
  const config = { apiKey: decryptSecret(configDoc.apiKeyEnc), model: configDoc.model };
  if (configDoc.baseUrl) config.baseUrl = configDoc.baseUrl;
  return { adapter, config };
}

async function generatePetGPTResponse(question, petContext, history = [], providerConfig) {
  const startedAt = Date.now();
  let adapter = null;
  let providerLabel = "env";
  try {
    let config;
    if (providerConfig) {
      const request = buildProviderRequest(providerConfig);
      adapter = request.adapter;
      config = request.config;
      providerLabel = providerConfig.name || providerConfig.provider;
    } else {
      adapter = getActiveProvider();
      providerLabel = adapter.name;
    }
    const result = await adapter.generate({
      system: buildSystemPrompt(),
      question,
      petContext,
      history,
      config,
    });
    const latency = typeof result.latencyMs === "number" ? result.latencyMs : Date.now() - startedAt;
    console.log(`PetGPT: provider "${providerLabel}" ok after ${latency}ms (${result.text.length} chars).`);
    return result.text;
  } catch (error) {
    const code = error && error.code ? error.code : AI_ERROR_CODES.UNKNOWN;
    const message = error && error.message ? error.message : "unknown error";
    console.error(`PetGPT: provider "${providerLabel}" failed (${code}) after ${Date.now() - startedAt}ms; using fallback: ${message}`);
    return null;
  }
}

module.exports = {
  generatePetGPTResponse,
  getActiveProvider,
  resolveActiveProviderConfig,
  buildProviderRequest,
  getProviderNames,
  AI_ERROR_CODES,
};