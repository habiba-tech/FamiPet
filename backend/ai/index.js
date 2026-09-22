// =========================================================
// PetGPT AI service — entry point for the provider layer.
// ---------------------------------------------------------
// Registers the provider adapters, selects the active one
// from AI_CONFIG.provider, calls it, and normalizes outcomes:
//   success  -> returns assistant text (truthy)
//   failure  -> logs provider + normalized code, returns null
//               (the controller then falls back to static answers)
//
// Logs identify the provider and outcome but never contain
// API keys, auth headers, or request bodies.
// =========================================================

const { buildSystemPrompt } = require("../config/ai");
const {
  AI_ERROR_CODES,
  register,
  getActiveProvider,
} = require("./provider");

register("google", require("./gemini"));
register("openai", require("./openai"));

async function generatePetGPTResponse(question, petContext) {
  const startedAt = Date.now();
  let provider = null;
  try {
    provider = getActiveProvider();
    const result = await provider.generate({
      system: buildSystemPrompt(),
      question,
      petContext,
    });
    const latency = typeof result.latencyMs === "number" ? result.latencyMs : Date.now() - startedAt;
    console.log(`PetGPT: provider "${provider.name}" ok after ${latency}ms (${result.text.length} chars).`);
    return result.text;
  } catch (error) {
    const providerName = provider ? provider.name : "unknown";
    const code = error && error.code ? error.code : AI_ERROR_CODES.UNKNOWN;
    const message = error && error.message ? error.message : "unknown error";
    console.error(`PetGPT: provider "${providerName}" failed (${code}) after ${Date.now() - startedAt}ms; using fallback: ${message}`);
    return null;
  }
}

module.exports = { generatePetGPTResponse, getActiveProvider, AI_ERROR_CODES };