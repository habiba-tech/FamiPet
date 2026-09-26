// =========================================================
// Phase 6 — PetGPT mutation tool tests
// ---------------------------------------------------------
// Direct-layer tests (no HTTP, no worker), mirroring
// petgpt-tools.test.js:
//   * registration + declarations + readOnly flags
//   * create_reminder / complete_reminder success + persistence
//   * argument and enum validation (schema.js is types-only, so enum
//     checks live in tool execute — asserted here)
//   * ownership isolation and foreign/invalid IDs (no existence oracle)
//   * MutationEffect idempotency: same job + same args -> replay, no
//     second write; different job -> legitimate second action;
//     failed mutations leave NO ledger row; no jobId -> no ledger
//   * prompt-level mutation-confirm safety and enumeration
//   * no secret leakage in results, persisted docs, or declarations
// =========================================================

const assert = require("assert");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/animal_planet_petgpt_mutation_tools_test";
process.env.PETGPT_PROVIDER = "openai";
process.env.PETGPT_OPENAI_BASE_URL = "http://127.0.0.1:9/v1";
process.env.PETGPT_OPENAI_API_KEY = "sk-mutation-test";
process.env.PETGPT_OPENAI_MODEL = "test-model";
process.env.PETGPT_MAX_TOOL_ITERATIONS = "3";

