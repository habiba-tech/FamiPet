// =========================================================
// PetGPT bounded tool-calling loop (Phase 5)
// ---------------------------------------------------------
// The ONE place that drives a generateWithTools round-trip:
//
//   1. Pre-check capabilities (provider must declare toolCalling
//      and implement generateWithTools) and that the registry has
//      at least one tool.
//   2. Call adapter.generateWithTools with a caller-assembled
//      message array plus the registered tool declarations.
//   3. For each returned tool call: validate args against the tool
//      schema, run the tool's authorize() ownership gate, then
//      execute() — backend code only.
//   4. Append the model-safe assistant turn + tool results to the
//      message array as a new round and loop, bounded by
//      AI_CONFIG.tools.maxIterations.
//   5. On exhaustion or a provider error, STOP safely: return the
//      last real model text, never a fabricated final answer.
//
// Policy: the model can never invent tools, never touch another
// user's data, never decide the execution path, and never loop
// forever. Ownership is re-checked inside every tool by
// pet-context.requireOwnedPet — argument validation and
// authorization are NOT delegated to the prompt.
//
// The caller (the durable generation worker) supplies `messages`
// (system + history + current turn) and trusts this loop with the
// provider/tool side only; HTTP requests and tool execution happen
// here, inside the durable worker lifecycle, never in a controller.
// =========================================================

const { AI_CONFIG } = require("../config/ai");
const { supportsToolCalling } = require("./provider");
const { logEvent } = require("./logging");
const {
  listToolDeclarations,
  executeTool,
} = require("./tools/registry");

const MAX_ITERATIONS = () => AI_CONFIG.tools.maxIterations;

// Capability gate: a provider that did not declare toolCalling is never
// asked to run tools. false signals "tool path unavailable" — the caller
// keeps the plain generate() fallback. This keeps non-tool providers
// (e.g. Gemini) on the legacy single-turn path.
function canUseTools(providerName) {
  return supportsToolCalling(providerName);
}

// Cap on persisted tool-call metadata per assistant message. The loop
// may execute more calls in theory, but only this many are recorded —
// the log stays bounded (rounds x calls, truncated defensively).
const TOOL_CALLS_METADATA_MAX = 20;

// Tool metadata kept for history/debugging. Bounded: name + validated
// model-supplied arguments + success flag. Never stores API keys, auth
// headers, provider payloads, or raw results.
function toolLogEntry(call, outcome) {
  const entry = { name: call.name, ok: outcome && outcome.ok };
  if (!(outcome && outcome.ok)) entry.error = outcome && outcome.error ? outcome.error : null;
  if (call.arguments && typeof call.arguments === "object" && Object.keys(call.arguments).length) {
    entry.arguments = call.arguments;
  }
  return entry;
}

// Run one bounded tool-calling exchange. Returns:
//   { ok: true, text, toolLog }                                  — clean final answer
//   { ok: false, reason: "max_iterations", text, toolLog }       — cap hit (text may
//                                                                 be the last real
//                                                                 model text or null)
//   { ok: false, reason: "error", text }                         — provider failed mid-loop
//   { ok: false, reason: "no_tools" }                            — capability/declarations absent
// The caller compensates by persisting a safe outcome — never by
// fabricating a success the model did not confirm.
//
// options.jobId (Phase 6): the caller passes the durable GenerationJob
// id so mutation tools can key their idempotency ledger — a retried job
// replays its recorded mutation results instead of executing twice.
async function runToolCallingLoop({ adapter, config, messages, userId, options = {} }) {
  if (!adapter || !adapter.capabilities || !adapter.capabilities.toolCalling) {
    return { ok: false, reason: "no_tools" };
  }
  if (typeof adapter.generateWithTools !== "function") {
    return { ok: false, reason: "no_tools" };
  }

  const declarations = listToolDeclarations();
  if (!declarations.length) {
    return { ok: false, reason: "no_tools" };
  }
  const { jobId } = options;

  const toolLog = [];
  let lastText = null;

  for (let i = 0; i < MAX_ITERATIONS(); i++) {
    let response;
    try {
      response = await adapter.generateWithTools({ messages, tools: declarations, config });
    } catch (error) {
      const code = error && error.code ? error.code : "unknown";
      console.error(`PetGPT: tool round ${i + 1} provider failed (${code}): ${error && error.message ? error.message : "unknown"}`);
      return { ok: false, reason: "error", text: lastText };
    }
    if (!response) {
      return { ok: false, reason: "error", text: lastText };
    }

    if (response.toolCalls && response.toolCalls.length) {
      // Model requested tools. Every call is validated + ownership-checked
      // + executed by backend code. Unknown/malformed names fail safely
      // as tool results the model must report verbatim.
      messages.push({
        role: "assistant",
        content: typeof response.text === "string" ? response.text : null,
        tool_calls: response.toolCalls.map((c) => ({
          id: c.id || null,
          type: "function",
          function: { name: c.name, arguments: JSON.stringify(c.arguments || {}) },
        })),
      });

      for (const call of response.toolCalls) {
        const outcome = await executeTool(call.name, call.arguments, userId, { jobId });
        if (toolLog.length < TOOL_CALLS_METADATA_MAX) {
          toolLog.push(toolLogEntry(call, outcome));
        }
        logEvent("info", "petgpt.tool.executed", {
          userId: String(userId),
          tool: call.name,
          ok: outcome.ok,
          replayed: !!(outcome && outcome.replayed),
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id || null,
          content: JSON.stringify(outcome.ok ? outcome.result : { error: outcome.error }),
        });
      }

      lastText = typeof response.text === "string" ? response.text || lastText : lastText;
      continue;
    }

    // No tool call this round: real content — done.
    return { ok: true, text: response.text || lastText || null, toolLog };
  }

  // Bounded loop exhausted after real tool work. Safe stop: no
  // fabricated final answer. The last real model text is the best
  // result we have and is surfaced verbatim (never invented).
  return { ok: false, reason: "max_iterations", text: lastText, toolLog };
}

module.exports = {
  canUseTools,
  runToolCallingLoop,
  TOOL_CALLS_METADATA_MAX,
  toolLogEntry,
};