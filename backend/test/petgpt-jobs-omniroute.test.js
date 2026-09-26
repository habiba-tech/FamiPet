// =========================================================
// Phase 4 — durable generation against the real EduTech
// OmniRoute container.
// Run: node test/petgpt-jobs-omniroute.test.js
// Requires: OmniRoute reachable at PETGPT_OPENAI_BASE_URL
// (default http://localhost:20128/v1) and PETGPT_OPENAI_API_KEY
// set. Without the key the check SKIPS (exit 0).
//
// Verifies, end to end: POST .../messages returns 202 before the
// provider finishes, the job is observed in "processing", the
// real assistant reply is persisted at completion, and a follow-up
// reuses the persisted history.
//
// Uses a dedicated test DB on the locally running MongoDB.
// =========================================================

const assert = require("assert");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const DB_NAME = "animal_planet_petgpt_jobs_omniroute_test";
const URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;

const BASE_URL = process.env.PETGPT_OPENAI_BASE_URL || "http://localhost:20128/v1";
const API_KEY = process.env.PETGPT_OPENAI_API_KEY;
const MODEL = process.env.PETGPT_OPENAI_MODEL || "auto/best-fast";

if (!API_KEY) {
  console.log(`SKIPPED: PETGPT_OPENAI_API_KEY not set (allowed to run against OmniRoute container at ${BASE_URL}).`);
  process.exit(0);
}

(async () => {
  const probe = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  }).then(() => true).catch(() => false);
  if (!probe) {
    console.log(`SKIPPED: OmniRoute container not reachable at ${BASE_URL}.`);
    process.exit(0);
  }

  // Env MUST be set before config/ai.js is required (AI_CONFIG frozen).
  process.env.PETGPT_PROVIDER = "openai";
  process.env.PETGPT_OPENAI_BASE_URL = BASE_URL;
  process.env.PETGPT_OPENAI_API_KEY = API_KEY;
  process.env.PETGPT_OPENAI_MODEL = MODEL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || "petgpt-jobs-omniroute-test-secret";
  process.env.PETGPT_WORKER_POLL_MS = process.env.PETGPT_WORKER_POLL_MS || "300";

  const { AI_CONFIG } = require("../config/ai");
  assert.strictEqual(AI_CONFIG.provider, "openai");
  assert.strictEqual(AI_CONFIG.openai.baseUrl, BASE_URL.replace(/\/+$/, ""), "OmniRoute base URL in play");

  const GenerationJob = require("../models/GenerationJob");
  const User = require("../models/User");
  const Conversation = require("../models/Conversation");
  const Message = require("../models/Message");

  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await GenerationJob.init(); // rebuild unique idempotency index after drop

  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/ai", require("../routes/ai.routes"));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/ai`;

  const { startWorker, stopWorker } = require("../jobs/generation.worker");

  const logLines = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => { logLines.push(a.join(" ")); origLog(...a); };
  console.error = (...a) => { logLines.push(a.join(" ")); origErr(...a); };

  const user = await User.create({ name: "Phase4 Omni", email: "phase4-jobs-omniroute@test.dev", password: "testpass123" });
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

  async function awaitJobTerminal(jobId, timeoutMs = 120000) {
    const observed = [];
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const r = await api("GET", `/jobs/${jobId}`);
      assert.strictEqual(r.status, 200, `job ${jobId} readable while running`);
      observed.push(r.data.job.status);
      if (["completed", "failed"].includes(r.data.job.status)) return { ...r.data, observed };
      await new Promise((r2) => setTimeout(r2, 100));
    }
    throw new Error(`job ${jobId} did not reach terminal state; observed ${observed}`);
  }

  try {
    const c = await api("POST", "/conversations", {});
    assert.strictEqual(c.status, 201, "create -> 201");
    const convId = c.data.conversation.id;

    // 1) POST returns 202 before generation finishes; job queued.
    const q1 = "Give me a short tip about feeding an adult dog.";
    const a = await api("POST", `/conversations/${convId}/messages`, { content: q1 });
    assert.strictEqual(a.status, 202, "real OmniRoute generation -> 202 Accepted");
    const jobId = a.data.job && a.data.job.id;
    assert.ok(jobId, "202 response carries the job");
    assert.ok(!a.data.assistantMessage, "202 carries no assistant message yet");
    assert.strictEqual(a.data.userMessage.content, q1, "user message persisted");
    assert.ok(["queued", "processing"].includes(a.data.job.status), `initial status queued/processing (saw ${a.data.job.status})`);

    // 2) Start the worker and watch the job pass through processing.
    startWorker();
    const T = await awaitJobTerminal(jobId);
    assert.ok(T.observed.includes("processing"), `job observed processing (saw ${T.observed})`);
    assert.strictEqual(T.job.status, "completed", "real generation completes");
    assert.strictEqual(T.job.provider, "env", "job labels the system env provider (no stored config)");

    // 3) Completion is persisted: assistant reply readable independently.
    assert.ok(T.assistantMessage && typeof T.assistantMessage.content === "string" && T.assistantMessage.content.trim().length > 0,
      "real assistant reply persisted and non-empty");
    const again = await api("GET", `/jobs/${jobId}`);
    assert.strictEqual(again.status, 200);
    assert.strictEqual(again.data.job.status, "completed", "status durable after completion");

    // 4) Follow-up reuses the persisted history; 4 messages in order.
    const q2 = "How often should that dog be walked daily?";
    const b = await api("POST", `/conversations/${convId}/messages`, { content: q2 });
    const T2 = await awaitJobTerminal(b.data.job.id);
    assert.strictEqual(T2.job.status, "completed", "follow-up completes");
    const g = await api("GET", `/conversations/${convId}`);
    assert.strictEqual(g.status, 200);
    assert.strictEqual(g.data.messages.length, 4, "history durable across job-backed exchanges");
    assert.deepStrictEqual(g.data.messages.map((m) => m.role), ["user", "assistant", "user", "assistant"]);
    assert.ok(g.data.messages[0].content.includes("adult dog"), "first question intact in history");

    // 5) No secrets in logs, jobs, or messages.
    for (const line of logLines) assert.ok(!line.includes(API_KEY), "API key not present in any log line");
    const jobJson = JSON.stringify(await GenerationJob.find().lean());
    assert.ok(!jobJson.includes(API_KEY), "API key never persisted in jobs");
    assert.strictEqual(await GenerationJob.countDocuments({ status: { $in: ["queued", "processing"] } }), 0,
      "no jobs left dangling after the suite");

    origLog(`\n✅ petgpt-jobs-omniroute.test.js — looked fine (${T.observed.join(" -> ")}; reply ${T.assistantMessage.content.length} chars)`);
  } finally {
    stopWorker();
    console.log = origLog;
    console.error = origErr;
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch(async (error) => {
  console.error("FAILED:", error && error.stack ? error.stack : error);
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  process.exit(1);
});