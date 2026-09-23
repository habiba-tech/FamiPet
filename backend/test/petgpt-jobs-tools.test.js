// =========================================================
// Phase 5 — Durable generation through the real tool-calling path.
// ---------------------------------------------------------
// Runs the API router + the durable worker + a mock OpenAI-compatible
// provider that talks the tool-calling dialect:
//   round 1 -> assistant tool_calls -> the worker executes the tools
//              (backend-only, ownership-enforced) inside the job,
//   round 2 -> final text -> persisted assistant message.
//
// Covers:
//   * durable worker -> tool execution -> provider -> final response
//   * persisted assistant message with bounded `toolCalls` metadata
//   * per-tool failures handled as model-safe results
//   * bounded iterations: a provider that never finishes ends the job
//     safely (no fabricated answer), provider request count == cap
//   * ownership isolation of tool results in the durable path
//   * provider transport failure -> failed job (regression)
//   * no secrets in messages, jobs, API responses, or logs
// =========================================================

const assert = require("assert");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const WORKER_POLL_MS = 60;

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/animal_planet_petgpt_jobs_tools_test";
process.env.JWT_SECRET = "petgpt-jobs-tools-secret";
process.env.PETGPT_PROVIDER = "openai";
process.env.PETGPT_OPENAI_BASE_URL = "http://127.0.0.1:4115/v1";
process.env.PETGPT_OPENAI_API_KEY = "sk-jobs-tools";
process.env.PETGPT_OPENAI_MODEL = "test-model";
process.env.PETGPT_TIMEOUT_MS = "10000";
process.env.PETGPT_WORKER_POLL_MS = String(WORKER_POLL_MS);
process.env.PETGPT_WORKER_STALE_MS = "150";
process.env.PETGPT_MAX_JOB_ATTEMPTS = "2";
process.env.PETGPT_MAX_HISTORY_MESSAGES = "3";
process.env.PETGPT_MAX_TOOL_ITERATIONS = "2";

const GenerationJob = require("../models/GenerationJob");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Pet = require("../models/Pet");
const Breed = require("../models/Breed");
const { TOOL_CALLS_METADATA_MAX } = require("../ai/tool-calling");

