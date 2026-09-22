// =========================================================
// PetGPT conversations (Phase 2) — provider-path checks over a
// real local mock OpenAI-compatible HTTP endpoint.
// Run: node test/petgpt-provider-conversation.test.js
// Requires reachable MongoDB (default localhost:27017 test DB).
// Verifies the durable chat flow (Phase 4): user message persisted
// and a generation job queued (202), the assistant reply persisted
// by the worker, conversation history reused by the provider as
// context, history capped, and no fake success on provider failure
// (the job fails instead).
// =========================================================

const assert = require("assert");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const DB_NAME = "animal_planet_petgpt_provider_test";
const URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;
const PROVIDER_ANSWER = "provider-context answer for follow-up";
let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

// Mock OpenAI-compatible endpoint that records every request body.
let mockMode = "ok";
const requests = []; // { messages, mode }
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
      res.end(JSON.stringify({ choices: [{ message: { content: PROVIDER_ANSWER } }] }));
    }
  });
});

(async () => {
  await new Promise((resolve, reject) => {
    mock.once("error", reject);
    mock.listen(0, "127.0.0.1", resolve);
  });
  const mockBase = `http://127.0.0.1:${mock.address().port}`;

  // Env snapshotted by config/ai at first require — set before loading
  // any app module.
  process.env.PETGPT_PROVIDER = "openai";
  process.env.PETGPT_OPENAI_BASE_URL = mockBase;
  process.env.PETGPT_OPENAI_API_KEY = "sk-test";
  process.env.PETGPT_OPENAI_MODEL = "test-model";
  process.env.PETGPT_MAX_HISTORY_MESSAGES = "2";
  process.env.JWT_SECRET = "petgpt-provider-conversation-test-secret";

  const { AI_CONFIG } = require("../config/ai");
  assert.strictEqual(AI_CONFIG.provider, "openai", "provider openai active");
  assert.strictEqual(AI_CONFIG.maxHistoryMessages, 2, "history cap applied");

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
  const GenerationJob = require("../models/GenerationJob");
  const Conversation = require("../models/Conversation");
  const Message = require("../models/Message");
  await GenerationJob.init(); // rebuild unique idempotency index after drop

  const user = await User.create({ name: "Phase2 Provider", email: "phase2-provider@test.dev", password: "testpass123" });
  const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const convPath = "/api/ai/conversations";

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

  // Phase 4: poll a durable generation job to its terminal state.
  async function awaitJob(jobId) {
    const started = Date.now();
    while (Date.now() - started < 20000) {
      const r = await api("GET", `/api/ai/jobs/${jobId}`);
      assert.strictEqual(r.status, 200, "job status readable while running");
      if (["completed", "failed"].includes(r.data.job.status)) return r.data;
      await new Promise((s) => setTimeout(s, 40));
    }
    throw new Error(`job ${jobId} not terminal in time`);
  }

  startWorker();

  // ---- Flow: persist user -> provider (with history) -> persist assistant
  let convId;
  {
    const c = await api("POST", convPath, {});
    assert.strictEqual(c.status, 201);
    convId = c.data.conversation.id;
  }
  {
    const q1 = "What food for a puppy?";
    const a = await api("POST", `${convPath}/${convId}/messages`, { content: q1 });
    assert.strictEqual(a.status, 202, "send -> 202 (durable generation)");
    assert.strictEqual(a.data.userMessage.role, "user");
    assert.strictEqual(a.data.userMessage.content, q1, "user message persisted");
    assert.ok(a.data.job && a.data.job.id, "job queued");
    assert.ok(!a.data.assistantMessage, "no assistant message in the 202 response");
    const T = await awaitJob(a.data.job.id);
    assert.strictEqual(T.job.status, "completed", "job completes");
    assert.strictEqual(T.assistantMessage.role, "assistant");
    assert.strictEqual(T.assistantMessage.content, PROVIDER_ANSWER, "provider assistant reply persisted by the worker");
    assert.deepStrictEqual(
      requests[0].messages.map((m) => m.role),
      ["system", "user"],
      "first exchange sends system + current user turn only (no history yet)"
    );
    assert.strictEqual(requests[0].messages[1].content, `User asks: ${q1}`, "current user turn is the question");
    ok("flow: user message persisted, durable job ran the provider, assistant reply persisted");
  }
  {
    const q2 = "And what about walking him daily?";
    const a = await api("POST", `${convPath}/${convId}/messages`, { content: q2 });
    assert.strictEqual(a.status, 202);
    await awaitJob(a.data.job.id);
    const sent = requests[1].messages;
    const roles = sent.map((m) => m.role);
    assert.deepStrictEqual(roles, ["system", "user", "assistant", "user"], "history inserted between system and current turn");
    assert.strictEqual(sent[1].content, "What food for a puppy?", "history[0] = prior user message");
    assert.strictEqual(sent[2].content, PROVIDER_ANSWER, "history[1] = prior provider answer");
    assert.strictEqual(sent[3].content, `User asks: ${q2}`, "current question last");
    ok("history: conversation history reused as provider context (order + roles preserved)");
  }

  // ---- Provider failure -> failed job; no fake success --------------
  {
    mockMode = "http500";
    const q3 = "Should I take my dog to the vet?";
    const a = await api("POST", `${convPath}/${convId}/messages`, { content: q3 });
    assert.strictEqual(a.status, 202, "post accepted");
    const T = await awaitJob(a.data.job.id);
    assert.strictEqual(T.job.status, "failed", "provider failure fails the job");
    assert.strictEqual(T.job.error.code, "provider", "safe client error code");
    assert.strictEqual(T.assistantMessage, null, "no fabricated assistant reply");
    mockMode = "ok";
    ok("failure: failed provider does not create a fake successful assistant response");
  }

  // ---- History cap enforced (PETGPT_MAX_HISTORY_MESSAGES=2) ----------
  {
    for (const q of ["Message four?", "Message five?", "Message six?"]) {
      const a = await api("POST", `${convPath}/${convId}/messages`, { content: q });
      assert.strictEqual(a.status, 202);
      const T = await awaitJob(a.data.job.id);
      assert.strictEqual(T.job.status, "completed", `${q} completes`);
    }
    const last = requests[requests.length - 1];
    const historyCount = last.messages.filter((m) => m.role !== "system" && !m.content.startsWith("User asks:")).length;
    assert.strictEqual(historyCount, 2, "at most maxHistoryMessages prior messages sent");
    ok("context: conversation history capped at PETGPT_MAX_HISTORY_MESSAGES");
  }

  // ---- Durable history survives "restart" (DB is source of truth) ----
  {
    const persisted = await Message.find({ conversation: convId }).sort({ createdAt: 1, _id: 1 }).lean();
    // 6 turns: q1, q2 complete (2 messages each), q3 fails (user only),
    // q4, q5, q6 complete (2 messages each) = 11 messages in order.
    assert.strictEqual(persisted.length, 11, "11 messages persisted (5 complete exchanges + 1 failed turn)");
    const roles = ["user", "assistant", "user", "assistant", "user", "user", "assistant", "user", "assistant", "user", "assistant"];
    assert.deepStrictEqual(persisted.map((m) => m.role), roles);
    assert.strictEqual(persisted[1].content, PROVIDER_ANSWER, "assistant reply stored as source of truth");
    assert.strictEqual(persisted[4].role, "user", "failed exchange user message stored");
    assert.strictEqual(persisted[4].content, "Should I take my dog to the vet?", "failed exchange question stored");
    ok("durability: full history readable from DB in order, independent of the request lifecycle");
  }

  stopWorker();
  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await User.deleteMany({ _id: user._id });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => mock.close(resolve));

  console.log(`\nAll ${passed} provider-path conversation checks passed.`);
  process.exit(0);
})().catch(async (error) => {
  console.error("FAILED:", error && error.stack ? error.stack : error);
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  process.exit(1);
});