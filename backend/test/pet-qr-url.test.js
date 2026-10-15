// =========================================================
// Pet QR payload URL — pure unit test (no DB).
// Run: node test/pet-qr-url.test.js
//
// The QR encodes a stable destination URL built from the deployment's
// PUBLIC_APP_URL (falling back to CLIENT_URL), never a hardcoded
// localhost URI. Scanning resolves to the public Pet Details page; the
// browser suite decodes an actual generated QR to prove the image
// contains exactly this string.
// =========================================================

const assert = require("assert");
const { petQrBaseUrl, petQrPayloadUrl } = require("../utils/petQr");

const ok = (msg) => console.log("ok - " + msg);

// Set both QR-affecting env vars for the duration of one check. Unset means
// delete. PUBLIC_APP_URL is cleared by default so the CLIENT_URL fallback
// cases are not accidentally short-circuited by an ambient value.
const withEnv = ({ publicAppUrl, clientUrl }, fn) => {
  const keys = ["PUBLIC_APP_URL", "CLIENT_URL"];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const set = (k, v) => (v === undefined ? delete process.env[k] : (process.env[k] = v));
  set("PUBLIC_APP_URL", publicAppUrl);
  set("CLIENT_URL", clientUrl);
  try {
    fn();
  } finally {
    for (const k of keys) set(k, prev[k]);
  }
};

// ---- PUBLIC_APP_URL wins over CLIENT_URL (the production fix) ----
withEnv({ publicAppUrl: "https://famipet.example.com", clientUrl: "http://localhost:8080,https://famipet.example.com" }, () => {
  assert.strictEqual(
    petQrBaseUrl(),
    "https://famipet.example.com",
    "PUBLIC_APP_URL is used even when CLIENT_URL lists localhost first",
  );
  assert.strictEqual(
    petQrPayloadUrl("abc-123"),
    "https://famipet.example.com/pet/abc-123",
    "payload uses the PUBLIC_APP_URL origin",
  );
  ok("QR base uses PUBLIC_APP_URL, never the localhost-first CLIENT_URL");
});

withEnv({ publicAppUrl: "https://famipet.example.com/", clientUrl: "http://localhost:8080" }, () => {
  assert.strictEqual(petQrBaseUrl(), "https://famipet.example.com", "trailing slash trimmed on PUBLIC_APP_URL");
  ok("QR base trims a trailing slash");
});

// ---- fallback to CLIENT_URL when PUBLIC_APP_URL is unset (local dev) ----
withEnv({ publicAppUrl: undefined, clientUrl: "https://famipet.example.com" }, () => {
  assert.strictEqual(
    petQrPayloadUrl("abc-123"),
    "https://famipet.example.com/pet/abc-123",
    "payload falls back to the configured CLIENT_URL origin",
  );
  ok("QR payload falls back to CLIENT_URL when PUBLIC_APP_URL is unset");
});

withEnv({ publicAppUrl: undefined, clientUrl: "https://famipet.example.com,http://10.0.0.2" }, () => {
  assert.strictEqual(petQrBaseUrl(), "https://famipet.example.com", "comma list keeps the first origin");
  ok("QR base takes the first entry of a comma-separated CLIENT_URL");
});

withEnv({ publicAppUrl: undefined, clientUrl: undefined }, () => {
  assert.ok(
    petQrBaseUrl().startsWith("http://"),
    "with neither var set the base is a plain http origin (never a hardcoded QR host)",
  );
  ok("QR base stays http(s) when PUBLIC_APP_URL and CLIENT_URL are unset");
});

withEnv({ publicAppUrl: "https://famipet.example.com", clientUrl: undefined }, () => {
  assert.strictEqual(
    petQrPayloadUrl("uid with spaces/"),
    "https://famipet.example.com/pet/uid%20with%20spaces%2F",
    "petUid is URL-encoded into the destination",
  );
  ok("petUid is URL-encoded into the QR destination");
});

console.log("\nAll pet QR URL checks passed.");
