// =========================================================
// OpenAI-compatible provider adapter (name: "openai")
// ---------------------------------------------------------
// Standard chat-completions contract: POST {baseUrl}/chat/completions
// with Authorization: Bearer <key>. Works with any endpoint that
// speaks this dialect (direct OpenAI, OmniRoute, vLLM, LM Studio,
// local proxies, etc.). No provider-specific SDK is used.
// =========================================================

const { AI_CONFIG } = require("../config/ai");
const {
  AI_ERROR_CODES,
  AiProviderError,
  fetchWithTimeout,
  parseJson,
  userPetsText,
} = require("./provider");

const name = "openai";

async function generate({ system, question, petContext }) {
  const { baseUrl, apiKey, model } = AI_CONFIG.openai;

  if (!baseUrl || !apiKey) {
    throw new AiProviderError(
      AI_ERROR_CODES.CONFIG,
      "OpenAI-compatible provider requires PETGPT_OPENAI_BASE_URL and PETGPT_OPENAI_API_KEY"
    );
  }
  if (!model) {
    throw new AiProviderError(
      AI_ERROR_CODES.CONFIG,
      "OpenAI-compatible provider requires PETGPT_OPENAI_MODEL"
    );
  }

  const startedAt = Date.now();
  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPetsText(petContext) + "User asks: " + question },
        ],
        stream: false,
      }),
    },
    AI_CONFIG.timeoutMs
  );

  if (!response.ok) {
    throw new AiProviderError(AI_ERROR_CODES.HTTP, `OpenAI-compatible HTTP ${response.status}`, {
      status: response.status,
    });
  }

  const data = await parseJson(response);
  const choice = data && data.choices && data.choices[0];
  const content = choice && choice.message && choice.message.content;
  const text = typeof content === "string" && content.trim() ? content.trim() : "";

  if (!text) {
    throw new AiProviderError(AI_ERROR_CODES.MALFORMED, "OpenAI-compatible provider returned no assistant text");
  }

  return { text, latencyMs: Date.now() - startedAt };
}

module.exports = { name, generate };