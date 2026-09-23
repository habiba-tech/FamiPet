// =========================================================
// Phase 5 — PetGPT tool registry + bounded tool-calling loop tests
// ---------------------------------------------------------
// Runs the Phase 5 tool layer directly (no HTTP router, no worker):
//   * registration + declarations + names
//   * valid / invalid / unknown tool calls, argument validation
//   * ownership isolation and foreign-pet rejection
//   * bounded loop iterations and bounded tool-call metadata
//   * provider-failure mapping, non-tool-provider gate
//   * no secret leakage in tool results or metadata
//
// Uses a dedicated test database on the locally running MongoDB.
// The provider registry is populated by requiring backend/ai (the same
// require path the worker/server use), so canUseTools reflects real
// capabilities.
// =========================================================

const assert = require("assert");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/animal_planet_petgpt_tools_test";
process.env.PETGPT_PROVIDER = "openai";
process.env.PETGPT_OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.PETGPT_OPENAI_API_KEY = "sk-tools-test";
process.env.PETGPT_OPENAI_MODEL = "test-model";
process.env.PETGPT_MAX_TOOL_ITERATIONS = "3";
process.env.PETGPT_TOOL_MAX_RESULTS = "10";

require("../ai"); // registers adapters (gemini, openai) like server.js does
const User = require("../models/User");
const Pet = require("../models/Pet");
const Breed = require("../models/Breed");
const {
  canUseTools,
  runToolCallingLoop,
  TOOL_CALLS_METADATA_MAX,
} = require("../ai/tool-calling");
const {
  registerTool,
  listToolNames,
  listToolDeclarations,
  executeTool,
} = require("../ai/tools");
const { buildProviderMessages } = require("../ai/context");
const { buildSystemPrompt } = require("../config/ai");

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

function fakeAdapter(script) {
  let i = 0;
  return {
    name: "openai",
    capabilities: { chat: true, toolCalling: true },
    async generateWithTools() {
      const r = script[i++];
      if (r === "throw") throw new Error("provider exploded");
      return r;
    },
  };
}

