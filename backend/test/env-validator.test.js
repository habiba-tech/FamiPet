// =========================================================
// Env validator (config/env.js) — pure-function checks, no DB.
// Run: node test/env-validator.test.js
//
// Covers the Phase 6 requirement: an environment checker so a
// developer KNOWS what is missing — hard errors for the two
// startup-required variables, loud warnings naming the missing
// piece of every half-configured optional service, and a saner
// CLIENT_URL check.
// =========================================================

const assert = require("assert");
const { analyzeEnv } = require("../config/env");

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

// A healthy environment: only the required vars + a sane CLIENT_URL.
const healthy = {
  MONGODB_URI: "mongodb://mongodb:27017/petDB",
  JWT_SECRET: "a-real-secret",
  CLIENT_URL: "http://localhost:8080,https://famipet.example.com",
};

// ---------------- healthy ----------------
const good = analyzeEnv({ ...healthy });
assert.deepStrictEqual(good.errors, [], "healthy env produces no hard errors");
assert.deepStrictEqual(good.warnings, [], "healthy env (email/push/AI unset = disabled) produces no warnings");
ok("env-validator: healthy environment passes cleanly");

// ---------------- required missing ----------------
const missing = analyzeEnv({});
assert.strictEqual(missing.errors.length, 2, "empty env reports the two required vars as errors");
assert.ok(missing.warnings.length >= 0, "empty env may still warn");
const joinedErrors = missing.errors.join("\n");
assert.ok(/MONGODB_URI/.test(joinedErrors), "MONGODB_URI is named as missing");
assert.ok(/JWT_SECRET/.test(joinedErrors), "JWT_SECRET is named as missing");
ok("env-validator: missing MONGODB_URI+JWT_SECRET are hard errors naming each var");

// ---------------- wrong-typed optional ----------------
const badPort = analyzeEnv({ ...healthy, PORT: "not-a-number" });
assert.strictEqual(badPort.errors.length, 0, "a bad optional value is not a hard error");
assert.ok(badPort.warnings.some((w) => /PORT/.test(w)), "bad PORT is surfaced as a warning");
ok("env-validator: wrong-typed PORT is a warning, not a crash");

// ---------------- CLIENT_URL ----------------
const badClient = analyzeEnv({ ...healthy, CLIENT_URL: "localhost:8080,not-a-url" });
assert.ok(badClient.warnings.some((w) => /CLIENT_URL/.test(w)), "non-URL CLIENT_URL is flagged");
ok("env-validator: malformed CLIENT_URL is flagged");

// ---------------- PUBLIC_APP_URL (QR origin) ----------------
const prodNoAppUrl = analyzeEnv({ ...healthy, NODE_ENV: "production" });
assert.ok(
  prodNoAppUrl.warnings.some((w) => /PUBLIC_APP_URL/.test(w)),
  "production without PUBLIC_APP_URL warns that QR codes would fall back to localhost",
);
ok("env-validator: production without PUBLIC_APP_URL warns");

const prodWithAppUrl = analyzeEnv({ ...healthy, NODE_ENV: "production", PUBLIC_APP_URL: "https://famipet.example.com" });
assert.ok(
  !prodWithAppUrl.warnings.some((w) => /PUBLIC_APP_URL/.test(w)),
  "production with PUBLIC_APP_URL set produces no QR-origin warning",
);
ok("env-validator: production with PUBLIC_APP_URL is quiet");

const badAppUrl = analyzeEnv({ ...healthy, PUBLIC_APP_URL: "not-a-url" });
assert.ok(
  badAppUrl.warnings.some((w) => /PUBLIC_APP_URL/.test(w)),
  "malformed PUBLIC_APP_URL is flagged",
);
ok("env-validator: malformed PUBLIC_APP_URL is flagged");

// ---------------- partially-configured service groups ----------------
const halfEmail = analyzeEnv({ ...healthy, EMAIL_USER: "admin@test.dev" });
assert.strictEqual(halfEmail.errors.length, 0, "half email config does not kill startup");
assert.ok(
  halfEmail.warnings.some((w) => /Email transport/.test(w) && /EMAIL_PASS/.test(w)),
  "half email transport names the missing EMAIL_PASS",
);
ok("env-validator: partial email config warns and names the missing variable");

const halfPush = analyzeEnv({ ...healthy, VAPID_PUBLIC_KEY: "abc", VAPID_SUBJECT: "mailto:admin@x.dev" });
assert.ok(
  halfPush.warnings.some((w) => /Browser push/.test(w) && /VAPID_PRIVATE_KEY/.test(w)),
  "partial VAPID config names the missing VAPID_PRIVATE_KEY",
);
ok("env-validator: partial VAPID config warns");

const halfAI = analyzeEnv({ ...healthy, PETGPT_OPENAI_API_KEY: "secret", PETGPT_OPENAI_MODEL: "free-chat" });
assert.ok(
  halfAI.warnings.some((w) => /PetGPT/.test(w) && /PETGPT_OPENAI_BASE_URL/.test(w)),
  "partial PetGPT config names the missing base URL",
);
ok("env-validator: partial PetGPT config warns");

console.log(`\n${passed} checks passed`);
process.exit(0);