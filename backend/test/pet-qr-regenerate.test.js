// =========================================================
// Pet QR regeneration — assert-based E2E checks.
// Run: node test/pet-qr-regenerate.test.js
// Requires a reachable MongoDB (name forced to a `*_test` db by
// test/db.js). Dropped before and after.
//
// Covers the stale-QR half of the bug: a pet whose stored QR was
// generated for an old origin (e.g. localhost) must be re-encoded
// with the currently configured PUBLIC_APP_URL when the client asks
// for it, and the corrected image must be persisted.
// =========================================================

const assert = require("assert");
const { testDbUri } = require("./db");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const { petQrPayloadUrl } = require("../utils/petQr");

const DB_NAME = "animal_planet_pet_qr_regen_test";
const URI = testDbUri(DB_NAME);

process.env.JWT_SECRET = process.env.JWT_SECRET || "pet-qr-regen-test-secret";

const withPublicBase = async (value, fn) => {
  const prev = process.env.PUBLIC_APP_URL;
  const prevClient = process.env.CLIENT_URL;
  process.env.PUBLIC_APP_URL = value;
  delete process.env.CLIENT_URL;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = prev;
    if (prevClient === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = prevClient;
  }
};

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

async function initAppRouter() {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/pets", require("../routes/pet.routes"));
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
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, data };
}

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  const server = await initAppRouter();
  const base = `http://127.0.0.1:${server.address().port}`;

  const User = require("../models/User");
  const Pet = require("../models/Pet");
  const Breed = require("../models/Breed");

  const breed = await Breed.create({ name: "QrRegenBreed", species: "dog" });
  const alice = await User.create({ name: "Alice", email: "qr-regen@test.dev", password: "testpass123", role: "user" });
  const token = jwt.sign({ id: alice._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const created = await api(base, "POST", "/api/pets", token, {
    breed: breed._id.toString(), name: "Rover", species: "dog", gender: "male", age: 1,
  });
  assert.strictEqual(created.status, 201, "pet created");
  const petId = created.data.pet._id;
  const petUid = created.data.pet.petUid;
  assert.ok(petUid, "pet got a digital pet UID");

  // Simulate a pet whose stored QR was minted for the WRONG origin (the
  // pre-fix behaviour: localhost), then ask for it with the public base set.
  await Pet.updateOne({ _id: petId }, { qrCode: "data:image/png;base64,STALE_LOCALHOST_QR" });

  const { fresh, expected } = await withPublicBase("https://public.example.com", async () => {
    const res = await api(base, "GET", `/api/pets/${petId}/qr`, token);
    const encoded = await QRCode.toDataURL(petQrPayloadUrl(petUid));
    return { fresh: res, expected: encoded };
  });
  assert.strictEqual(fresh.status, 200, "owner can regenerate the QR");
  assert.notStrictEqual(fresh.data.qrCode, "data:image/png;base64,STALE_LOCALHOST_QR", "stale QR was replaced");

  assert.strictEqual(fresh.data.qrCode, expected, "returned QR encodes the CURRENT PUBLIC_APP_URL payload");
  ok("regeneration re-encodes the QR with the configured public origin");

  const persisted = await Pet.findById(petId).select("qrCode petUid");
  assert.strictEqual(persisted.qrCode, expected, "corrected QR is persisted to the database");
  assert.strictEqual(persisted.petUid, petUid, "the digital pet UID is stable across regeneration");
  ok("corrected QR persists and the UID stays stable");

  // The public lookup still resolves through that stable UID.
  const pub = await api(base, "GET", `/api/pets/public/${petUid}`);
  assert.strictEqual(pub.status, 200, "public lookup by UID still works after regeneration");
  assert.strictEqual(pub.data.pet.petUid, petUid, "public lookup resolves the same pet");
  ok("public UID lookup intact after regeneration");

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();

  console.log(`\n${passed} checks passed`);
  process.exit(0);
})().catch((error) => {
  console.error("\nFAIL -", error.message);
  process.exit(1);
});
