// =========================================================
// Gemini provider adapter (name: "google")
// ---------------------------------------------------------
// Preserves the pre-Phase-1 Gemini implementation: same
// endpoint, same request body shape, same config inputs
// (GEMINI_API_KEY, PETGPT_MODEL), same normalized failure
// modes via the shared provider layer.
// =========================================================

const { AI_CONFIG } = require("../config/ai");
const {
  AI_ERROR_CODES,
  AiProviderError,
  fetchWithTimeout,
  parseJson,
  userPetsText,
} = require("./provider");

const name = "google";

async function generate({ system, question, petContext, history = [] }) {
  const apiKey = AI_CONFIG.gemini.apiKey;
  if (!apiKey) {
    throw new AiProviderError(AI_ERROR_CODES.CONFIG, "no GEMINI_API_KEY configured");
  }

  const startedAt = Date.now();
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.gemini.model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          ...history.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          { parts: [{ text: userPetsText(petContext) + "User asks: " + question }] },
        ],
      }),
    },
    AI_CONFIG.timeoutMs
  );

  if (!response.ok) {
    throw new AiProviderError(AI_ERROR_CODES.HTTP, `Gemini HTTP ${response.status}`, {
      status: response.status,
    });
  }

  const data = await parseJson(response);
  const text =
    data && data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map((p) => p.text).filter(Boolean).join(" ").trim()
      : "";

  if (!text) {
    throw new AiProviderError(AI_ERROR_CODES.MALFORMED, "Gemini returned no text");
  }

  return { text, latencyMs: Date.now() - startedAt };
}

module.exports = { name, generate };