// Capture server logs for the security scan.
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
  await GenerationJob.init();

  let mode = "ok"; // ok | toolfail | always-tools | http500
  const requests = [];

  const respond = (res, message) => {
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        id: "chatcmpl-tools",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "test-model",
        choices: [{ index: 0, message }],
      })
    );
  };

  const mock = http
    .createServer((req, res) => {
      if (req.method !== "POST") return res.writeHead(404).end();
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const payload = JSON.parse(body);
        if (payload.stream === true) return res.writeHead(400).end("stream unsupported");
        if (!payload.tools) return respond(res, { role: "assistant", content: "no-tools-error" });
        requests.push(payload);

        if (mode === "http500") {
          return res.writeHead(500, { "content-type": "application/json" }).end(
            JSON.stringify({ error: { message: "tool provider exploded", type: "server_error" } })
          );
        }

        const last = payload.messages && payload.messages[payload.messages.length - 1];
        const hasToolRound = last && last.tool_calls && last.tool_calls.length;
        const hasToolResult = last && last.role === "tool";

        if (mode === "always-tools") {
          return respond(res, {
            role: "assistant",
            content: "",
            tool_calls: [{ id: "call_1", type: "function", function: { name: "get_my_pets", arguments: "{}" } }],
          });
        }
        if (!hasToolRound && !hasToolResult) {
          // First provider round of "ok" / "toolfail": request a tool once,
          // then the next round (which carries the tool result) yields text.
          const isOk = mode === "ok";
          return respond(res, {
            role: "assistant",
            content: "",
            tool_calls: [{
              id: isOk ? "call_1" : "call_bad",
              type: "function",
              function: { name: isOk ? "get_my_pets" : "wipe_all_data", arguments: "{}" },
            }],
          });
        }
        respond(res, { role: "assistant", content: "Your pets: I checked them for you." });
      });
    })
    .listen(4115, "127.0.0.1");

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

  try {
    const alice = await makeUser("Alice");
    const bob = await makeUser("Bob");
    const convA = await makeConversation(alice.token, "Alice Tool Chat");
    const convB = await makeConversation(bob.token, "Bob Tool Chat");

    const breed = await Breed.create({ name: "Beagle", species: "dog" });
    await Pet.create({ owner: alice.user._id, breed: breed._id, name: "Rex", species: "dog", gender: "male", age: 3 });
    await Pet.create({ owner: bob.user._id, breed: breed._id, name: "Max", species: "dog", gender: "male", age: 5 });

    const { startWorker } = require("../jobs/generation.worker");
    startWorker();
    await new Promise((r) => setTimeout(r, 80));

    // ---- A. durable tool flow: worker executes tool + persists answer ----
    mode = "ok";
    const post = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "Tell me about my pets, checking them with tools.",
    });
    assert.strictEqual(post.status, 202, "in-scope generation returns 202");
    assert.ok(post.json.job, "202 carries the job");
    const jobId = post.json.job.id;

    const L1 = await awaitJobTerminal(alice.token, jobId);
    assert.strictEqual(L1.job.status, "completed", "tool-backed job completes");
    assert.strictEqual(L1.assistantMessage.content, "Your pets: I checked them for you.");
    assert.strictEqual(requests.length, 2, "one tool round then the final answer = 2 provider calls");

    // The second provider request carries the tool-result turn fed back.
    const round2 = requests[requests.length - 1];
    const toolResult = round2.messages.find((m) => m.role === "tool");
    assert.ok(toolResult, "tool result fed back to the provider as a tool turn");
    assert.ok(toolResult.content.includes("Rex"), "tool result carries alice's pet data");
    assert.ok(!toolResult.content.includes("Max"), "tool result never leaks bob's pet (ownership enforced in the durable path)");
    const assistantToolCall = round2.messages.find((m) => m.role === "assistant" && m.tool_calls);
    assert.ok(assistantToolCall, "assistant tool-call turn precedes the tool result");

    // Persisted assistant message carries bounded toolCalls metadata.
    const assistantDoc = await Message.findById(L1.assistantMessage.id).lean();
    assert.ok(Array.isArray(assistantDoc.toolCalls), "assistant message persisted toolCalls");
    assert.strictEqual(assistantDoc.toolCalls.length, 1);
    assert.strictEqual(assistantDoc.toolCalls[0].name, "get_my_pets");
    assert.strictEqual(assistantDoc.toolCalls[0].ok, true);
    assert.ok(assistantDoc.toolCalls.length <= TOOL_CALLS_METADATA_MAX, "metadata bounded");

    // Conversation retrieval stays clean and exposes the same metadata.
    const convRead = (await api("GET", `/conversations/${convA}`, alice.token)).json;
    assert.strictEqual(convRead.messages.length, 2);
    const aMsg = convRead.messages[1];
    assert.strictEqual(aMsg.role, "assistant");
    assert.ok(Array.isArray(aMsg.toolCalls) && aMsg.toolCalls.length === 1, "public conversation exposes toolCalls");

    // Job API response exposes the same metadata on the assistant message.
    const jobRead = await api("GET", `/jobs/${jobId}`, alice.token);
    assert.ok(jobRead.json.assistantMessage.toolCalls, "job API exposes assistant toolCalls");

    // ---- B. per-tool failure is model-safe, does not fail the job --------
    mode = "toolfail";
    const fPost = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "Please run the maintenance tool.",
    });
    const L2 = await awaitJobTerminal(alice.token, fPost.json.job.id);
    assert.strictEqual(L2.job.status, "completed", "a failing tool call does not fail the job");
    assert.strictEqual(L2.assistantMessage.content, "Your pets: I checked them for you.");
    const failDoc = await Message.findById(L2.assistantMessage.id).lean();
    assert.strictEqual(failDoc.toolCalls.length, 1);
    assert.strictEqual(failDoc.toolCalls[0].name, "wipe_all_data");
    assert.strictEqual(failDoc.toolCalls[0].ok, false);
    assert.ok(typeof failDoc.toolCalls[0].error === "string", "failure error recorded");

    // ---- C. bounded iterations: never-finished model -> safe failed job --
    mode = "always-tools";
    const requestsBefore = requests.length;
    const bPost = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "Keep using tools forever please.",
    });
    const L3 = await awaitJobTerminal(alice.token, bPost.json.job.id);
    assert.strictEqual(L3.job.status, "failed", "a provider that never stops gets a safe failed job");
    assert.strictEqual(L3.job.error.code, "provider");
    assert.strictEqual(requests.length - requestsBefore, 2, "provider called exactly maxIterations(=2) times, then stopped");
    const after = (await api("GET", `/conversations/${convA}`, alice.token)).json.messages;
    assert.strictEqual(after[after.length - 1].role, "user", "no fabricated assistant reply when the model never finished");
    assert.strictEqual(await GenerationJob.countDocuments({ status: { $in: ["queued", "processing"] } }), 0, "no dangling jobs");

    // ---- D. provider transport failure -> failed job (regression) --------
    mode = "http500";
    const ePost = await api("POST", `/conversations/${convA}/messages`, alice.token, {
      content: "This will 500 in the tool path.",
    });
    const L4 = await awaitJobTerminal(alice.token, ePost.json.job.id);
    assert.strictEqual(L4.job.status, "failed");
    assert.strictEqual(L4.job.error.code, "provider");
    assert.strictEqual(L4.assistantMessage, null, "no assistant message on a failed job");

    // ---- E. ownership isolation + security scan ---------------------------
    const foreignR = await api("GET", `/jobs/${jobId}`, bob.token);
    assert.strictEqual(foreignR.status, 404, "another user cannot read alice's job");

    const jobJson = JSON.stringify(await GenerationJob.find().lean());
    const msgJson = JSON.stringify(await Message.find().lean());
    const responseBundle = JSON.stringify([post.json, L1, L2, L3, L4]);
    const requestJson = JSON.stringify(requests);
    for (const secret of ["sk-jobs-tools", process.env.PETGPT_OPENAI_BASE_URL, "apiKeyEnc", "Bearer"]) {
      assert.ok(!jobJson.includes(secret), `job docs never contain ${secret}`);
      assert.ok(!msgJson.includes(secret), `messages never contain ${secret}`);
      assert.ok(!responseBundle.includes(secret), `API responses never contain ${secret}`);
      assert.ok(!requestJson.includes(secret), `provider requests never contain ${secret}`);
    }
    const allLogs = logs.join("\n");
    assert.ok(!allLogs.includes("sk-jobs-tools"), "API key never hits the server log");
    assert.strictEqual(assistantDoc.toolCalls.length <= TOOL_CALLS_METADATA_MAX, true, "persisted metadata bounded");

    origLog(`\n✅ petgpt-jobs-tools.test.js — passed (${requests.length} provider calls, jobs: ${await GenerationJob.countDocuments()})`);
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