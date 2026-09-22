// =========================================================
// PetGPT provider layer — interface/contract + shared helpers
// ---------------------------------------------------------
// Provider contract:
//   provider = { name: string, generate({ system, question, petContext, history? }) => Promise<{ text, latencyMs? }> }
//   history? (Phase 2): Array<{ role: "user"|"assistant", content }> of prior
//   conversation messages, oldest-first, already capped by the caller
//   (AI_CONFIG.maxHistoryMessages). Inserted between the system message and
//   the current user turn. Ignoring it is allowed (single-turn providers).
// Providers throw AiProviderError(code, message) on any failure.
// Normalized error codes let callers distinguish:
//   config / timeout / http / malformed / unknown
// This file is vendor-agnostic: adapters register themselves
// via register() and are selected by AI_CONFIG.provider.
// =========================================================

const { AI_CONFIG } = require("../config/ai");

const AI_ERROR_CODES = Object.freeze({
  CONFIG: "config",
  TIMEOUT: "timeout",
  HTTP: "http",
  MALFORMED: "malformed",
  UNKNOWN: "unknown",
});

class AiProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
    this.status = options.status || undefined;
  }
}

// Registry ------------------------------------------------------------

const providers = new Map();

function register(name, provider) {
  providers.set(name, provider);
}

function getProvider(name) {
  const provider = providers.get(name);
  if (!provider) {
    throw new AiProviderError(AI_ERROR_CODES.CONFIG, `Unknown provider "${name}".`);
  }
  return provider;
}

function getActiveProvider() {
  return getProvider(AI_CONFIG.provider);
}

// Shared HTTP helpers ---------------------------------------------------

// Abort-safe fetch. Maps transport failures to normalized errors:
// AbortController timeout -> TIMEOUT, network errors -> UNKNOWN.
// Never embeds the URL/headers in messages (no secrets in logs).
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...(options || {}), signal: controller.signal });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new AiProviderError(AI_ERROR_CODES.TIMEOUT, `Provider request timed out after ${timeoutMs}ms.`);
    }
    throw new AiProviderError(AI_ERROR_CODES.UNKNOWN, "Provider network failure.");
  } finally {
    clearTimeout(timer);
  }
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new AiProviderError(AI_ERROR_CODES.MALFORMED, "Provider returned a non-JSON response.");
  }
}

// Shared prompt assembly: the user's own pets context (ownership is
// enforced by the controller before this is built).
function userPetsText(petContext) {
  return petContext && petContext.length
    ? "The user's pets: " +
      petContext.map((p) => `${p.name} (${p.species}${p.breed ? ", " + p.breed : ""})`).join("; ") +
      ". "
    : "";
}

module.exports = {
  AI_ERROR_CODES,
  AiProviderError,
  register,
  getProvider,
  getActiveProvider,
  fetchWithTimeout,
  parseJson,
  userPetsText,
};