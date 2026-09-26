// =========================================================
// PetGPT provider configuration (Phase 3) — assert-based checks.
// Run: node test/provider-config.test.js
// Requires a reachable MongoDB (default localhost:27017 test DB).
// Uses a real local mock OpenAI-compatible HTTP endpoint to prove the
// configured provider is actually used by the conversation flow.
// Covers: encryption, CRUD, validation, ownership isolation, active
// selection, disabled behavior, test endpoint, no-secret leakage.
// =========================================================

const assert = require("assert");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const DB_NAME = "animal_planet_petgpt_provider_cfg_test";
const URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;

const ENCRYPTION_KEY = "petgpt-provider-cfg-test-encryption-key";
const API_KEY = "sk-alice-plaintext-secret";
const MOCK_ANSWER = "configured-mock-provider answer";
const PROVIDER_NAME = "Alice OpenAI";
let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

// System env: default google provider without a key -> deterministic
// canned fallback for the env/fallback path. Cleared so an ambient
// PETGPT_OPENAI_*/GEMINI_API_KEY cannot mask the fallback path.
for (const k of ["PETGPT_PROVIDER", "GEMINI_API_KEY", "PETGPT_OPENAI_BASE_URL", "PETGPT_OPENAI_API_KEY", "PETGPT_OPENAI_MODEL"]) {
  if (k in process.env) delete process.env[k];
}
process.env.JWT_SECRET = "petgpt-provider-cfg-test-secret";
process.env.PETGPT_ENCRYPTION_KEY = ENCRYPTION_KEY;

const { AI_CONFIG } = require("../config/ai");
const { fallbackAnswer } = require("../controllers/ai.controller");
const { encryptSecret, decryptSecret } = require("../utils/cipher");

// Mock OpenAI-compatible endpoint that records every request body.
let mockMode = "ok";
const requests = [];
const mock = http.createServer((req, res) => {
  res.on("error", () => {});
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    let body = null;
    try { body = JSON.parse(raw); } catch (e) { /* ignore */ }
    requests.push({ mode: mockMode, messages: body ? body.messages : null });
    if (mockMode === "http500") {
      res.statusCode = 500;
      res.end("boom");
    } else {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ choices: [{ message: { content: MOCK_ANSWER } }] }));
    }
  });
});

