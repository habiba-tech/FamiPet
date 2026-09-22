// =========================================================
// PetGPT conversations (Phase 2) — assert-based E2E checks.
// Run: node test/conversation-api.test.js
// Requires a reachable MongoDB (MONGODB_URI or the default
// localhost:27017). Uses a dedicated test database, cleaned up
// afterwards. Provider is the default google adapter with no
// GEMINI_API_KEY, so every AI exchange deterministically takes
// the fallback path (existing Phase 1 behaviour).
// =========================================================

const assert = require("assert");
const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const DB_NAME = "animal_planet_petgpt_conv_test";
const URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;
const { AI_CONFIG, outOfScopeResponse } = require("../config/ai");
const { fallbackAnswer } = require("../controllers/ai.controller");

const OUT_OF_SCOPE = outOfScopeResponse("what is the capital of France");
assert.ok(typeof OUT_OF_SCOPE === "string" && OUT_OF_SCOPE.length > 0, "scope gate must block off-topic input");

process.env.JWT_SECRET = process.env.JWT_SECRET || "petgpt-conversation-test-secret";

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

async function api(base, method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON */ }
  return { status: res.status, data };
}

const tokenFor = (userId) => jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  const server = await initAppRouter();
  const base = `http://127.0.0.1:${server.address().port}`;

  const User = require("../models/User");
  const Conversation = require("../models/Conversation");
  const Message = require("../models/Message");

  const users = [];
  for (const [i, email] of ["phase2-a@test.dev", "phase2-b@test.dev"].entries()) {
    users.push(await User.create({ name: `User ${i}`, email, password: "testpass123" }));
  }
  const [alice, bob] = users;
  const aliceTok = tokenFor(alice._id);
  const bobTok = tokenFor(bob._id);

  const convPath = "/api/ai/conversations";

  // ---- Auth gate ----------------------------------------------------
  {
    const a = await api(base, "GET", convPath);
    const b = await api(base, "GET", convPath, "bad-token");
    assert.strictEqual(a.status, 401, "no token -> 401");
    assert.strictEqual(b.status, 401, "bad token -> 401");
    ok("conversations: unauthenticated requests rejected");
  }

  // ---- Create -------------------------------------------------------
  let convId;
  let convC;
  {
    const a = await api(base, "POST", convPath, aliceTok, {});
    assert.strictEqual(a.status, 201, "create -> 201");
    assert.strictEqual(a.data.conversation.title, "New conversation", "default title");
    assert.ok(a.data.conversation.id, "returns id");
    convC = a.data.conversation;
  }
  {
    const a = await api(base, "POST", convPath, aliceTok, { title: "  My puppy questions  " });
    assert.strictEqual(a.status, 201, "create with title -> 201");
    assert.strictEqual(a.data.conversation.title, "My puppy questions", "title trimmed");
    convId = a.data.conversation.id;
  }
  ok("conversations: create with default and custom title");

  // ---- Client-supplied ownership is never trusted -------------------
  {
    const a = await api(base, "POST", convPath, aliceTok, { owner: bob._id.toString() });
    assert.strictEqual(a.status, 201, "owner in body ignored, still 201");
    const bobList = await api(base, "GET", convPath, bobTok);
    assert.ok(!bobList.data.conversations.some((c) => c.id === a.data.conversation.id), "bob cannot see alice conversation");
    ok("conversations: client-supplied owner field ignored");
  }

  // ---- List ---------------------------------------------------------
  {
    const a = await api(base, "GET", convPath, aliceTok);
    assert.strictEqual(a.status, 200, "list -> 200");
    assert.strictEqual(a.data.conversations.length, 3, "alice has 3 conversations");
    const b = await api(base, "GET", convPath, bobTok);
    assert.strictEqual(b.data.conversations.length, 0, "bob has none yet");
    ok("conversations: list scoped to authenticated user");
  }

  // ---- Get ----------------------------------------------------------
  {
    const a = await api(base, "GET", `${convPath}/${convId}`, aliceTok);
    assert.strictEqual(a.status, 200, "get -> 200");
    assert.deepStrictEqual(a.data.messages, [], "empty conversation has no messages");
    ok("conversations: retrieve conversation with empty messages");
  }

  // ---- Invalid id / not found / foreign ownership -------------------
  {
    const bad = await api(base, "GET", `${convPath}/not-an-object-id`, aliceTok);
    assert.strictEqual(bad.status, 400, "invalid id -> 400");
    const ghost = await api(base, "GET", `${convPath}/5f8f8f8f8f8f8f8f8f8f8f8f`, aliceTok);
    assert.strictEqual(ghost.status, 404, "unknown id -> 404");
  }
  {
    const foreignGet = await api(base, "GET", `${convPath}/${convId}`, bobTok);
    const foreignSend = await api(base, "POST", `${convPath}/${convId}/messages`, bobTok, { content: "hey" });
    const foreignDel = await api(base, "DELETE", `${convPath}/${convId}`, bobTok);
    assert.strictEqual(foreignGet.status, 404, "bob cannot read alice conversation");
    assert.strictEqual(foreignSend.status, 404, "bob cannot append to alice conversation");
    assert.strictEqual(foreignDel.status, 404, "bob cannot delete alice conversation");
    const still = await api(base, "GET", `${convPath}/${convId}`, aliceTok);
    assert.strictEqual(still.status, 200, "alice conversation untouched");
    ok("conversations: ownership isolation on read/append/delete");
  }

  // ---- Message validation -------------------------------------------
  {
    const empty = await api(base, "POST", `${convPath}/${convId}/messages`, aliceTok, { content: "   " });
    assert.strictEqual(empty.status, 400, "empty content -> 400");
    assert.strictEqual(empty.data.message, "Message content is required.");
    const oversize = await api(base, "POST", `${convPath}/${convId}/messages`, aliceTok, { content: "x".repeat(AI_CONFIG.maxQuestionLength + 1) });
    assert.strictEqual(oversize.status, 400, "oversized content -> 400");
    const noBody = await api(base, "POST", `${convPath}/${convId}/messages`, aliceTok);
    assert.strictEqual(noBody.status, 400, "missing body -> 400");
    ok("messages: empty / oversized / missing content rejected");
  }

  // ---- Send + persist (fallback path, deterministic) ----------------
  let userMsgId;
  let assistantMsgId;
  {
    const q1 = "What food for a dog?";
    const a = await api(base, "POST", `${convPath}/${convId}/messages`, aliceTok, { content: q1 });
    assert.strictEqual(a.status, 200, "send -> 200");
    assert.strictEqual(a.data.conversationId, convId, "echoes conversation id");
    assert.strictEqual(a.data.userMessage.role, "user");
    assert.strictEqual(a.data.userMessage.content, q1, "user message persisted verbatim");
    assert.strictEqual(a.data.assistantMessage.role, "assistant");
    assert.strictEqual(a.data.assistantMessage.content, fallbackAnswer(q1), "fallback answer persisted (no key)");
    assert.ok(a.data.assistantMessage.content.trim().length > 0, "assistant message non-empty");
    userMsgId = a.data.userMessage.id;
    assistantMsgId = a.data.assistantMessage.id;
  }
  {
    // Client cannot forge a role; backend always writes "user" on send.
    const forged = await api(base, "POST", `${convPath}/${convId}/messages`, aliceTok, { content: "second question", role: "assistant", conversationsOwner: "none" });
    assert.strictEqual(forged.data.userMessage.role, "user", "server-set role wins");
    ok("messages: add + persist user/assistant; roles never client-supplied");
  }

  // ---- Ordering + retrieval -----------------------------------------
  {
    const a = await api(base, "GET", `${convPath}/${convId}`, aliceTok);
    assert.strictEqual(a.data.messages.length, 4, "4 messages persisted (2 exchanges)");
    assert.strictEqual(a.data.messages[0].id, userMsgId, "user message first");
    assert.strictEqual(a.data.messages[1].id, assistantMsgId, "assistant message second");
    const roles = a.data.messages.map((m) => m.role);
    assert.deepStrictEqual(roles, ["user", "assistant", "user", "assistant"], "chronological ordering");
    assert.strictEqual(a.data.conversation.title, "My puppy questions", "custom title preserved (not overwritten)");
    assert.ok(a.data.conversation.lastMessageAt, "lastMessageAt updated");
    const preview = a.data.messages[3].content;
    assert.strictEqual(
      a.data.conversation.lastMessagePreview,
      preview.slice(0, 60) + (preview.length > 60 ? "…" : ""),
      "preview = last assistant message"
    );
    ok("messages: retrieval + ordering + title/metadata updates");

    const b = await api(base, "GET", `${convPath}/${convId}`, bobTok);
    assert.strictEqual(b.status, 404, "bob cannot retrieve alice messages");
    ok("messages: ownership isolation on retrieval");
  }

  // ---- Title derived from first message when conversation is untitled --
  {
    const a = await api(base, "POST", `${convPath}/${convC.id}/messages`, aliceTok, { content: "My puppy is teething a lot" });
    assert.strictEqual(a.status, 200, "send on default-title conversation -> 200");
    const g = await api(base, "GET", `${convPath}/${convC.id}`, aliceTok);
    assert.strictEqual(g.data.conversation.title, "My puppy is teething a lot", "default title replaced by first message");
    ok("conversations: title auto-derived from first message on untitled conversation");
  }

  // ---- Scope gate persists the canned scope answer ------------------
  {
    const a = await api(base, "POST", `${convPath}/${convId}/messages`, aliceTok, { content: "what is the capital of France" });
    assert.strictEqual(a.status, 200, "off-topic -> 200");
    assert.strictEqual(a.data.assistantMessage.content, OUT_OF_SCOPE, "canned scope answer persisted");
    const hist = await api(base, "GET", `${convPath}/${convId}`, aliceTok);
    assert.strictEqual(hist.data.messages.length, 6, "scope exchange persisted too");
    assert.strictEqual(hist.data.messages[4].role, "user", "off-topic question persisted");
    assert.strictEqual(hist.data.messages[5].role, "assistant", "scope answer persisted");
    ok("messages: scope gate persists user + canned scope answer, no provider call");
  }

  // ---- Clear chat ---------------------------------------------------
  {
    const a = await api(base, "DELETE", `${convPath}/${convId}`, aliceTok);
    assert.strictEqual(a.status, 200, "clear -> 200");
    const goneGet = await api(base, "GET", `${convPath}/${convId}`, aliceTok);
    const goneSend = await api(base, "POST", `${convPath}/${convId}/messages`, aliceTok, { content: "revive?" });
    const goneList = await api(base, "GET", convPath, aliceTok);
    assert.strictEqual(goneGet.status, 404, "cleared conversation cannot be read");
    assert.strictEqual(goneSend.status, 404, "cleared conversation cannot be used");
    assert.ok(!goneList.data.conversations.some((c) => c.id === convId), "gone from list");
    const msgCount = await Message.countDocuments({ conversation: convId });
    assert.strictEqual(msgCount, 0, "all messages removed with the conversation");
    ok("conversations: clear chat hard-deletes conversation + all messages; cannot be reused");
  }

  // ---- /api/ai/ask backward compatibility ---------------------------
  {
    const fallback = await api(base, "POST", "/api/ai/ask", aliceTok, { question: "cat food advice?" });
    assert.strictEqual(fallback.status, 200, "/ask -> 200");
    assert.strictEqual(fallback.data.answer, fallbackAnswer("cat food advice?"), "legacy fallback intact");
    const empty = await api(base, "POST", "/api/ai/ask", aliceTok, { question: "" });
    assert.strictEqual(empty.status, 400, "/ask empty -> 400");
    assert.strictEqual(empty.data.message, "Question is required.", "legacy contract intact");
    const scope = await api(base, "POST", "/api/ai/ask", aliceTok, { question: "who won the election yesterday?" });
    assert.strictEqual(scope.data.answer, OUT_OF_SCOPE, "/ask scope gate intact");
    const noToken = await api(base, "POST", "/api/ai/ask", aliceTok, { question: "hello" });
    assert.strictEqual(noToken.status, 200, "/ask still works for authenticated user");
    ok("legacy: POST /api/ai/ask unchanged (fallback, 400, scope gate, auth)");
  }

  // ---- Persisted messages contain no secrets ------------------------
  {
    const persistence = await Message.find({}).lean();
    const bobDoc = await User.findById(bob._id).lean();
    for (const m of persistence) {
      assert.ok(!m.content.includes(process.env.JWT_SECRET), "JWT secret never in messages");
    }
    assert.ok(!JSON.stringify(persistence).includes(bobDoc.password), "password hashes never in messages");
    ok("security: no auth/JWT/secret material in persisted messages");
  }

  await Message.deleteMany({});
  await Conversation.deleteMany({});
  await User.deleteMany({ _id: { $in: [alice._id, bob._id] } });

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));

  console.log(`\nAll ${passed} conversation checks passed.`);
  process.exit(0);
})().catch(async (error) => {
  console.error("FAILED:", error && error.stack ? error.stack : error);
  try { await mongoose.disconnect(); } catch (e) { /* ignore */ }
  process.exit(1);
});