// =========================================================
// PetGPT tool registry (Phase 5)
// ---------------------------------------------------------
// The only way the model can touch FamiPet data. Every tool is explicitly
// registered here with a stable name, description, input schema, an
// execution function, its read-only/mutating flag and authorization. The
// model can never discover or invent tools; it may only call registered
// names with schema-valid arguments, and every execution re-validates
// ownership against the authenticated user.
//
// Tool execution NEVER executes arbitrary backend code — each tool's
// execute() is a closed implementation that calls existing FamiPet
// service/data logic. No arbitrary controller/service methods are exposed.
// =========================================================

const crypto = require("crypto");
const { validateArgs } = require("./schema");
const MutationEffect = require("../../models/MutationEffect");
const { logEvent } = require("../logging");

const TOOL_ERRORS = Object.freeze({
  NOT_FOUND: "tool_not_found",
  ARGS: "invalid_arguments",
  FORBIDDEN: "forbidden",
  EXECUTION: "execution_error",
});

class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ToolError";
    this.code = code;
  }
}

const tools = new Map();

// tool: { name, description, schema, readOnly, authorize?({args,userId})->null|args,
//         execute({args,userId}) -> Promise<result>, }
function registerTool(tool) {
  if (!tool || !tool.name || !tool.execute) {
    throw new ToolError(TOOL_ERRORS.EXECUTION, "Tool requires name and execute().");
  }
  if (tools.has(tool.name)) {
    throw new ToolError(TOOL_ERRORS.EXECUTION, `Tool "${tool.name}" is already registered.`);
  }
  tools.set(tool.name, {
    name: tool.name,
    description: tool.description || "",
    schema: tool.schema || { type: "object", properties: {}, required: [] },
    readOnly: tool.readOnly !== false,
    authorize: tool.authorize || null,
    execute: tool.execute,
  });
}

function getTool(name) {
  return tools.get(name);
}

// Provider-facing declarations (OpenAI function-calling shape).
function listToolDeclarations() {
  return Array.from(tools.values()).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    },
  }));
}

function listToolNames() {
  return Array.from(tools.keys());
}

// Determinstic stringification for idempotency keys: object keys are
// sorted so {a:1,b:2} and {b:2,a:1} share a key.
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

// Server-derived mutation idempotency key: sha256(jobId:tool:normalizedArgs).
// The durable GenerationJob id makes a retried/re-enqueued job replay its
// recorded result instead of executing the mutation twice, while still
// allowing the same tool with different arguments (or a different job) to
// run as a separate, legitimate action. The key is never client/model-supplied.
function mutationKey(jobId, toolName, args) {
  return crypto
    .createHash("sha256")
    .update(`${jobId}:${toolName}:${stableStringify(args)}`)
    .digest("hex");
}

// Executes a registered tool against the authenticated userId. Returns
// { ok: true, result } on success, or { ok: false, error } for
// not-found / invalid-args / authorization / execution failures. Error
// strings are model-safe and never leak another user's data or internals.
//
// context.jobId (Phase 6): when present and the tool is a mutation
// (readOnly: false), the call is gated by the MutationEffect ledger — a
// previously recorded (owner, key) result is replayed verbatim, never
// executed again. Success is only recorded after the mutation actually
// succeeded, so a failed mutation can still be retried.
async function executeTool(name, args, userId, context = {}) {
  const tool = tools.get(name);
  if (!tool) return { ok: false, error: "The requested tool is not available." };

  const validation = validateArgs(tool.schema, args);
  if (validation.error) return { ok: false, error: validation.error };

  try {
    let scopedArgs = args;
    if (tool.authorize) scopedArgs = await tool.authorize({ args, userId });
    // authorize may return null to signal denial.
    if (scopedArgs === null) {
      return { ok: false, error: "The requested operation is not allowed." };
    }
    if (!tool.readOnly && context.jobId) {
      const key = mutationKey(context.jobId, name, scopedArgs);
      const prior = await MutationEffect.findOne({ owner: userId, key }).lean();
      if (prior) {
        logEvent("info", "petgpt.tool.replayed", { userId: String(userId), tool: name });
        // The original execution really succeeded; replaying its recorded
        // result is truthful, not fabricated.
        return { ok: true, result: prior.result, replayed: true };
      }
      const result = await tool.execute({ args: scopedArgs, userId });
      // Record only after the backend write verified — a failed mutation
      // leaves no ledger row so a retry is still allowed.
      await MutationEffect.create({ owner: userId, job: context.jobId, tool: name, key, result });
      return { ok: true, result };
    }
    const result = await tool.execute({ args: scopedArgs, userId });
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ToolError) {
      return { ok: false, error: error.message };
    }
    console.error(`PetGPT: tool "${name}" execution failed:`, error.message);
    return { ok: false, error: "The operation failed. Its result is unknown." };
  }
}

module.exports = {
  TOOL_ERRORS,
  ToolError,
  registerTool,
  getTool,
  listToolDeclarations,
  listToolNames,
  executeTool,
};