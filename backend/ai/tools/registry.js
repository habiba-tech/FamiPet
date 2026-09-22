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

const { validateArgs } = require("./schema");

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

// Executes a registered tool against the authenticated userId. Returns
// { ok: true, result } on success, or { ok: false, error } for
// not-found / invalid-args / authorization / execution failures. Error
// strings are model-safe and never leak another user's data or internals.
async function executeTool(name, args, userId) {
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