// =========================================================
// PetGPT provider configuration (Phase 3) — real OpenAI-compatible
// path through the local EduTech OmniRoute container using a
// user-owned, encrypted provider configuration.
// Run: node test/petgpt-provider-config-omniroute.test.js
// Requires: the OmniRoute container reachable at
// PETGPT_OPENAI_BASE_URL (default http://localhost:20128/v1) and
// PETGPT_OPENAI_API_KEY set. Without the key the check SKIPS
// (exit 0): no public API key is required.
//
// System env points at google-without-a-key so the fallback path is
// deterministic (canned answers) and provably distinct from the real
// OmniRoute replies produced by the stored configuration.
// =========================================================

const assert = require("assert");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const DB_NAME = "animal_planet_petgpt_provider_cfg_omniroute_test";
const URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;

const BASE_URL = process.env.PETGPT_OPENAI_BASE_URL || "http://localhost:20128/v1";
const API_KEY = process.env.PETGPT_OPENAI_API_KEY;
const MODEL = process.env.PETGPT_OPENAI_MODEL || "auto/best-fast";

if (!API_KEY) {
  console.log(`SKIPPED: PETGPT_OPENAI_API_KEY not set (allowed to run against OmniRoute container at ${BASE_URL}).`);
  process.exit(0);
}

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

