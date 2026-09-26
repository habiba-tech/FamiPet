// =========================================================
// Phase 6 — PetGPT per-user quota + durable reliability tests
// ---------------------------------------------------------
// API router + durable worker + a mock OpenAI-compatible provider.
// Covers:
//   * per-user generation quota: window-exceeded -> deterministic 429,
//     no orphan message/job; distinct users have independent quotas
//   * legacy /api/ai/ask is NOT quota-gated (stateless exclusion)
//   * mutation idempotency under stale-reenqueue: a job is re-run
//     (retried) and re-executes the full provider flow, but its
//     mutation is applied EXACTLY once via the MutationEffect ledger
//   * graceful stopWorker() awaits the in-flight generation
//   * no secret leakage through any doc / response / provider request
// =========================================================

const assert = require("assert");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const WORKER_POLL_MS = 60;

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/animal_planet_petgpt_quota_reliability_test";
process.env.JWT_SECRET = "petgpt-quota-reliability-secret";
process.env.PETGPT_PROVIDER = "openai";
process.env.PETGPT_OPENAI_BASE_URL = "http://127.0.0.1:4116/v1";
process.env.PETGPT_OPENAI_API_KEY = "sk-quota-reliability";
process.env.PETGPT_OPENAI_MODEL = "test-model";
process.env.PETGPT_TIMEOUT_MS = "5000";
process.env.PETGPT_WORKER_POLL_MS = String(WORKER_POLL_MS);
process.env.PETGPT_WORKER_STALE_MS = "150";
process.env.PETGPT_MAX_JOB_ATTEMPTS = "3";
process.env.PETGPT_MAX_HISTORY_MESSAGES = "3";
process.env.PETGPT_MAX_TOOL_ITERATIONS = "2";
process.env.PETGPT_RATE_LIMIT_MAX = "3";
process.env.PETGPT_RATE_LIMIT_WINDOW_MS = "60000";

const GenerationJob = require("../models/GenerationJob");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Pet = require("../models/Pet");
const Breed = require("../models/Breed");
const Reminder = require("../models/Reminder");
const MutationEffect = require("../models/MutationEffect");

const logs = [];
const origLog = console.log;
console.log = (...a) => { logs.push(a.map(String).join(" ")); origLog(...a); };

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

