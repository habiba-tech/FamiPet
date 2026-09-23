// =========================================================
// PetGPT provider layer — interface/contract + shared helpers
// ---------------------------------------------------------
// Provider contract:
//   provider = { name: string, generate({ system, question, petContext, history? }) => Promise<{ text, latencyMs? }> }
//   history? (Phase 2): Array<{ role: "user"|"assistant", content }> of prior
//   conversation messages, oldest-first, already capped by the caller
//   (AI_CONFIG.maxHistoryMessages). Inserted between the system message and
//   the current user turn. Ignoring it is allowed (single-turn providers).
//   capabilities (Phase 5): { chat: true, toolCalling: false|true }. When a
//   provider declares toolCalling it MAY also implement
//   generateWithTools({ messages, tools, config }) =>
//     Promise<{ text, toolCalls: [{ id, name, arguments }], latencyMs? }>,
//   used by the Phase 5 tool-calling loop. Policies must check capabilities
//   before relying on a provider behaviour; never assume every provider
//   supports tool calling.
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

// Provider capabilities (Phase 5). Capabilities are declared by each
// adapter and checked by policy code before a request relies on one.
// Never assume a provider supports a capability it did not declare.
const AI_CAPABILITIES = Object.freeze({
  CHAT: "chat",
  TOOL_CALLING: "toolCalling",
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

function getProviderNames() {
  return Array.from(providers.keys());
}

function getActiveProvider() {
  return getProvider(AI_CONFIG.provider);
}

// Capability reflection (Phase 5). Unknown/missing capability = absent
// (safe default: never treat an undeclared capability as available).
function getProviderCapabilities(name) {
  const provider = providers.get(name);
  return provider && provider.capabilities ? provider.capabilities : {};
}

function supportsToolCalling(name) {
  return !!getProviderCapabilities(name)[AI_CAPABILITIES.TOOL_CALLING];
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
  AI_CAPABILITIES,
  AiProviderError,
  register,
  getProvider,
  getProviderNames,
  getActiveProvider,
  getProviderCapabilities,
  supportsToolCalling,
  fetchWithTimeout,
  parseJson,
  userPetsText,
};