require("../ai"); // registers adapters + all tools (read + mutation)
const User = require("../models/User");
const Pet = require("../models/Pet");
const Breed = require("../models/Breed");
const Reminder = require("../models/Reminder");
const MutationEffect = require("../models/MutationEffect");
const { executeTool, getTool, listToolNames, listToolDeclarations } = require("../ai/tools");
const { buildSystemPrompt } = require("../config/ai");
const { REMINDER_TYPES, REMINDER_FREQUENCIES, normalizeCreatedReminder } = require("../ai/tools/mutation-tools");

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await MutationEffect.init();

  const alice = await User.create({ name: "Alice", email: "mut-alice@test.dev", password: "Test1234!" });
  const bob = await User.create({ name: "Bob", email: "mut-bob@test.dev", password: "Test1234!" });
  const breed = await Breed.create({ name: "Labrador", species: "dog" });
  const rex = await Pet.create({ owner: alice._id, breed: breed._id, name: "Rex", species: "dog", gender: "male", age: 3 });

  // ---- 1. registration / declarations / readOnly flags -----------------
  const names = listToolNames();
  for (const expected of ["create_reminder", "complete_reminder"]) {
    assert.ok(names.includes(expected), `tool "${expected}" registered`);
  }
  const decls = listToolDeclarations();
  const createDecl = decls.find((d) => d.function && d.function.name === "create_reminder");
  assert.ok(createDecl, "create_reminder has a provider declaration");
  assert.deepStrictEqual(createDecl.function.parameters.required, ["petId", "title", "type", "date", "time"], "create_reminder requires its mandatory args");
  assert.ok(createDecl.function.description.includes("Confirms"), "create_reminder description tells the model to confirm first");
  assert.strictEqual(getTool("create_reminder").readOnly, false, "create_reminder is flagged as a mutation");
  assert.strictEqual(getTool("complete_reminder").readOnly, false, "complete_reminder is flagged as a mutation");
  assert.strictEqual(getTool("get_my_pets").readOnly, true, "read tools stay flagged read-only");
  ok("mutations: both mutation tools registered as readOnly:false alongside read tools");

  // ---- 2. create_reminder success + persistence -------------------------
  const cArgs = {
    petId: rex._id.toString(),
    title: "Morning walk",
    type: "exercise",
    description: "Around the park",
    date: "2026-10-31",
    time: "08:30",
    frequency: "daily",
  };
  const c = await executeTool("create_reminder", cArgs, alice._id, { jobId: new mongoose.Types.ObjectId() });
  assert.strictEqual(c.ok, true, "create_reminder succeeds");
  assert.strictEqual(c.result.reminder.title, "Morning walk", "result carries the created reminder");
  assert.strictEqual(c.result.reminder.petId.toString(), rex._id.toString(), "result scopes the reminder to the pet");
  assert.strictEqual(c.result.reminder.frequency, "daily");
  assert.strictEqual(c.result.reminder.isCompleted, false, "new reminders start incomplete");
  const doc = await Reminder.findById(c.result.reminder.id).lean();
  assert.ok(doc, "reminder persisted in FamiPet data");
  assert.strictEqual(doc.user.toString(), alice._id.toString(), "reminder owned by the caller");
  ok("mutations: create_reminder writes a real reminder owned by the caller");

  // ---- 3. argument + enum validation ------------------------------------
  const missing = await executeTool("create_reminder", { petId: rex._id.toString(), title: "x", type: "feeding", date: "2026-01-01" }, alice._id);
  assert.strictEqual(missing.ok, false, "missing time rejected");
  assert.ok(missing.error.includes("Missing required argument"), `missing required arg: ${missing.error}`);

  const badType = await executeTool("create_reminder", { ...cArgs, type: "meditation" }, alice._id);
  assert.strictEqual(badType.ok, false, "unknown enum type rejected");
  assert.ok(badType.error.includes(REMINDER_TYPES.join(", ")), "enum error lists the allowed types");

  const badFreq = await executeTool("create_reminder", { ...cArgs, frequency: "yearly" }, alice._id);
  assert.strictEqual(badFreq.ok, false, "unknown frequency rejected");
  assert.ok(badFreq.error.includes(REMINDER_FREQUENCIES.join(", ")), "enum error lists the allowed frequencies");

  const badDate = await executeTool("create_reminder", { ...cArgs, date: "not-a-date" }, alice._id);
  assert.strictEqual(badDate.ok, false, "invalid date rejected");

  const badId = await executeTool("complete_reminder", { reminderId: "not-an-object-id" }, alice._id);
  assert.strictEqual(badId.ok, false, "malformed reminderId rejected as invalid_arguments");
  assert.ok(badId.error.includes("valid reminder ID"), `malformed id error: ${badId.error}`);

  const badFreqArg = await executeTool("create_reminder", { ...cArgs, frequency: 42 }, alice._id);
  assert.strictEqual(badFreqArg.ok, false, "non-string frequency rejected by schema types");
  ok("mutations: missing args, enum values, dates, and malformed ids all rejected");

  // ---- 4. ownership isolation -------------------------------------------
  const foreign = await executeTool("create_reminder", cArgs, bob._id);
  assert.strictEqual(foreign.ok, false, "bob cannot create a reminder on alice's pet");
  assert.ok(foreign.error.includes("not found or not owned"), `foreign pet rejected: ${foreign.error}`);

  const fakePet = await executeTool("create_reminder", { ...cArgs, petId: "000000000000000000000000" }, alice._id);
  assert.strictEqual(fakePet.ok, false, "unknown pet rejected");
  assert.strictEqual(fakePet.error, foreign.error, "foreign and unknown pets fail with the same message (no existence leak)");

  const completeForeign = await executeTool("complete_reminder", { reminderId: doc._id.toString() }, bob._id);
  assert.strictEqual(completeForeign.ok, false, "bob cannot complete alice's reminder");
  assert.ok(completeForeign.error.includes("not found or not owned"), "foreign reminder rejected");

  const completeUnknown = await executeTool("complete_reminder", { reminderId: "000000000000000000000000" }, alice._id);
  assert.strictEqual(completeUnknown.ok, false, "unknown reminder rejected");
  assert.strictEqual(completeUnknown.error, completeForeign.error, "foreign and unknown reminders fail identically");
  ok("mutations: ownership re-checked per call; foreign/invalid pers exposable");

  // ---- 5. complete_reminder success + result truth ----------------------
  const comp = await executeTool("complete_reminder", { reminderId: doc._id.toString() }, alice._id, { jobId: new mongoose.Types.ObjectId() });
  assert.strictEqual(comp.ok, true, "complete_reminder succeeds for the owner");
  assert.strictEqual(comp.result.reminder.isCompleted, true, "result truthfully reports the completed status");
  const completedDoc = await Reminder.findById(doc._id).lean();
  assert.strictEqual(completedDoc.isCompleted, true, "reminder really updated in FamiPet data");
  ok("mutations: complete_reminder only flips status, reports the verified record");

  // ---- 6. idempotency ledger: same job replays, never re-executes -------
  const jobA = new mongoose.Types.ObjectId();
  const mArgs = { title: "Pill time", type: "medicine", date: "2026-11-01", time: "09:00", petId: rex._id.toString() };
  const first = await executeTool("create_reminder", mArgs, alice._id, { jobId: jobA });
  assert.strictEqual(first.ok, true);
  const firstId = first.result.reminder.id;

  const replay = await executeTool("create_reminder", mArgs, alice._id, { jobId: jobA });
  assert.strictEqual(replay.ok, true, "replay still succeeds");
  assert.strictEqual(replay.replayed, true, "re-execution of the same job+args is flagged as a replay");
  assert.strictEqual(replay.result.reminder.id.toString(), firstId.toString(), "replay returns the recorded result verbatim");

  assert.strictEqual(await Reminder.countDocuments({ _id: { $in: [firstId] } }), 1, "same job+args created the reminder exactly once");
  assert.strictEqual(await Reminder.countDocuments({ title: "Pill time" }), 1, "no duplicate reminder on replay");

  // Reordered args produce the SAME key (stable stringify).
  const reordered = { petId: rex._id.toString(), title: "Pill time", type: "medicine", time: "09:00", date: "2026-11-01" };
  const replayOrdered = await executeTool("create_reminder", reordered, alice._id, { jobId: jobA });
  assert.strictEqual(replayOrdered.replayed, true, "arg ordering does not change the idempotency key");

  // A DIFFERENT job with the same args is a legitimate second execution.
  const jobB = new mongoose.Types.ObjectId();
  const second = await executeTool("create_reminder", mArgs, alice._id, { jobId: jobB });
  assert.strictEqual(second.ok, true);
  assert.ok(!second.replayed, "different job runs the mutation again");
  assert.strictEqual(await Reminder.countDocuments({ title: "Pill time" }), 2, "distinct job = distinct reminder");

  assert.strictEqual(await MutationEffect.countDocuments({ owner: alice._id }), 4, "ledger rows exist for all recorded mutations");
  ok("mutations: ledger replays same job+args, allows distinct jobs, is ordering-stable");

  // ---- 7. failed mutations leave NO ledger row (retry still allowed) ----
  const jobC = new mongoose.Types.ObjectId();
  const failing = await executeTool("create_reminder", mArgs, bob._id, { jobId: jobC });
  assert.strictEqual(failing.ok, false, "bob's foreign-pet mutation fails");
  assert.strictEqual(await MutationEffect.countDocuments({ job: jobC }), 0, "no ledger row for a failed mutation");
  const retry = await executeTool("create_reminder", mArgs, bob._id, { jobId: jobC });
  assert.strictEqual(retry.ok, false, "a failed mutation can be retried (not blocked by a stale ledger row)");
  assert.strictEqual(await MutationEffect.countDocuments({ job: jobC }), 0, "still no ledger row after retry failure");
  ok("mutations: success-only ledger keeps failed mutations retryable");

  // ---- 8. no jobId -> mutation runs without the ledger --------------------
  const hot = await executeTool("create_reminder", mArgs, alice._id);
  assert.strictEqual(hot.ok, true, "mutation still works without a job context");
  assert.ok(!hot.replayed, "no replay flag without an idempotency context");
  assert.strictEqual(await MutationEffect.countDocuments({ job: undefined }), 0, "no ledger row when no job is in context");
  ok("mutations: ledger engages only when the durable job context is present");

  // ---- 9. prompt-level mutation safety ----------------------------------
  const prompt = buildSystemPrompt();
  assert.ok(prompt.includes("confirm"), "system prompt requires model-side confirmation before mutations");
  assert.ok(prompt.includes("mutation"), "system prompt names the mutation class");
  ok("mutations: system prompt carries confirm-first mutation guardrails");

  // ---- 10. normalizeCreatedReminder is bounded + secret-free --------------
  const n = normalizeCreatedReminder(doc);
  assert.strictEqual(typeof n.id, "object", "normalized reminder carries its id");
  assert.ok(!JSON.stringify(n).includes("apiKeyEnc"), "normalization never leaks stored-config secrets");
  const allDocs = JSON.stringify(await Reminder.find().lean()) + JSON.stringify(await MutationEffect.find().lean()) + JSON.stringify(decls);
  for (const secret of ["sk-mutation-test", "apiKeyEnc"]) {
    assert.ok(!allDocs.includes(secret), `persisted docs + declarations never contain ${secret}`);
  }
  ok("mutations: persisted reminder/ledger/declarations stay secret-free");

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(`\n✅ petgpt-mutation-tools.test.js — passed (${passed} checks)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});