(async () => {
  // Reachability pre-check -> skip gracefully when the container is down.
  const probe = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  }).then(() => true).catch(() => false);
  if (!probe) {
    console.log(`SKIPPED: OmniRoute container not reachable at ${BASE_URL}.`);
    process.exit(0);
  }

  // System env: default google provider without a key -> deterministic
  // canned fallback. The STORED configuration below supplies the real
  // OmniRoute credentials.
  for (const k of ["PETGPT_PROVIDER", "GEMINI_API_KEY", "PETGPT_OPENAI_BASE_URL", "PETGPT_OPENAI_API_KEY", "PETGPT_OPENAI_MODEL"]) {
    if (k in process.env) delete process.env[k];
  }
  process.env.JWT_SECRET = process.env.JWT_SECRET || "petgpt-provider-cfg-omniroute-test-secret";
  process.env.PETGPT_ENCRYPTION_KEY = "petgpt-provider-cfg-omniroute-encryption-key";

  const { AI_CONFIG } = require("../config/ai");
  assert.strictEqual(AI_CONFIG.provider, "google", "system env = google fallback path");

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
  const User = require("../models/User");
  const AiProvider = require("../models/AiProvider");
  const GenerationJob = require("../models/GenerationJob");
  const Conversation = require("../models/Conversation");
  const Message = require("../models/Message");
  await GenerationJob.init(); // rebuild unique idempotency index after drop

  const logLines = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => { logLines.push(a.join(" ")); origLog(...a); };
  console.error = (...a) => { logLines.push(a.join(" ")); origErr(...a); };

  const user = await User.create({ name: "Phase3 Omni", email: "phase3-omniroute@test.dev", password: "testpass123" });
  const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

  async function api(method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* ignore */ }
    return { status: res.status, data };
  }
  const jsonOf = (x) => JSON.stringify(x);
  const assertNoSecret = (payload, where) => {
    assert.ok(!jsonOf(payload).includes(API_KEY), `API key not in ${where}`);
  };

  // Phase 4: poll a durable generation job to its terminal state.
  async function awaitJob(jobId) {
    const started = Date.now();
    while (Date.now() - started < 60000) {
      const r = await api("GET", `/api/ai/jobs/${jobId}`);
      assert.strictEqual(r.status, 200, "job status readable while running");
      if (["completed", "failed"].includes(r.data.job.status)) return r.data;
      await new Promise((s) => setTimeout(s, 100));
    }
    throw new Error(`job ${jobId} not terminal in time`);
  }

  startWorker();

  const provPath = "/api/ai/providers";

  // Store an OmniRoute configuration (encrypted key, auto-active).
  let provId;
  {
    const created = await api("POST", provPath, {
      provider: "openai",
      name: "OmniRoute Lab",
      baseUrl: BASE_URL,
      model: MODEL,
      apiKey: API_KEY,
    });
    assert.strictEqual(created.status, 201, "create configured provider -> 201");
    assert.strictEqual(created.data.provider.active, true, "first configured provider auto-active");
    assertNoSecret(created.data, "create response");
    provId = created.data.provider.id;
    const raw = await AiProvider.findById(provId).lean();
    assert.ok(raw.apiKeyEnc && !raw.apiKeyEnc.includes(API_KEY), "stored key is ciphertext only");
    ok("omniroute: configured provider created with encrypted API key");
  }

  // Real provider exchange through the STORED configuration (durable job).
  let convId;
  {
    const c = await api("POST", "/api/ai/conversations", {});
    assert.strictEqual(c.status, 201);
    convId = c.data.conversation.id;
  }
  {
    const q = "Give me a short tip about feeding an adult dog.";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, { content: q });
    assert.strictEqual(a.status, 202, "real OmniRoute exchange via stored config -> 202 (durable generation)");
    assert.strictEqual(a.data.userMessage.content, q, "user message persisted");
    assert.ok(a.data.job && a.data.job.id, "job queued");
    const T = await awaitJob(a.data.job.id);
    assert.strictEqual(T.job.status, "completed", "job completes");
    assert.ok(
      typeof T.assistantMessage.content === "string" && T.assistantMessage.content.trim().length > 0,
      "real assistant reply non-empty"
    );
    assert.notStrictEqual(T.assistantMessage.content, "I'm PetGPT, FamiPet's pet-care assistant", "reply is a real provider answer");
    assertNoSecret(a.data, "message response");
    ok("omniroute: configured (encrypted-key) provider produced the real reply via the worker");
  }

  // Follow-up with history context.
  {
    const q2 = "How often should that dog be walked daily?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, { content: q2 });
    assert.strictEqual(a.status, 202);
    const T = await awaitJob(a.data.job.id);
    assert.strictEqual(T.job.status, "completed", "follow-up completes");
    assert.ok(T.assistantMessage.content.trim().length > 0, "follow-up reply non-empty");
    const g = await api("GET", `/api/ai/conversations/${convId}`);
    assert.strictEqual(g.data.messages.length, 4, "history durable across exchanges");
    assert.deepStrictEqual(g.data.messages.map((m) => m.role), ["user", "assistant", "user", "assistant"]);
    assertNoSecret(g.data, "conversation history response");
    ok("omniroute: follow-up conversation durable through configured provider");
  }

  // Disable the stored provider -> no active provider -> job fails.
  {
    await api("PATCH", `${provPath}/${provId}`, { enabled: false });
    const q3 = "Cat litter box tips?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, { content: q3 });
    assert.strictEqual(a.status, 202);
    const T = await awaitJob(a.data.job.id);
    assert.strictEqual(T.job.status, "failed", "disabled configured provider -> job fails (no fake answer)");
    ok("omniroute: disabling the configured provider leaves no active provider; job fails cleanly");
  }

  // Delete the stored provider -> no provider at all -> job fails.
  {
    await api("PATCH", `${provPath}/${provId}`, { enabled: true });
    const del = await api("DELETE", `${provPath}/${provId}`);
    assert.strictEqual(del.status, 200, "delete -> 200");
    const q4 = "More cat advice?";
    const a = await api("POST", `/api/ai/conversations/${convId}/messages`, { content: q4 });
    assert.strictEqual(a.status, 202);
    const T = await awaitJob(a.data.job.id);
    assert.strictEqual(T.job.status, "failed", "deleted configured provider -> job fails cleanly");
    ok("omniroute: deleting the configured provider leaves no generation path; no fake answer");
  }

  // No secrets persisted or logged.
  {
    const messages = await Message.find({}).lean();
    const all = messages.map((m) => m.content).join("\n");
    assert.ok(!all.includes(API_KEY), "API key never in persisted messages");
    const jobs = await GenerationJob.find({}).lean();
    assert.ok(!JSON.stringify(jobs).includes(API_KEY), "no plaintext API key in job docs");
    const docs = await AiProvider.find({}).lean();
    assert.ok(!JSON.stringify(docs).includes(API_KEY), "only ciphertext stored in provider docs");
    for (const line of logLines) {
      assert.ok(!line.includes(API_KEY), `API key not in any log line: ${line.slice(0, 120)}`);
    }
    ok("omniroute: API key absent from persisted messages, jobs, provider docs, and logs");
  }

  stopWorker();
  console.log = origLog;
  console.error = origErr;
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await AiProvider.deleteMany({});
  await User.deleteMany({ _id: user._id });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));

  console.log(`\nAll ${passed} provider-configuration OmniRoute checks passed.`);
  process.exit(0);
})().catch(async (error) => {
  console.error("FAILED:", error && error.stack ? error.stack : error);
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  process.exit(1);
});