// =========================================================
// PetGPT conversations (Phase 2) — provider-path checks over a
// real local mock OpenAI-compatible HTTP endpoint.
// Run: node test/petgpt-provider-conversation.test.js
// Requires reachable MongoDB (default localhost:27017 test DB).
// Verifies the durable chat flow: user message persisted,
// assistant reply persisted, conversation history reused by the
// provider, history capped, and no fake success on provider
// failure (existing fallback behaviour preserved).
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
  const { fallbackAnswer } = require("../controllers/ai.controller");
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

  const User = require("../models/User");
  const Conversation = require("../models/Conversation");
  const Message = require("../models/Message");

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
    assert.strictEqual(a.status, 200, "send -> 200");
    assert.strictEqual(a.data.userMessage.role, "user");
    assert.strictEqual(a.data.userMessage.content, q1, "user message persisted");
    assert.strictEqual(a.data.assistantMessage.role, "assistant");
    assert.strictEqual(a.data.assistantMessage.content, PROVIDER_ANSWER, "provider assistant reply persisted");
    assert.deepStrictEqual(
      requests[0].messages.map((m) => m.role),
      ["system", "user"],
      "first exchange sends system + current user turn only (no history yet)"
    );
    assert.strictEqual(requests[0].messages[1].content, `User asks: ${q1}`, "current user turn is the question");
    ok("flow: user message persisted, provider called, assistant reply persisted");
  }
  {
    const q2 = "And what about walking him daily?";
    const a = await api("POST", `${convPath}/${convId}/messages`, { content: q2 });
    assert.strictEqual(a.status, 200);
    const sent = requests[1].messages;
    const roles = sent.map((m) => m.role);
    assert.deepStrictEqual(roles, ["system", "user", "assistant", "user"], "history inserted between system and current turn");
    assert.strictEqual(sent[1].content, "What food for a puppy?", "history[0] = prior user message");
    assert.strictEqual(sent[2].content, PROVIDER_ANSWER, "history[1] = prior provider answer");
    assert.strictEqual(sent[3].content, `User asks: ${q2}`, "current question last");
    assert.strictEqual(a.data.assistantMessage.content, PROVIDER_ANSWER);
    ok("history: conversation history reused as provider context (order + roles preserved)");
  }

  // ---- Provider failure -> no fake success; fallback persisted -------
  {
    mockMode = "http500";
    const q3 = "Should I take my dog to the vet?";
    const a = await api("POST", `${convPath}/${convId}/messages`, { content: q3 });
    assert.strictEqual(a.status, 200, "provider failure still 200 (existing fallback behaviour)");
    assert.strictEqual(a.data.assistantMessage.content, fallbackAnswer(q3), "fallback answer persisted when provider fails");
    assert.notStrictEqual(a.data.assistantMessage.content, PROVIDER_ANSWER, "no fabricated provider success");
    mockMode = "ok";
    ok("failure: failed provider does not create a fake successful assistant response");
  }

  // ---- History cap enforced (PETGPT_MAX_HISTORY_MESSAGES=2) ----------
  {
    for (const q of ["Message four?", "Message five?", "Message six?"]) {
      const a = await api("POST", `${convPath}/${convId}/messages`, { content: q });
      assert.strictEqual(a.status, 200);
    }
    const last = requests[requests.length - 1];
    const historyCount = last.messages.filter((m) => m.role !== "system" && !m.content.startsWith("User asks:")).length;
    assert.strictEqual(historyCount, 2, "at most maxHistoryMessages prior messages sent");
    ok("context: conversation history capped at PETGPT_MAX_HISTORY_MESSAGES");
  }

  // ---- Durable history survives "restart" (DB is source of truth) ----
  {
    const persisted = await Message.find({ conversation: convId }).sort({ createdAt: 1, _id: 1 }).lean();
    assert.strictEqual(persisted.length, 12, "12 messages persisted (6 exchanges)");
    assert.deepStrictEqual(persisted.map((m) => m.role), [
      "user", "assistant", "user", "assistant", "user", "assistant", "user", "assistant", "user", "assistant", "user", "assistant",
    ]);
    assert.strictEqual(persisted[1].content, PROVIDER_ANSWER, "assistant reply stored as source of truth");
    assert.strictEqual(persisted[5].content, fallbackAnswer("Should I take my dog to the vet?"), "fallback exchange stored as-is");
    ok("durability: full history readable from DB in order, independent of the request lifecycle");
  }

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