const makeMessages = () =>
  buildProviderMessages({ system: buildSystemPrompt(), history: [], petContext: [{ name: "Rex", species: "dog" }], question: "list my pets" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();

  const alice = await User.create({ name: "Alice", email: "tools-alice@test.dev", password: "Test1234!" });
  const bob = await User.create({ name: "Bob", email: "tools-bob@test.dev", password: "Test1234!" });
  const breed = await Breed.create({ name: "Labrador", species: "dog" });
  const rex = await Pet.create({ owner: alice._id, breed: breed._id, name: "Rex", species: "dog", gender: "male", age: 3 });
  await Pet.create({ owner: bob._id, breed: breed._id, name: "Max", species: "dog", gender: "male", age: 5 });

  // ---- 1. registration / declarations -----------------------------------
  const names = listToolNames();
  for (const expected of ["get_my_pets", "get_pet_details", "get_pet_health", "get_pet_vaccinations", "get_pet_appointments", "get_pet_reminders"]) {
    assert.ok(names.includes(expected), `tool "${expected}" registered`);
  }
  const decls = listToolDeclarations();
  assert.ok(decls.length >= 6, "declarations include every registered tool");
  const getPetsDecl = decls.find((d) => d.function && d.function.name === "get_my_pets");
  assert.ok(getPetsDecl, "get_my_pets has a provider declaration");
  assert.strictEqual(getPetsDecl.type, "function", "declaration is OpenAI function shape");
  assert.ok(typeof getPetsDecl.function.description === "string" && getPetsDecl.function.description.length > 0, "declaration has a description");
  assert.deepStrictEqual(getPetsDecl.function.parameters, { type: "object", properties: {}, required: [] }, "get_my_pets takes no arguments");
  ok("tools: registry registers all read tools with OpenAI function declarations");

  // ---- 2. valid tool call -----------------------------------------------
  const r = await executeTool("get_my_pets", {}, alice._id);
  assert.strictEqual(r.ok, true, "get_my_pets succeeds");
  assert.ok(Array.isArray(r.result.pets), "result carries a pets array");
  assert.strictEqual(r.result.pets.length, 1);
  assert.strictEqual(r.result.pets[0].name, "Rex");
  assert.strictEqual(r.result.pets[0].id.toString(), rex._id.toString(), "normalized pet carries its id");
  assert.ok(!JSON.stringify(r.result).includes("apiKeyEnc"), "tool result never carries stored-config secrets");
  assert.ok(!JSON.stringify(r.result).includes("owner"), "normalized pets never leak owner refs");
  ok("tools: get_my_pets returns the caller's own normalized pets, no secrets");

  // ---- 3. unknown tool ---------------------------------------------------
  const bad = await executeTool("nuke_all", {}, alice._id);
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.error.includes("not available"), `unknown tool denied: ${bad.error}`);
  ok("tools: unknown tool rejected");

  // ---- 4. argument validation --------------------------------------------
  const missing = await executeTool("get_pet_details", {}, alice._id);
  assert.strictEqual(missing.ok, false);
  assert.ok(missing.error.includes("Missing required argument"), `missing petId rejected: ${missing.error}`);

  const wrongType = await executeTool("get_pet_details", { petId: 12345 }, alice._id);
  assert.strictEqual(wrongType.ok, false);
  assert.ok(wrongType.error.includes('must be of type "string"'), `wrong type rejected: ${wrongType.error}`);

  const unknownArg = await executeTool("get_pet_details", { petId: rex._id.toString(), extra: "sneak" }, alice._id);
  assert.strictEqual(unknownArg.ok, false);
  assert.ok(unknownArg.error.includes('Unknown argument "extra"'), `unknown argument rejected: ${unknownArg.error}`);
  ok("tools: missing / wrong-typed / unknown arguments rejected");

  // ---- 5. ownership isolation --------------------------------------------
  const foreign = await executeTool("get_pet_details", { petId: rex._id.toString() }, bob._id);
  assert.strictEqual(foreign.ok, false, "bob cannot read alice's pet");
  assert.ok(foreign.error.includes("not found or not owned"), `foreign pet rejected identically: ${foreign.error}`);

  const fakeId = await executeTool("get_pet_details", { petId: "000000000000000000000000" }, alice._id);
  assert.strictEqual(fakeId.ok, false, "nonexistent pet rejected");
  assert.strictEqual(fakeId.error, foreign.error, "foreign and unknown pets fail with the same message (no existence leak)");

  const own = await executeTool("get_pet_details", { petId: rex._id.toString() }, alice._id);
  assert.strictEqual(own.ok, true, "alice can read her own pet");
  assert.strictEqual(own.result.pet.name, "Rex");
  ok("tools: ownership re-checked per call; foreign/invalid pets indistinguishable");

  // ---- 6. capability gates -----------------------------------------------
  assert.strictEqual(canUseTools("openai"), true, "openai declares tool calling");
  assert.strictEqual(canUseTools("google"), false, "gemini does not declare tool calling");
  const chatOnly = { name: "google", capabilities: { chat: true }, generateWithTools: async () => ({ text: "x" }) };
  const gate = await runToolCallingLoop({ adapter: chatOnly, config: {}, messages: makeMessages(), userId: alice._id });
  assert.strictEqual(gate.reason, "no_tools", "loop refuses a non-tool provider");
  ok("tools: capability gates keep chat-only providers off the tool path");

  // ---- 7. bounded loop iterations ----------------------------------------
  const boundedScript = [];
  for (let i = 0; i < 10; i++) boundedScript.push({ text: "", toolCalls: [{ id: `c${i}`, name: "get_my_pets", arguments: {} }] });
  let calls = 0;
  const alwaysTools = fakeAdapter(boundedScript);
  alwaysTools.generateWithTools = async () => { calls++; return { text: "", toolCalls: [{ id: `c${calls}`, name: "get_my_pets", arguments: {} }] }; };
  const r7 = await runToolCallingLoop({ adapter: alwaysTools, config: {}, messages: makeMessages(), userId: alice._id });
  assert.strictEqual(calls, 3, "loop stopped exactly at AI_CONFIG.tools.maxIterations=3");
  assert.strictEqual(r7.ok, false);
  assert.strictEqual(r7.reason, "max_iterations");
  assert.ok(!r7.text, "no fabricated final answer on exhaustion");
  ok("tools: provider that never finishes is bounded at maxIterations with no fabricated text");

  // ---- 8. bounded tool-call metadata --------------------------------------
  const manyCalls = { name: "openai", capabilities: { chat: true, toolCalling: true }, generateWithTools: async () => ({
    text: "",
    toolCalls: Array.from({ length: 25 }, (_, i) => ({ id: `m${i}`, name: "get_my_pets", arguments: {} })),
  }) };
  const r8 = await runToolCallingLoop({ adapter: manyCalls, config: {}, messages: makeMessages(), userId: alice._id });
  assert.strictEqual(r8.reason, "max_iterations", "one huge round still respects iteration bounds");
  assert.ok(r8.toolLog.length <= TOOL_CALLS_METADATA_MAX, `metadata bounded at ${TOOL_CALLS_METADATA_MAX} (was ${r8.toolLog.length})`);
  for (const entry of r8.toolLog) {
    assert.ok(entry.name === "get_my_pets", "metadata entry names the executed tool");
    assert.strictEqual(typeof entry.ok, "boolean", "metadata entry records success");
  }
  assert.ok(!JSON.stringify(r8.toolLog).includes("sk-tools-test"), "metadata never contains the API key");
  ok("tools: tool-call metadata stays bounded and secret-free");

  // ---- 9. tool error result feeds the model ---------------------------------
  const r9 = await runToolCallingLoop({
    adapter: fakeAdapter([
      { text: "", toolCalls: [{ id: "u", name: "get_pet_details", arguments: { petId: rex._id.toString() } }, { id: "v", name: "ghost_tool", arguments: {} }] },
      { text: "I could not find that.", toolCalls: [] },
    ]),
    config: {},
    messages: makeMessages(),
    userId: bob._id,
  });
  assert.strictEqual(r9.ok, true);
  assert.strictEqual(r9.text, "I could not find that.");
  assert.strictEqual(r9.toolLog.length, 2, "both calls recorded");
  assert.strictEqual(r9.toolLog[0].ok, false, "bob's foreign-pet call failed at the ownership gate");
  assert.strictEqual(r9.toolLog[1].ok, false, "unknown tool call failed safely");
  ok("tools: per-tool failures become model-safe results, never fabricated success");

  // ---- 10. provider error mid-round ----------------------------------------
  const r10 = await runToolCallingLoop({
    adapter: fakeAdapter([{ text: "let me check", toolCalls: [{ id: "c", name: "get_my_pets", arguments: {} }] }, "throw"]),
    config: {},
    messages: makeMessages(),
    userId: alice._id,
  });
  assert.strictEqual(r10.ok, false);
  assert.strictEqual(r10.reason, "error", "provider transport failure aborts the loop");
  assert.strictEqual(r10.text, "let me check", "last real model text is reported for the log, never invented");
  ok("tools: provider failure mid-tool-round aborts safely");

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(`\n✅ petgpt-tools.test.js — passed (${passed} checks)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});