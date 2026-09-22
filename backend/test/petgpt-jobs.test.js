// =========================================================
// Phase 4 — Durable AI Generation / Background Jobs tests
// ---------------------------------------------------------
// Runs the router against a mock OpenAI-compatible provider.
// Env is set BEFORE requiring config/ai.js because AI_CONFIG is
// frozen at require time. The provider is "openai" (env), so no
// encryption key is required and no ApiProvider doc is consulted.
//
// Coverage:
//  * job lifecycle: queued -> processing -> completed (persisted)
//  * durability: response 202 before generation finishes; job and
//    assistant message queried independently after the request ends
//  * follow-up reuses the persisted conversation history + pet context
//  * provider failure -> safe client error, no fake assistant message
//  * idempotency: duplicate key reuse, parallel race (unique index),
//    conflicting reuse (409), failed-job reuse, cross-user scope
//  * concurrency: a queued job can only be claimed by one attempt
//  * staleness: reaper requeues stale jobs, fails them once attempts
//    are exhausted (bounded retry)
//  * security: ownership-scoped reads, no secrets in job responses
//    or server logs
// =========================================================

const assert = require("assert");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const WORKER_POLL_MS = 60;
const WORKER_STALE_MS = 150;
const MAX_ATTEMPTS = 2;
const SLOW_DELAY = 2500;

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/animal_planet_petgpt_jobs_test";
process.env.JWT_SECRET = "petgpt-jobs-test-secret";
process.env.PETGPT_PROVIDER = "openai";
process.env.PETGPT_OPENAI_BASE_URL = "http://127.0.0.1:4105/v1";
process.env.PETGPT_OPENAI_API_KEY = "sk-test-jobs";
process.env.PETGPT_OPENAI_MODEL = "test-model";
process.env.PETGPT_TIMEOUT_MS = "10000";
process.env.PETGPT_WORKER_POLL_MS = String(WORKER_POLL_MS);
process.env.PETGPT_WORKER_STALE_MS = String(WORKER_STALE_MS);
process.env.PETGPT_MAX_JOB_ATTEMPTS = String(MAX_ATTEMPTS);
process.env.PETGPT_MAX_HISTORY_MESSAGES = "3";

const GenerationJob = require("../models/GenerationJob");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Pet = require("../models/Pet");
const Breed = require("../models/Breed");
const { AI_CONFIG } = require("../config/ai");

