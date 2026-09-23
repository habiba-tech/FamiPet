// =========================================================
// PetGPT tool argument validation (Phase 5)
// ---------------------------------------------------------
// Deliberately tiny JSON-schema subset for the controlled tool
// contract: { type: "object", properties: { key: { type } }, required: [] }.
// Types accepted: "string" | "number" | "integer" | "boolean" | "array" |
// "object". Unknown arguments are rejected (strict), so a model cannot
// smuggle extra fields past a tool's contract. No schema library needed.
// =========================================================

function typeOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function matchesType(value, type) {
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeOf(value) === type;
}

// Returns { error: string } or { error: null }.
function validateArgs(schema, args) {
  if (!schema || typeof schema !== "object") {
    return { error: "Tool has no schema." };
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { error: "Tool arguments must be an object." };
  }

  const properties = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];

  for (const key of Object.keys(args)) {
    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
      return { error: `Unknown argument "${key}".` };
    }
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) {
      return { error: `Missing required argument "${key}".` };
    }
  }

  for (const [key, spec] of Object.entries(properties)) {
    if (!Object.prototype.hasOwnProperty.call(args, key)) continue;
    if (!spec || !spec.type) continue;
    if (!matchesType(args[key], spec.type)) {
      return { error: `Argument "${key}" must be of type "${spec.type}".` };
    }
  }

  return { error: null };
}

module.exports = { validateArgs };