async function initAppRouter() {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/ai", require("../routes/ai.routes"));
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await GenerationJob.init();
  await MutationEffect.init();

  // mode: "plain" | "mutate" (tool path) — mutate echoes the petId back
  // so the worker actually creates a Reminder for that user.
  let mode = "plain";
  let mutatePetId = null;
  let sleepMs = 0;
  const requests = [];

  const respond = (res, message) =>
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        id: "chatcmpl-quota",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "test-model",
        choices: [{ index: 0, message }],
      })
    );

  const mock = http
    .createServer((req, res) => {
      if (req.method !== "POST") return res.writeHead(404).end();
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        const payload = JSON.parse(body);
        if (payload.stream === true) return res.writeHead(400).end("stream unsupported");
        if (sleepMs) await new Promise((r) => setTimeout(r, sleepMs));
        // Legacy /api/ai/ask never sends tools.
        if (!payload.tools) return respond(res, { role: "assistant", content: "plain-answer" });
        // Plain chat mode: answer directly, no tool calls.
        if (mode === "plain") return respond(res, { role: "assistant", content: "plain-answer" });
        requests.push(payload);

        const last = payload.messages && payload.messages[payload.messages.length - 1];
        const hasToolResult = last && last.role === "tool";
        if (!hasToolResult) {
          return respond(res, {
            role: "assistant",
            content: "",
            tool_calls: [{
              id: "call_mutate",
              type: "function",
              function: {
                name: "create_reminder",
                arguments: JSON.stringify({
                  petId: mutatePetId,
                  title: "Test reminder",
                  type: "appointment",
                  date: "2026-12-01",
                  time: "10:00",
                }),
              },
            }],
          });
        }
        respond(res, { role: "assistant", content: "Your reminder was created." });
      });
    })
    .listen(4116, "127.0.0.1");

  const apiServer = await initAppRouter();
  const base = `http://127.0.0.1:${apiServer.address().port}/api/ai`;

  async function api(method, route, token, body) {
    const res = await fetch(`${base}${route}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  const tokenFor = (userId) => jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

  async function makeUser(name) {
    const user = await User.create({ name, email: `${name.toLowerCase()}@example.com`, password: "Test1234!" });
    return { user, token: tokenFor(user._id) };
  }

  const makeConversation = async (token, title = "Chat") =>
    (await api("POST", "/conversations", token, { title })).json.conversation.id;

  async function awaitJobTerminal(token, jobId, timeoutMs = 15000) {
    const observed = [];
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const r = await api("GET", `/jobs/${jobId}`, token);
      assert.strictEqual(r.status, 200, `job ${jobId} should be readable while running`);
      observed.push(r.json.job.status);
      if (["completed", "failed"].includes(r.json.job.status)) return r.json;
      await new Promise((r2) => setTimeout(r2, 40));
    }
    throw new Error(`job ${jobId} did not reach a terminal state; observed ${observed}`);
  }

  // Force a "crashed before finishing" state: mark a completed job back to
  // processing with an old startedAt so the reaper re-enqueues and the
  // worker re-executes its full provider flow — the durable retry path.
  async function simulateReenqueue(jobId) {
    await GenerationJob.findOneAndUpdate(
      { _id: jobId },
      { $set: { status: "processing", startedAt: new Date(Date.now() - 10000) } }
    );
  }

  try {
    const alice = await makeUser("Alice");
    const dave = await makeUser("Dave");
    const conv = await makeConversation(alice.token, "Quota Chat");
    const convDave = await makeConversation(dave.token, "Dave Chat");
    const breed = await Breed.create({ name: "Labrador", species: "dog" });
    const rex = await Pet.create({ owner: alice.user._id, breed: breed._id, name: "Rex", species: "dog", gender: "male", age: 3 });

    const { startWorker, stopWorker } = require("../jobs/generation.worker");

    // ---- A. per-user quota: 3 allowed, 4th -> 429, no orphan -----------
    mode = "plain";
    startWorker();
    await new Promise((r) => setTimeout(r, 80));

    for (let i = 0; i < 3; i++) {
      const post = await api("POST", `/conversations/${conv}/messages`, alice.token, { content: `quota message ${i + 1}` });
      assert.strictEqual(post.status, 202, `in-window message ${i + 1} accepted`);
      const T = await awaitJobTerminal(alice.token, post.json.job.id);
      assert.strictEqual(T.job.status, "completed", `message ${i + 1} completes`);
    }

    const over = await api("POST", `/conversations/${conv}/messages`, alice.token, { content: "quota message 4" });
    assert.strictEqual(over.status, 429, "4th in-window exchange is rate limited");
    assert.strictEqual(over.json.success, false);
    assert.ok(over.json.message.includes("Rate limit exceeded"), `429 carries the safe message: ${over.json.message}`);

    assert.strictEqual(await GenerationJob.countDocuments({ owner: alice.user._id }), 3, "no job persisted for the 429 exchange");
    assert.strictEqual(await Message.countDocuments({ conversation: conv }), 6, "no orphan user message for the 429 exchange (3 user + 3 assistant)");

    // Dave has his own independent quota.
    mode = "plain";
    const d1 = await api("POST", `/conversations/${convDave}/messages`, dave.token, { content: "dave 1" });
    assert.strictEqual(d1.status, 202, "dave's first exchange is not limited by alice's usage");
    // Dave's first exchange must fully settle while mode is still "plain":
    // Section C flips the provider mock to "mutate", so a job the poller
    // claims after that would create a spurious reminder (double-apply).
    const d1Terminal = await awaitJobTerminal(dave.token, d1.json.job.id);
    assert.strictEqual(d1Terminal.job.status, "completed", "dave's first exchange completes before the mutation phase");
    ok("quota: 3 in-window generations allowed, 4th -> deterministic 429, no orphan docs");

    // ---- B. legacy /api/ai/ask is NOT quota-gated (stateless exclusion) --
    for (let i = 0; i < 4; i++) {
      const f = await api("POST", "/ask", alice.token, { question: `legacy q ${i}` });
      assert.strictEqual(f.status, 200, "/ask stays available regardless of the generation quota");
    }
    assert.strictEqual(await GenerationJob.countDocuments({ owner: alice.user._id }), 3, "legacy /ask creates no generation jobs");
    ok("quota: legacy /ask bypasses the durable-generation quota (stateless by design)");

    // ---- C. mutation idempotency under stale-reenqueue -------------------
    // A mutation job executes its full provider flow on EVERY re-run, but
    // the MutationEffect ledger guarantees the Reminder is created once.
    // (Uses dave: alice already consumed her 3-job quota in section A.)
    const maxPet = await Pet.create({ owner: dave.user._id, breed: breed._id, name: "Max", species: "dog", gender: "male", age: 5 });
    mode = "mutate";
    mutatePetId = maxPet._id.toString();
    const mPost = await api("POST", `/conversations/${convDave}/messages`, dave.token, {
      content: "Create a reminder for Max please.",
    });
    assert.strictEqual(mPost.status, 202, "mutation request accepted");
    const jobId = mPost.json.job.id;

    const L1 = await awaitJobTerminal(dave.token, jobId);
    assert.strictEqual(L1.job.status, "completed", "first run completes");
    assert.strictEqual(await Reminder.countDocuments({ user: dave.user._id }), 1, "mutation applied once on first run");
    assert.strictEqual(await MutationEffect.countDocuments({ owner: dave.user._id }), 1, "exactly one ledger row after first run");

    const metaBefore = L1.assistantMessage.toolCalls;
    assert.ok(metaBefore && metaBefore.length === 1 && metaBefore[0].name === "create_reminder" && metaBefore[0].ok === true, "assistant message records the mutation tool call");

    // Simulate TWO crash-retries of the SAME durable job (the stale-reenqueue
    // path). Each re-run re-executes the provider flow against the mock.
    await simulateReenqueue(jobId);
    await awaitJobTerminal(dave.token, jobId);
    await simulateReenqueue(jobId);
    const L3 = await awaitJobTerminal(dave.token, jobId);
    assert.strictEqual(L3.job.status, "completed", "retried job completes");

    const demands = requests.filter((r) => r.tools);
    assert.ok(demands.length >= 6, `job re-ran its provider flow on retries (provider tool requests ${demands.length})`);
    assert.strictEqual(await Reminder.countDocuments({ user: dave.user._id }), 1, "reminder created EXACTLY once despite re-executions");
    assert.strictEqual(await MutationEffect.countDocuments({ owner: dave.user._id }), 1, "exactly one ledger row despite re-executions");
    const mutJob = await GenerationJob.findById(jobId).lean();
    assert.ok(mutJob.attemptCount >= 2, `job was actually retried (attemptCount ${mutJob.attemptCount})`);
    ok("reliability: stale-reenqueued mutation job re-runs the provider flow but applies the mutation exactly once");

    // ---- D. graceful stopWorker awaits the in-flight generation ----------
    mode = "plain";
    sleepMs = 400;
    const gPost = await api("POST", `/conversations/${convDave}/messages`, dave.token, { content: "slow graceful generation" });
    assert.strictEqual(gPost.status, 202, "slow generation accepted");

    // Let the worker claim it, then stop gracefully mid-generation.
    await new Promise((r) => setTimeout(r, 200));
    const during = await GenerationJob.findOne({ _id: gPost.json.job.id }).lean();
    assert.ok(["processing", "completed"].includes(during.status), `job was in flight when stopped (${during.status})`);
    const t0 = Date.now();
    await stopWorker();
    const stopMs = Date.now() - t0;
    assert.ok(stopMs >= 150, `stopWorker awaited the in-flight generation (~took ${stopMs}ms)`);
    const afterStop = await GenerationJob.findById(gPost.json.job.id).lean();
    assert.strictEqual(afterStop.status, "completed", "in-flight generation finished before stopWorker returned");
    ok("reliability: stopWorker() awaits the in-flight tick (graceful shutdown)");

    // ---- E. security scan ------------------------------------------------
    const jobJson = JSON.stringify(await GenerationJob.find().lean());
    const msgJson = JSON.stringify(await Message.find().lean());
    const remJson = JSON.stringify(await Reminder.find().lean());
    const effJson = JSON.stringify(await MutationEffect.find().lean());
    const responseBundle = JSON.stringify([over, L1, L3, during, afterStop]);
    const requestJson = JSON.stringify(requests);
    for (const secret of ["sk-quota-reliability", "quota-reliability-secret", "apiKeyEnc", "Bearer"]) {
      assert.ok(!jobJson.includes(secret), `job docs never contain ${secret}`);
      assert.ok(!msgJson.includes(secret), `messages never contain ${secret}`);
      assert.ok(!remJson.includes(secret), `reminder docs never contain ${secret}`);
      assert.ok(!effJson.includes(secret), `ledger docs never contain ${secret}`);
      assert.ok(!responseBundle.includes(secret), `API responses never contain ${secret}`);
      assert.ok(!requestJson.includes(secret), `provider requests never contain ${secret}`);
    }
    assert.ok(!logs.join("\n").includes("sk-quota-reliability"), "API key never hits the server log");
    ok("security: no secrets in jobs/messages/reminders/ledger/responses/logs");

    origLog(`\n✅ petgpt-quota-reliability.test.js — passed (provider calls ${requests.length})`);
  } finally {
    const { stopWorker } = require("../jobs/generation.worker");
    await stopWorker();
    await mock.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await new Promise((resolve) => apiServer.close(resolve));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});