(async () => {
  await new Promise((resolve, reject) => {
    mock.once("error", reject);
    mock.listen(0, "127.0.0.1", resolve);
  });
  const mockBase = `http://127.0.0.1:${mock.address().port}`;

  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/ai", require("../routes/ai.routes"));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const { startWorker, stopWorker } = require("../jobs/generation.worker");
  startWorker();

  const User = require("../models/User");
  const AiProvider = require("../models/AiProvider");
  const GenerationJob = require("../models/GenerationJob");
  const Conversation = require("../models/Conversation");
  const Message = require("../models/Message");

  await GenerationJob.init(); // rebuild unique idempotency index after drop

  const [alice, bob] = await Promise.all([
    User.create({ name: "Phase3 Alice", email: "phase3-a@test.dev", password: "testpass123" }),
    User.create({ name: "Phase3 Bob", email: "phase3-b@test.dev", password: "testpass123" }),
  ]);
  const aliceTok = jwt.sign({ id: alice._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const bobTok = jwt.sign({ id: bob._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const logLines = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => { logLines.push(a.join(" ")); origLog(...a); };
  console.error = (...a) => { logLines.push(a.join(" ")); origErr(...a); };

  async function api(method, path, token, body) {
    const res = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* ignore */ }
    return { status: res.status, data };
  }
  const jsonOf = (x) => JSON.stringify(x);
  const assertNoSecret = (payload, where) => {
    assert.ok(!jsonOf(payload).includes(API_KEY), `plaintext API key not in ${where}`);
    assert.ok(!jsonOf(payload).includes("apiKeyEnc"), `apiKeyEnc not exposed in ${where}`);
  };

  const provPath = "/api/ai/providers";

  // Phase 4: poll a durable generation job to its terminal state.
  async function awaitJob(token, jobId) {
    const started = Date.now();
    while (Date.now() - started < 20000) {
      const r = await api("GET", `/api/ai/jobs/${jobId}`, token);
      assert.strictEqual(r.status, 200, "job status readable while running");
      if (["completed", "failed"].includes(r.data.job.status)) return r.data;
      await new Promise((s) => setTimeout(s, 40));
    }
    throw new Error(`job ${jobId} not terminal in time`);
  }

  // ---- Encryption unit checks ---------------------------------------
  {
    const enc = encryptSecret(API_KEY);
    assert.strictEqual(typeof enc, "string", "ciphertext is a string");
    assert.ok(enc !== API_KEY, "ciphertext differs from plaintext");
    assert.ok(!enc.includes(API_KEY), "ciphertext does not embed the plaintext");
    assert.strictEqual(decryptSecret(enc), API_KEY, "round-trip decrypts to the plaintext");
    assert.strictEqual(enc.split(":").length, 3, "iv:tag:ciphertext shape");
    assert.throws(() => decryptSecret("invalid-format"), /Invalid stored secret/, "bad format fails safely");
    assert.throws(() => encryptSecret(""), /empty secret/, "empty plaintext rejected");
    ok("encryption: AES-256-GCM round-trip; stored value is ciphertext, not plaintext");
  }
  {
    const blob = encryptSecret(API_KEY); // encrypted under ENCRYPTION_KEY
    process.env.PETGPT_ENCRYPTION_KEY = "wrong-key-for-this-blob";
    assert.throws(() => decryptSecret(blob), /Failed to decrypt/, "wrong key fails safely");
    process.env.PETGPT_ENCRYPTION_KEY = ENCRYPTION_KEY;
    ok("encryption: wrong key fails safely (no plaintext returned, no crash of the caller)");
  }
  {
    delete process.env.PETGPT_ENCRYPTION_KEY;
    assert.throws(() => encryptSecret(API_KEY), /PETGPT_ENCRYPTION_KEY/, "missing key blocks encryption");
    assert.throws(() => decryptSecret("a:a:a"), /Failed to decrypt|PETGPT_ENCRYPTION_KEY/, "missing key blocks decryption");
    process.env.PETGPT_ENCRYPTION_KEY = ENCRYPTION_KEY;
    ok("encryption: missing encryption configuration fails safely (never plaintext)");
  }

  // ---- Auth gate ----------------------------------------------------
  {
    const a = await api("GET", provPath);
    const b = await api("GET", provPath, "bad-token");
    assert.strictEqual(a.status, 401, "no token -> 401");
    assert.strictEqual(b.status, 401, "bad token -> 401");
    ok("providers: unauthenticated requests rejected");
  }

  // ---- Validation ---------------------------------------------------
  {
    const badProvider = await api("POST", provPath, aliceTok, { provider: "nope", baseUrl: mockBase, model: "m", apiKey: "k" });
    assert.strictEqual(badProvider.status, 400, "unknown provider type -> 400");
    assert.ok(String(badProvider.data.message).includes("Unsupported provider type"), "unsupported provider rejected");
    const noProvider = await api("POST", provPath, aliceTok, { baseUrl: mockBase, model: "m", apiKey: "k" });
    assert.strictEqual(noProvider.status, 400, "missing provider -> 400");
    const noBase = await api("POST", provPath, aliceTok, { provider: "openai", model: "m", apiKey: "k" });
    assert.strictEqual(noBase.status, 400, "openai without baseUrl -> 400");
    const badBase = await api("POST", provPath, aliceTok, { provider: "openai", baseUrl: "not-a-url", model: "m", apiKey: "k" });
    assert.strictEqual(badBase.status, 400, "openai with invalid baseUrl -> 400");
    const noModel = await api("POST", provPath, aliceTok, { provider: "openai", baseUrl: mockBase, apiKey: "k" });
    assert.strictEqual(noModel.status, 400, "missing model -> 400");
    const noKey = await api("POST", provPath, aliceTok, { provider: "openai", baseUrl: mockBase, model: "m" });
    assert.strictEqual(noKey.status, 400, "create without apiKey -> 400");
    ok("providers: validation rejects unsupported/incomplete configurations");
  }

  // ---- Create (first provider auto-activates) -----------------------
  let aliceProvId;
  {
    const a = await api("POST", provPath, aliceTok, {
      provider: "openai",
      name: PROVIDER_NAME,
      baseUrl: mockBase + "/", // trailing slash must be normalized away
      model: "test-model",
      apiKey: API_KEY,
    });
    assert.strictEqual(a.status, 201, "create -> 201");
    const p = a.data.provider;
    assert.strictEqual(p.provider, "openai");
    assert.strictEqual(p.name, PROVIDER_NAME);
    assert.strictEqual(p.baseUrl, mockBase, "trailing slash stripped");
    assert.strictEqual(p.model, "test-model");
    assert.strictEqual(p.enabled, true, "default enabled");
    assert.strictEqual(p.active, true, "first provider auto-active");
    assert.strictEqual(p.configured, true, "configured mask true");
    assertNoSecret(a.data, "create response");
    aliceProvId = p.id;

    const raw = await AiProvider.findOne({ _id: aliceProvId }).lean();
    assert.ok(raw.apiKeyEnc, "ciphertext stored");
    assert.ok(raw.apiKeyEnc !== API_KEY && !raw.apiKeyEnc.includes(API_KEY), "stored value is not plaintext");
    assert.strictEqual(decryptSecret(raw.apiKeyEnc), API_KEY, "stored ciphertext decrypts to the key");
    ok("providers: create stores only ciphertext; safe response (no secret, no ciphertext)");
  }
  {
    // Client-supplied owner is ignored; the doc belongs to the caller.
    const raw = await AiProvider.findById(aliceProvId).lean();
    assert.strictEqual(String(raw.owner), String(alice._id), "owner is the authenticated user, never the body");
  }

  // ---- List ---------------------------------------------------------
  {
    const a = await api("GET", provPath, aliceTok);
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.data.providers.length, 1);
    assert.strictEqual(a.data.providers[0].id, aliceProvId);
    assertNoSecret(a.data, "list response");
    const b = await api("GET", provPath, bobTok);
    assert.strictEqual(b.data.providers.length, 0, "bob sees no alice providers");
    ok("providers: list scoped per owner; safe metadata only");
  }

  // ---- Ownership isolation on read/update/delete/test ---------------
  {
    const foreignPatch = await api("PATCH", `${provPath}/${aliceProvId}`, bobTok, { model: "hijacked" });
    const foreignDelete = await api("DELETE", `${provPath}/${aliceProvId}`, bobTok);
    const foreignTest = await api("POST", `${provPath}/${aliceProvId}/test`, bobTok);
    const foreignGet = await api("GET", `${provPath}`, bobTok);
    assert.strictEqual(foreignPatch.status, 404, "bob cannot update alice provider");
    assert.strictEqual(foreignDelete.status, 404, "bob cannot delete alice provider");
    assert.strictEqual(foreignTest.status, 404, "bob cannot test/use alice provider");
    assert.ok(!foreignGet.data.providers.some((p) => p.id === aliceProvId), "bob never sees alice provider");
    const still = await api("GET", provPath, aliceTok);
    assert.strictEqual(still.data.providers.length, 1, "alice provider untouched");
    ok("providers: ownership isolation on read/update/delete/test");
  }

  // ---- Active selection (only one active per owner) -----------------
  let secondId;
  {
    const a = await api("POST", provPath, aliceTok, {
      provider: "openai", name: "Second", baseUrl: mockBase, model: "m2", apiKey: "sk-ish-2", active: false,
    });
    assert.strictEqual(a.status, 201);
    assert.strictEqual(a.data.provider.active, false, "explicit active:false honored");
    secondId = a.data.provider.id;
    const p1 = await AiProvider.findById(aliceProvId).lean();
    assert.strictEqual(p1.active, true, "original stays active");
  }
  {
    const up = await api("PATCH", `${provPath}/${secondId}`, aliceTok, { active: true });
    assert.strictEqual(up.status, 200, "activate -> 200");
    assert.strictEqual(up.data.provider.active, true);
    const p1 = await AiProvider.findById(aliceProvId).lean();
    const p2 = await AiProvider.findById(secondId).lean();
    assert.strictEqual(p1.active, false, "sibling deactivated");
    assert.strictEqual(p2.active, true, "new provider active");
    ok("providers: activating one provider deactivates the owner's siblings");
  }

  // ---- Disabled provider ignored by resolution ----------------------
  {
    const up = await api("PATCH", `${provPath}/${secondId}`, aliceTok, { enabled: false });
    assert.strictEqual(up.status, 200);
    assert.strictEqual(up.data.provider.enabled, false);
    ok("providers: disabled provider stored (resolution=null verified via conversation below)");
  }

  // ---- Test endpoint (uses stored credentials, persists nothing) ----
  {
    await api("PATCH", `${provPath}/${secondId}`, aliceTok, { enabled: true });
    mockMode = "ok";
    const t = await api("POST", `${provPath}/${secondId}/test`, aliceTok);
    assert.strictEqual(t.status, 200);
    assert.strictEqual(t.data.ok, true, "stored-credentials test succeeds");
    assert.ok(typeof t.data.latencyMs === "number", "reports latency");
    assertNoSecret(t.data, "test response");
    const msgCount = await Message.countDocuments({});
    assert.strictEqual(msgCount, 0, "test never persists any message");
    mockMode = "http500";
    const t2 = await api("POST", `${provPath}/${secondId}/test`, aliceTok);
    assert.strictEqual(t2.data.ok, false, "provider failure reported as normalized failure");
    assert.strictEqual(t2.data.error.code, "http", "normalized code returned");
    assertNoSecret(t2.data, "failed test response");
    mockMode = "ok";
    ok("providers: test endpoint uses stored creds, normalizes failures, persists nothing, leaks nothing");
  }

  // ---- Conversation flow uses the configured provider ---------------
  requests.length = 0; // test-endpoint calls already consumed earlier indexes
  let convId;
  {
    const c = await api("POST", "/api/ai/conversations", aliceTok, {});
    convId = c.data.conversation.id;
  }
  {
    const q1 = "What food for a puppy?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, aliceTok, { content: q1 });
    assert.strictEqual(a.status, 202, "exchange -> 202 (durable generation)");
    const T = await awaitJob(aliceTok, a.data.job.id);
    assert.strictEqual(T.job.status, "completed", "job completes");
    assert.strictEqual(T.assistantMessage.content, MOCK_ANSWER, "configured provider answer persisted (not env fallback)");
    assert.strictEqual(requests[0].messages[0].role, "system", "system prompt sent first");
    ok("petgpt: persistent conversation used the user's configured provider");
  }
  {
    const q2 = "And about walking?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, aliceTok, { content: q2 });
    assert.strictEqual(a.status, 202);
    const T = await awaitJob(aliceTok, a.data.job.id);
    assert.strictEqual(T.job.status, "completed");
    assert.deepStrictEqual(requests[1].messages.map((m) => m.role), ["system", "user", "assistant", "user"], "history reused through configured provider");
    assert.strictEqual(T.assistantMessage.content, MOCK_ANSWER);
    ok("petgpt: follow-up conversation uses configured provider with history");
  }
  {
    // Encryption config disappears at request time -> the worker's decrypt
    // fails safely: the job fails cleanly, never leaks the plaintext, and
    // never crashes the request (which already returned 202 by then).
    delete process.env.PETGPT_ENCRYPTION_KEY;
    const qx = "Food for a hamster?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, aliceTok, { content: qx });
    assert.strictEqual(a.status, 202, "missing encryption key -> 202 (no crash at request time)");
    const T = await awaitJob(aliceTok, a.data.job.id);
    assert.strictEqual(T.job.status, "failed", "missing encryption config fails the job safely");
    assert.strictEqual(T.job.error.code, "provider");
    assertNoSecret(a.data, "message response");
    process.env.PETGPT_ENCRYPTION_KEY = ENCRYPTION_KEY;
    ok("petgpt: missing encryption configuration fails the job safely (no crash, no secret)");
  }
  {
    // Provider failure -> failed job, no fake success.
    mockMode = "http500";
    const q3 = "Should I take him to the vet?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, aliceTok, { content: q3 });
    assert.strictEqual(a.status, 202);
    const T = await awaitJob(aliceTok, a.data.job.id);
    assert.strictEqual(T.job.status, "failed", "provider failure fails the job");
    assert.strictEqual(T.job.error.code, "provider");
    mockMode = "ok";
    ok("petgpt: configured-provider failure fails the job; no fake success");
  }

  // ---- Disable the provider -> no active provider -> job fails -------
  {
    await api("PATCH", `${provPath}/${secondId}`, aliceTok, { enabled: false });
    const q4 = "Cat litter tips?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, aliceTok, { content: q4 });
    assert.strictEqual(a.status, 202);
    const T = await awaitJob(aliceTok, a.data.job.id);
    assert.strictEqual(T.job.status, "failed", "disabled provider -> no generation");
  }
  // ---- Delete the provider -> job fails cleanly ----------------------
  {
    await api("PATCH", `${provPath}/${secondId}`, aliceTok, { enabled: true });
    const del = await api("DELETE", `${provPath}/${secondId}`, aliceTok);
    assert.strictEqual(del.status, 200, "delete -> 200");
    const q5 = "More cat advice?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, aliceTok, { content: q5 });
    assert.strictEqual(a.status, 202);
    const T = await awaitJob(aliceTok, a.data.job.id);
    assert.strictEqual(T.job.status, "failed", "deleted provider -> no generation");
    ok("petgpt: disable and delete leave no active provider; jobs fail cleanly (no fake answer)");
  }

  // ---- Scope gate remains enforced with a configured provider -------
  {
    await api("PATCH", `${provPath}/${aliceProvId}`, aliceTok, { active: true });
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, aliceTok, { content: "what is the capital of France" });
    assert.strictEqual(a.status, 200);
    assert.ok(a.data.assistantMessage.content.startsWith("I'm PetGPT"), "scope gate still short-circuits the provider");
    ok("petgpt: scope gate enforced even when a configured provider is active");
  }

  // ---- Legacy /api/ai/ask preserves system config -------------------
  {
    const a = await api("POST", "/api/ai/ask", aliceTok, { question: "dog food advice?" });
    assert.strictEqual(a.status, 200);
    assert.strictEqual(a.data.answer, fallbackAnswer("dog food advice?"), "legacy ask uses system env, not stored config");
    assertNoSecret(a.data, "ask response");
    ok("legacy: POST /api/ai/ask untouched (system config behavior preserved with a stored provider present)");
  }

  // ---- No secret leakage ---------------------------------------------
  {
    const messages = await Message.find({}).lean();
    const all = messages.map((m) => m.content).join("\n");
    assert.ok(!all.includes(API_KEY), "API key never in persisted messages");
    const jobs = await GenerationJob.find({}).lean();
    assert.ok(!JSON.stringify(jobs).includes(API_KEY), "no plaintext API key in job docs");
    const providersRaw = await AiProvider.find({}).lean();
    assert.ok(!JSON.stringify(providersRaw).includes(API_KEY), "no plaintext key in provider docs (only ciphertext)");
    for (const line of logLines) {
      assert.ok(!line.includes(API_KEY), `API key not in log line: ${line.slice(0, 120)}`);
    }
    ok("security: no plaintext API key in persisted messages, jobs, provider docs, or logs");
  }

  stopWorker();
  console.log = origLog;
  console.error = origErr;
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await AiProvider.deleteMany({});
  await User.deleteMany({ _id: { $in: [alice._id, bob._id] } });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => mock.close(resolve));

  console.log(`\nAll ${passed} provider-configuration checks passed.`);
  process.exit(0);
})().catch(async (error) => {
  console.error("FAILED:", error && error.stack ? error.stack : error);
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  process.exit(1);
});