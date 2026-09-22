// =========================================================
// PetGPT provider layer — assert-based checks (no framework,
// no external API keys). Run: node test/ai-provider.test.js
// Covers the provider contract, both adapters, normalized
// error codes, and service-level fallback behaviour.
// =========================================================

const assert = require("assert");
const http = require("http");

(async () => {
  const SAVED_ENV = { ...process.env };

  // Fresh-load the AI layer under a given env snapshot. Config is
  // snapshotted at require time, so env only needs to be present
  // while modules load (mirrors real app boot).
  function loadLayer(env) {
    const prev = {};
    for (const k of Object.keys(env)) {
      prev[k] = process.env[k];
      process.env[k] = env[k];
    }
    for (const m of ["../config/ai", "../ai/provider", "../ai/gemini", "../ai/openai", "../ai/index"]) {
      delete require.cache[require.resolve(m)];
    }
    const mods = {
      ai: require("../ai/index"),
      gemini: require("../ai/gemini"),
      openai: require("../ai/openai"),
      provider: require("../ai/provider"),
      config: require("../config/ai"),
    };
    for (const k of Object.keys(env)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
    return mods;
  }

  function stubFetch(handler) {
    const real = global.fetch;
    global.fetch = handler;
    return () => { global.fetch = real; };
  }

  function geminiStub(overrides) {
    return Object.assign({ ok: true, status: 200, json: async () => OK_GEMINI }, overrides);
  }

  async function awaitCatch(promise) {
    try {
      const value = await promise;
      throw new Error("expected rejection, got value: " + JSON.stringify(value));
    } catch (error) {
      return error;
    }
  }

  function captureLogs() {
    const out = { log: [], err: [] };
    const origLog = console.log, origErr = console.error;
    console.log = (...a) => out.log.push(a.join(" "));
    console.error = (...a) => out.err.push(a.join(" "));
    return { ...out, restore() { console.log = origLog; console.error = origErr; } };
  }

  const OK_GEMINI = { candidates: [{ content: { parts: [{ text: "healthy dog tip" }] } }] };
  const REQUEST = {
    system: "sys-instruction",
    question: "What food for a puppy?",
    petContext: [{ name: "Rex", species: "dog", breed: "Labrador" }],
  };

  let passed = 0;
  const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

  // ---------------------------------------------------------------
  // Gemini adapter (stubbed fetch)
  // ---------------------------------------------------------------

  {
    const { gemini } = loadLayer({}); // no key
    const err = await awaitCatch(gemini.generate(REQUEST));
    assert.strictEqual(err.code, "config", "missing key -> CONFIG");
    ok("gemini: missing key -> config error");
  }

  {
    const restore = stubFetch(async () => geminiStub());
    const { gemini } = loadLayer({ GEMINI_API_KEY: "test-key" });
    const result = await gemini.generate(REQUEST);
    assert.strictEqual(result.text, "healthy dog tip");
    restore();
    ok("gemini: valid response parsed");
  }

  {
    const restore = stubFetch(async () => geminiStub({ ok: false, status: 429 }));
    const { gemini } = loadLayer({ GEMINI_API_KEY: "test-key" });
    const err = await awaitCatch(gemini.generate(REQUEST));
    assert.strictEqual(err.code, "http", "HTTP status -> HTTP");
    restore();
    ok("gemini: HTTP 429 -> http error");
  }

  {
    const restore = stubFetch(async () => geminiStub({ json: async () => { throw new SyntaxError("bad json"); } }));
    const { gemini } = loadLayer({ GEMINI_API_KEY: "test-key" });
    const err = await awaitCatch(gemini.generate(REQUEST));
    assert.strictEqual(err.code, "malformed", "bad JSON -> MALFORMED");
    restore();
    ok("gemini: malformed response -> malformed error");
  }

  {
    const restore = stubFetch(async () => { throw Object.assign(new Error("aborted"), { name: "AbortError" }); });
    const { gemini } = loadLayer({ GEMINI_API_KEY: "test-key" });
    const err = await awaitCatch(gemini.generate(REQUEST));
    assert.strictEqual(err.code, "timeout", "abort -> TIMEOUT");
    restore();
    ok("gemini: transport abort -> timeout error");
  }

  {
    const restore = stubFetch(async () => { throw new Error("ECONNREFUSED"); });
    const { gemini } = loadLayer({ GEMINI_API_KEY: "test-key" });
    const err = await awaitCatch(gemini.generate(REQUEST));
    assert.strictEqual(err.code, "unknown", "network error -> UNKNOWN");
    restore();
    ok("gemini: network failure -> unknown error");
  }

  // ---------------------------------------------------------------
  // OpenAI-compatible adapter — real local mock endpoint
  // ---------------------------------------------------------------

  let mockMode = "ok";
  const server = http.createServer((req, res) => {
    res.on("error", () => {});
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (mockMode === "ok") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ choices: [{ message: { content: "mock openai answer" } }] }));
      } else if (mockMode === "http500") {
        res.statusCode = 500;
        res.end("boom");
      } else if (mockMode === "malformed") {
        res.setHeader("Content-Type", "application/json");
        res.end("this is not json {");
      } else if (mockMode === "slow") {
        setTimeout(() => { try { res.end(JSON.stringify({ choices: [{ message: { content: "late" } }] })); } catch (e) {} }, 2000);
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const mockBaseUrl = "http://127.0.0.1:" + server.address().port;

  const openaiEnv = {
    PETGPT_OPENAI_BASE_URL: mockBaseUrl,
    PETGPT_OPENAI_API_KEY: "sk-test",
    PETGPT_OPENAI_MODEL: "test-model",
  };

  {
    const { openai } = loadLayer({ ...openaiEnv });
    const result = await openai.generate(REQUEST);
    assert.strictEqual(result.text, "mock openai answer", "parses choices[0].message.content");
    ok("openai: real mock endpoint, valid chat-completions parsed");
  }

  {
    mockMode = "http500";
    const { openai } = loadLayer({ ...openaiEnv });
    const err = await awaitCatch(openai.generate(REQUEST));
    assert.strictEqual(err.code, "http", "500 -> HTTP");
    mockMode = "ok";
    ok("openai: HTTP 500 -> http error");
  }

  {
    mockMode = "malformed";
    const { openai } = loadLayer({ ...openaiEnv });
    const err = await awaitCatch(openai.generate(REQUEST));
    assert.strictEqual(err.code, "malformed", "non-JSON -> MALFORMED");
    mockMode = "ok";
    ok("openai: non-JSON response -> malformed error");
  }

  {
    mockMode = "slow";
    const { openai } = loadLayer({ ...openaiEnv, PETGPT_TIMEOUT_MS: "100" });
    const err = await awaitCatch(openai.generate(REQUEST));
    assert.strictEqual(err.code, "timeout", "slow endpoint + short timeout -> TIMEOUT");
    mockMode = "ok";
    ok("openai: timeout -> timeout error");
  }

  {
    const { openai } = loadLayer({ PETGPT_OPENAI_BASE_URL: mockBaseUrl });
    const err = await awaitCatch(openai.generate(REQUEST));
    assert.strictEqual(err.code, "config", "missing key -> CONFIG");
    ok("openai: missing API key -> config error");
  }

  {
    const { openai } = loadLayer({ PETGPT_OPENAI_BASE_URL: mockBaseUrl, PETGPT_OPENAI_API_KEY: "sk-test" });
    const err = await awaitCatch(openai.generate(REQUEST));
    assert.strictEqual(err.code, "config", "missing model -> CONFIG");
    ok("openai: missing model -> config error");
  }

  await new Promise((resolve) => server.close(resolve));

  // Guaranteed-closed port for the network-failure scenario.
  const ghost = http.createServer();
  await new Promise((resolve, reject) => { ghost.once("error", reject); ghost.listen(0, "127.0.0.1", resolve); });
  const ghostPort = ghost.address().port;
  await new Promise((resolve) => ghost.close(resolve));

  // ---------------------------------------------------------------
  // Service layer: selection + normalized fallback (returns null)
  // ---------------------------------------------------------------

  {
    const { ai } = loadLayer({}); // google, no key
    const logs = captureLogs();
    const answer = await ai.generatePetGPTResponse(REQUEST.question, REQUEST.petContext);
    logs.restore();
    assert.strictEqual(answer, null, "service returns null on config failure");
    assert.ok(logs.err.some((l) => l.includes('provider "google" failed (config)')), "log names provider + code");
    ok("service: google no-key -> config failure logged, null returned");
  }

  {
    const { ai } = loadLayer({ PETGPT_PROVIDER: "nope" });
    const answer = await ai.generatePetGPTResponse(REQUEST.question, REQUEST.petContext);
    assert.strictEqual(answer, null, "unknown provider -> null");
    ok("service: unknown provider -> null (fallback) without crashing");
  }

  {
    const restore = stubFetch(async () => geminiStub());
    const { ai } = loadLayer({ GEMINI_API_KEY: "test-key" });
    const answer = await ai.generatePetGPTResponse(REQUEST.question, REQUEST.petContext);
    assert.strictEqual(answer, "healthy dog tip", "service returns provider text");
    restore();
    ok("service: google success -> text returned");
  }

  {
    const restore = stubFetch(async () => geminiStub({ ok: false, status: 503 }));
    const { ai } = loadLayer({ GEMINI_API_KEY: "test-key" });
    const answer = await ai.generatePetGPTResponse(REQUEST.question, REQUEST.petContext);
    assert.strictEqual(answer, null, "provider HTTP failure -> null");
    restore();
    ok("service: google HTTP failure -> null (fallback signal)");
  }

  {
    const { ai } = loadLayer({
      PETGPT_PROVIDER: "openai",
      PETGPT_OPENAI_BASE_URL: "http://127.0.0.1:" + ghostPort,
      PETGPT_OPENAI_API_KEY: "sk-test",
      PETGPT_OPENAI_MODEL: "test-model",
    });
    const logs = captureLogs();
    const answer = await ai.generatePetGPTResponse(REQUEST.question, REQUEST.petContext);
    logs.restore();
    assert.strictEqual(answer, null, "openai network failure -> null");
    assert.ok(logs.err.some((l) => l.includes('provider "openai" failed (unknown)')), "log names provider + code");
    ok("service: openai unavailable -> null (fallback signal)");
  }

  console.log(`\nAll ${passed} provider-layer checks passed.`);
  process.exit(0);
})().catch((error) => {
  console.error("FAILED:", error && error.stack ? error.stack : error);
  process.exit(1);
});