// Capture server logs for the security scan; keep them visible live.
const logs = [];
const origLog = console.log;
const origError = console.error;
console.log = (...a) => { logs.push(a.map(String).join(" ")); origLog(...a); };
console.error = (...a) => { logs.push(a.map(String).join(" ")); origError(...a); };

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
  // Rebuild indexes (unique {owner, idempotencyKey}) that dropDatabase removed.
  await GenerationJob.init();

  let mockMode = "ok";
  const requests = [];

  const mock = http
    .createServer((req, res) => {
      if (req.method !== "POST") return res.writeHead(404).end();
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const payload = JSON.parse(body);
        if (payload.stream === true) return res.writeHead(400).end("stream unsupported");
        requests.push(payload);

        if (mockMode === "slow") {
          return setTimeout(() => respond("slow-response"), SLOW_DELAY);
        }
        if (mockMode === "http500") {
          return res.writeHead(500, { "content-type": "application/json" }).end(
            JSON.stringify({ error: { message: "mock provider exploded", type: "server_error" } })
          );
        }
        respond("ok-response");
      });

      function respond(text) {
        res.writeHead(200, { "content-type": "application/json" }).end(
          JSON.stringify({
            id: "chatcmpl-test",
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: "test-model",
            choices: [{ index: 0, message: { role: "assistant", content: text } }],
          })
        );
      }
    })
    .listen(4105, "127.0.0.1");

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

  // Poll /api/ai/jobs/:id until the job leaves queued/processing, recording
  // every observed status so tests can assert the journey actually passed
  // through a state.
  async function awaitJobTerminal(token, jobId, timeoutMs = 15000) {
    const observed = [];
    const started = Date.now();
    let last;
    while (Date.now() - started < timeoutMs) {
      const r = await api("GET", `/jobs/${jobId}`, token);
      assert.strictEqual(r.status, 200, `job ${jobId} should be readable while running`);
      last = r.json;
      observed.push(last.job.status);
      if (["completed", "failed"].includes(last.job.status)) return { ...last, observed };
      await new Promise((r2) => setTimeout(r2, 40));
    }
    throw new Error(`job ${jobId} did not reach a terminal state in time; observed ${observed}`);
  }

  try {
    const alice = await makeUser("Alice");
    const bob = await makeUser("Bob");

    // Out-of-scope exchange stays synchronous (no job) — preserved behavior.
    const scopeMsg = await api("POST", "/conversations", alice.token, { title: "Scope" });
    const scopeConv = scopeMsg.json.conversation.id;
    const scopeSend = await api("POST", `/conversations/${scopeConv}/messages`, alice.token, {
      content: "What is the capital of France?",
    });
    assert.strictEqual(scopeSend.status, 200, "out-of-scope -> 200");
    assert.strictEqual(scopeSend.json.scopeHandled, true);
    assert.strictEqual(scopeSend.json.job, undefined, "scope exchange creates no job");
    assert.ok(scopeSend.json.assistantMessage, "scope exchange returns the canned answer immediately");

    const convA = await makeConversation(alice.token, "Alice Chat");
    const convA2 = await makeConversation(alice.token, "Alice Chat 2");
    const convB = await makeConversation(bob.token, "Bob Chat");

    // Alice owns a pet; the worker must reuse it as context in the prompt.
    const breed = await Breed.create({ name: "Labrador", species: "dog" });
    await Pet.create({
      owner: alice.user._id,
      breed: breed._id,
      name: "Rex",
      species: "dog",
      gender: "male",
      age: 3,
    });

    // ---- A. auth gate on job status API --------------------------------
    const unauthR = await api("GET", "/jobs/000000000000000000000000", null);
    assert.strictEqual(unauthR.status, 401, "job status API requires a token");
    const badIdR = await api("GET", "/jobs/not-an-object-id", alice.token);
    assert.strictEqual(badIdR.status, 400, "invalid job id -> 400");
    assert.strictEqual(badIdR.json.message, "Invalid job ID.");
    const ghostR = await api("GET", "/jobs/000000000000000000000000", alice.token);
    assert.strictEqual(ghostR.status, 404, "unknown job id -> 404");

    // ---- B. concurrency: only one claimer wins (worker NOT running) ----
    const { claimNext } = require("../jobs/generation.worker");
    const ghostId = new mongoose.Types.ObjectId();
    const qJob = await GenerationJob.create({ owner: alice.user._id, conversation: ghostId, userMessage: ghostId });
    const c1 = await claimNext();
    assert.ok(c1, "queued job should be claimable");
    assert.strictEqual(String(c1._id), String(qJob._id));
    assert.strictEqual(c1.status, "processing");
    assert.strictEqual(c1.attemptCount, 1, "first claim increments attempt to 1");
    const c2 = await claimNext();
    assert.strictEqual(c2, null, "already-processing job cannot be claimed by a second attempt");

    // ---- C. staleness: reaper requeues, bounded by maxAttempts ---------
    const { reapStale } = require("../jobs/generation.worker");
    const recent = await GenerationJob.create({
      owner: alice.user._id, conversation: ghostId, userMessage: ghostId,
      status: "processing", startedAt: new Date(),
    });
    const oldLo = await GenerationJob.create({
      owner: alice.user._id, conversation: ghostId, userMessage: ghostId,
      status: "processing", startedAt: new Date(Date.now() - 5000), attemptCount: 0,
    });
    const oldHi = await GenerationJob.create({
      owner: alice.user._id, conversation: ghostId, userMessage: ghostId,
      status: "processing", startedAt: new Date(Date.now() - 5000), attemptCount: MAX_ATTEMPTS,
    });
    await reapStale();
    assert.strictEqual((await GenerationJob.findById(recent._id)).status, "processing", "recently-started job is untouched");
    assert.strictEqual((await GenerationJob.findById(oldLo._id)).status, "queued", "stale job below attempt cap is requeued");
    const oldHiAfter = await GenerationJob.findById(oldHi._id);
    assert.strictEqual(oldHiAfter.status, "failed", "stale job at attempt cap is failed");
    assert.strictEqual(oldHiAfter.error.code, "timeout");
    assert.ok(oldHiAfter.failedAt instanceof Date, "failed job has failedAt");

    // Requeue -> reclaim -> exhausted attempts -> failed (bounded retry).
    await GenerationJob.updateOne({ _id: oldLo._id }, { attemptCount: MAX_ATTEMPTS - 1, startedAt: new Date() });
    const reclaim = await claimNext();
    assert.strictEqual(String(reclaim._id), String(oldLo._id));
    await GenerationJob.updateOne({ _id: oldLo._id }, { startedAt: new Date(Date.now() - 5000) });
    await reapStale();
    assert.strictEqual((await GenerationJob.findById(oldLo._id)).status, "failed", "reclaimed job with exhausted attempts fails");

    // ---- D. start the worker --------------------------------------------
    const { startWorker } = require("../jobs/generation.worker");
    startWorker();
    await new Promise((r) => setTimeout(r, 80));

    // ---- E. lifecycle: 202 before generation, processing observable ----
    mockMode = "slow";
    const t0 = Date.now();
    const post = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "Give me a detailed puppy food plan",
    });
    const elapsed = Date.now() - t0;
    assert.strictEqual(post.status, 202, "in-scope generation returns 202 Accepted");
    assert.ok(elapsed < SLOW_DELAY, `POST returned before provider finished (took ${elapsed}ms)`);
    assert.strictEqual(post.json.success, true);
    assert.strictEqual(post.json.conversationId, convA);
    assert.ok(post.json.job, "202 response carries the job object");
    assert.ok(["queued", "processing"].includes(post.json.job.status), `initial status queued/processing (saw ${post.json.job.status})`);
    assert.strictEqual(post.json.job.userMessageId, post.json.userMessage.id, "job references the persisted user message");
    assert.ok(!post.json.assistantMessage, "202 carries no assistant message");
    const jobId = post.json.job.id;

    const L1 = await awaitJobTerminal(alice.token, jobId);
    assert.ok(L1.observed.includes("processing"), `lifecycle passed through processing (saw ${L1.observed})`);
    assert.strictEqual(L1.job.status, "completed");
    assert.ok(L1.job.completedAt, "completed job has completedAt");
    assert.ok(L1.job.startedAt, "job records startedAt");
    assert.ok(L1.job.attemptCount >= 1, "job records attemptCount");
    assert.ok(L1.assistantMessage, "completed job exposes its assistant message");
    assert.strictEqual(L1.assistantMessage.content, "slow-response");
    assert.strictEqual(L1.assistantMessage.role, "assistant");

    // Durability: job + assistant message remain queryable after the POST
    // request is long over (they are re-read from the DB, not the request).
    const againR = await api("GET", `/jobs/${jobId}`, alice.token);
    assert.strictEqual(againR.status, 200);
    assert.strictEqual(againR.json.job.id, jobId);
    assert.strictEqual(againR.json.job.status, "completed");
    assert.strictEqual(againR.json.job.conversationId, convA);
    assert.strictEqual(againR.json.userMessage.content, "Give me a detailed puppy food plan");

    // Conversation record now holds both turns, in order.
    const convARead = (await api("GET", `/conversations/${convA}`, alice.token)).json;
    assert.strictEqual(convARead.messages.length, 2, "both turns persisted");
    assert.strictEqual(convARead.messages[0].content, "Give me a detailed puppy food plan");
    assert.strictEqual(convARead.messages[0].role, "user");
    assert.strictEqual(convARead.messages[1].role, "assistant");
    assert.strictEqual(convARead.messages[1].content, "slow-response");

    // ---- F. follow-up reuses persisted history + pet context -------------
    mockMode = "ok";
    const fUp = await api("POST", `/conversations/${convA}/messages`, alice.token, { content: "What about treats?" });
    const L2 = await awaitJobTerminal(alice.token, fUp.json.job.id);
    assert.strictEqual(L2.job.status, "completed");
    const follow = requests[requests.length - 1];
    assert.ok(follow.messages, "follow-up sent the persisted history");
    const texts = follow.messages.map((m) => m.content);
    assert.strictEqual(follow.messages[follow.messages.length - 1].role, "user", "history closes with the user turn");
    assert.ok(texts[texts.length - 1].includes("What about treats?"), "follow-up question is the user turn");
    assert.ok(texts[texts.length - 1].includes("Rex"), "worker reused the user's owned pet context (Rex)");
    assert.strictEqual((await api("GET", `/conversations/${convA}`, alice.token)).json.messages.length, 4, "history grew to two full turns");

    // ---- G. provider failure -> failed job, safe error, no fake answer ---
    mockMode = "http500";
    const failR = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "Should I call the vet for sneezing?",
    });
    const F1 = await awaitJobTerminal(alice.token, failR.json.job.id);
    assert.strictEqual(F1.job.status, "failed");
    assert.strictEqual(F1.job.error.code, "provider");
    assert.strictEqual(F1.job.error.message, "AI generation failed. Please try again.");
    assert.ok(F1.job.failedAt, "failed job has failedAt");
    assert.strictEqual(F1.assistantMessage, null, "no assistant message on a failed job");
    const msgsAfterFail = (await api("GET", `/conversations/${convA}`, alice.token)).json.messages;
    assert.strictEqual(msgsAfterFail[msgsAfterFail.length - 1].role, "user", "no fabricated assistant reply after failure");
    assert.strictEqual(msgsAfterFail[msgsAfterFail.length - 1].content, "Should I call the vet for sneezing?");

    // ---- H. idempotency --------------------------------------------------
    mockMode = "ok";
    const dupR = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "Dup question one",
      idempotencyKey: "dup-1",
    });
    await awaitJobTerminal(alice.token, dupR.json.job.id);

    const countBefore = (await api("GET", `/conversations/${convA}`, alice.token)).json.messages.length;
    const dupOK = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "Dup question one",
      idempotencyKey: "dup-1",
    });
    assert.strictEqual(dupOK.status, 200, "same key + same conversation -> 200 reuse");
    assert.strictEqual(dupOK.json.reused, true);
    assert.strictEqual(dupOK.json.job.id, dupR.json.job.id, "reuse returns the original job");
    assert.strictEqual(dupOK.json.job.status, "completed");
    assert.strictEqual((await api("GET", `/conversations/${convA}`, alice.token)).json.messages.length, countBefore, "reuse persisted nothing new");

    // Conflicting reuse of the same key on a different conversation -> 409.
    const dupConflict = await api("POST", `/conversations/${convA2}/messages`, alice.token, {
      content: "Different conversation, same key",
      idempotencyKey: "dup-1",
    });
    assert.strictEqual(dupConflict.status, 409, "same key + different conversation -> 409");

    // A different user may use the same string freely: keys are owner-scoped.
    const bobDup = await api("POST", `/conversations/${convB}/messages`, bob.token, {
      content: "Bob's own question",
      idempotencyKey: "dup-1",
    });
    assert.strictEqual(bobDup.status, 202, "bob can reuse the string; it's a different owner scope");
    await awaitJobTerminal(bob.token, bobDup.json.job.id);
    assert.strictEqual(await GenerationJob.countDocuments({ owner: bob.user._id, idempotencyKey: "dup-1" }), 1);

    // Parallel identical submissions: the unique (owner, key) index lets
    // exactly one job and one user message through; the loser is cleaned up.
    const [p1, p2] = await Promise.all([
      api("POST", `/conversations/${convA2}/messages`, alice.token, { content: "Race", idempotencyKey: "dup-race" }),
      api("POST", `/conversations/${convA2}/messages`, alice.token, { content: "Race", idempotencyKey: "dup-race" }),
    ]);
    assert.ok([202, 200].includes(p1.status), `p1 status ${p1.status}`);
    assert.ok([202, 200].includes(p2.status), `p2 status ${p2.status}`);
    assert.strictEqual(await GenerationJob.countDocuments({ idempotencyKey: "dup-race" }), 1, "exactly one job survives a parallel duplicate race");
    // Count the raced user message, not total length: the worker may already
    // have written the assistant reply before this GET, which would make a
    // plain length delta flaky.
    const raceAfter = (await api("GET", `/conversations/${convA2}`, alice.token)).json.messages.filter((m) => m.role === "user" && m.content === "Race");
    assert.strictEqual(raceAfter.length, 1, "exactly one user message survives the race");

    // A failed job is still the idempotency result: resubmitting with the
    // same key returns it (no accidental re-generation).
    mockMode = "http500";
    const dupFail = await api("POST", `/conversations/${convB}/messages`, bob.token, {
      content: "Failing dup",
      idempotencyKey: "dup-fail",
    });
    await awaitJobTerminal(bob.token, dupFail.json.job.id);
    const dupFailAgain = await api("POST", `/conversations/${convB}/messages`, bob.token, {
      content: "Failing dup",
      idempotencyKey: "dup-fail",
    });
    assert.strictEqual(dupFailAgain.json.reused, true);
    assert.strictEqual(dupFailAgain.json.job.id, dupFail.json.job.id);
    assert.strictEqual(await GenerationJob.countDocuments({ owner: bob.user._id, idempotencyKey: "dup-fail" }), 1);

    // ---- I. ownership isolation + security scan --------------------------
    const foreignR = await api("GET", `/jobs/${jobId}`, bob.token);
    assert.strictEqual(foreignR.status, 404, "another user cannot read alice's job");

    const jobDocs = await GenerationJob.find().lean();
    const msgDocs = await Message.find({}).lean();
    const jobJson = JSON.stringify(jobDocs);
    const msgJson = JSON.stringify(msgDocs);
    const responseBundle = JSON.stringify([post.json, L1, F1, dupOK.json, p1.json, p2.json]);
    for (const secret of ["sk-test-jobs", process.env.PETGPT_OPENAI_BASE_URL, "apiKeyEnc"]) {
      assert.ok(!jobJson.includes(secret), `job docs never contain ${secret}`);
      assert.ok(!msgJson.includes(secret), `messages never contain ${secret}`);
      assert.ok(!responseBundle.includes(secret), `API responses never contain ${secret}`);
    }
    assert.ok(jobDocs.every((j) => !j.assistantMessage || /^[0-9a-f]{24}$/i.test(String(j.assistantMessage))),
      "assistantMessage is only an ObjectId, never provider content duplicated");
    const allLogs = logs.join("\n");
    assert.ok(!allLogs.includes("sk-test-jobs"), "API key never hits the server log");

    origLog(`\n✅ petgpt-jobs.test.js — passed (${jobDocs.length} jobs, ${requests.length} provider calls)`);
  } finally {
    const { stopWorker } = require("../jobs/generation.worker");
    stopWorker();
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