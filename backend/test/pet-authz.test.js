// =========================================================
// Pet direct-ID authorization — assert-based E2E checks.
// Run: node test/pet-authz.test.js
// Requires a reachable MongoDB (MONGODB_URI or the default
// localhost:27017). Uses a dedicated test database, cleaned
// up afterwards.
//
// Covers GET /api/pets/:id ownership isolation (owner, other
// user, admin, anonymous), view-count side effects, and the
// /pets/my, create/update/delete and admin regressions.
// =========================================================

const assert = require("assert");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const DB_NAME = "animal_planet_pet_authz_test";
const URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${DB_NAME}`;

process.env.JWT_SECRET = process.env.JWT_SECRET || "pet-authz-test-secret";

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

async function initAppRouter() {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/pets", require("../routes/pet.routes"));
  app.use("/api/admin", require("../routes/admin.routes"));
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

const tokenFor = (userId) => jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  const server = await initAppRouter();
  const base = `http://127.0.0.1:${server.address().port}`;

  const User = require("../models/User");
  const Pet = require("../models/Pet");
  const Breed = require("../models/Breed");

  const breed = await Breed.create({ name: "TestRetriever", species: "dog" });

  const mk = (name, email, role) =>
    User.create({ name, email, password: "testpass123", role });

  const alice = await mk("Alice", "authz-alice@test.dev", "user");
  const bob = await mk("Bob", "authz-bob@test.dev", "user");
  const root = await mk("Root", "authz-admin@test.dev", "admin");

  const aliceTok = tokenFor(alice._id);
  const bobTok = tokenFor(bob._id);
  const adminTok = tokenFor(root._id);

  // ---- create/read/delete flows still work for the owner ----
  const created = await api(base, "POST", "/api/pets", aliceTok, {
    breed: breed._id.toString(),
    name: "PetA",
    species: "dog",
    gender: "male",
    age: 3,
  });
  assert.strictEqual(created.status, 201, "owner can create a pet");
  const petA = created.data.pet._id;

  const petBCreated = await api(base, "POST", "/api/pets", bobTok, {
    breed: breed._id.toString(),
    name: "PetB",
    species: "cat",
    gender: "female",
    age: 2,
  });
  assert.strictEqual(petBCreated.status, 201, "second user can create a pet");
  const petB = petBCreated.data.pet._id;

  // ---- 1. owner reads own pet ----
  const ownerRead = await api(base, "GET", `/api/pets/${petA}`, aliceTok);
  assert.strictEqual(ownerRead.status, 200, "owner can GET own pet");
  assert.strictEqual(ownerRead.data.pet._id, petA, "owner read returns the pet");
  assert.ok(ownerRead.data.pet.owner, "owner read keeps the owner field populated (frontend contract)");
  ok("owner -> own pet allowed");

  // ---- 2. other normal user cannot read PetA ----
  const crossRead = await api(base, "GET", `/api/pets/${petA}`, bobTok);
  assert.strictEqual(crossRead.status, 403, "non-owner is denied");
  assert.ok(!crossRead.data.pet, "denied read must not leak pet data");
  assert.ok(!crossRead.data.pet?.owner?.email, "denied read must not leak owner contact info");
  ok("other user -> PetA denied (403)");

  // ---- 3. owner cannot read someone else's PetB ----
  const otherRead = await api(base, "GET", `/api/pets/${petB}`, aliceTok);
  assert.strictEqual(otherRead.status, 403, "non-owner is denied symmetrically");
  assert.ok(!otherRead.data.pet, "denied read must not leak pet data");
  ok("owner -> other user's PetB denied (403)");

  // ---- 4. admin can read ----
  const adminRead = await api(base, "GET", `/api/pets/${petA}`, adminTok);
  assert.strictEqual(adminRead.status, 200, "admin can GET any pet");
  assert.strictEqual(adminRead.data.pet._id, petA, "admin read returns the pet");
  ok("admin -> PetA allowed (200)");

  // ---- 5. unauthenticated is 401 ----
  const anonRead = await api(base, "GET", `/api/pets/${petA}`);
  assert.strictEqual(anonRead.status, 401, "unauthenticated request is rejected");
  ok("anonymous -> PetA denied (401)");

  const anonAdmin = await api(base, "GET", "/api/admin/pets", undefined);
  assert.strictEqual(anonAdmin.status, 401, "unauthenticated admin list is rejected");
  ok("anonymous -> admin pet list denied (401)");

  // ---- 6. nonexistent pet keeps existing 404 (for an authorized caller) ----
  const missing = await api(base, "GET", "/api/pets/64b7f0f0f0f0f0f0f0f0f0f0", aliceTok);
  assert.strictEqual(missing.status, 404, "nonexistent pet is 404");
  ok("nonexistent pet -> 404");

  // ---- 6b. invalid id keeps existing 400 ----
  const invalid = await api(base, "GET", "/api/pets/not-an-id", aliceTok);
  assert.strictEqual(invalid.status, 400, "invalid pet id is 400");
  ok("invalid pet id -> 400");

  // ---- 7. unauthorized reads must not increment views ----
  await Pet.updateOne({ _id: petA }, { views: 0 });
  for (let i = 0; i < 3; i++) {
    const denied = await api(base, "GET", `/api/pets/${petA}`, bobTok);
    assert.strictEqual(denied.status, 403, "cross-user probe stays denied");
  }
  const anonProbe = await api(base, "GET", `/api/pets/${petA}`);
  assert.strictEqual(anonProbe.status, 401, "anonymous probe stays denied");
  const afterProbes = await Pet.findById(petA).select("views");
  assert.strictEqual(afterProbes.views, 0, "unauthorized probing must not mutate views");
  ok("unauthorized reads do not increment views");

  // ---- 8. authorized read still increments views (existing behaviour) ----
  const firstOwnerRead = await api(base, "GET", `/api/pets/${petA}`, aliceTok);
  assert.strictEqual(firstOwnerRead.status, 200, "owner read still allowed");
  const afterOwner = await Pet.findById(petA).select("views");
  assert.strictEqual(afterOwner.views, 1, "owner read increments views");
  await api(base, "GET", `/api/pets/${petA}`, adminTok);
  const afterAdmin = await Pet.findById(petA).select("views");
  assert.strictEqual(afterAdmin.views, 2, "admin read increments views");
  ok("authorized reads still increment views");

  // ---- regressions: /pets/my isolation, update/delete, admin ----
  const mine = await api(base, "GET", "/api/pets/my", aliceTok);
  assert.strictEqual(mine.status, 200, "/pets/my still works");
  assert.deepStrictEqual(mine.data.pets.map((p) => p._id), [petA], "/pets/my returns only own pets");

  const mineAnon = await api(base, "GET", "/api/pets/my");
  assert.strictEqual(mineAnon.status, 401, "/pets/my still requires auth");
  ok("/pets/my ownership isolation intact");

  const anonUpdate = await api(base, "PUT", `/api/pets/${petA}`, undefined, { name: "Hacked" });
  assert.strictEqual(anonUpdate.status, 401, "unauthenticated update is rejected");
  const crossUpdate = await api(base, "PUT", `/api/pets/${petA}`, bobTok, { name: "Hacked" });
  assert.strictEqual(crossUpdate.status, 403, "non-owner update is denied");
  const crossDelete = await api(base, "DELETE", `/api/pets/${petA}`, bobTok);
  assert.strictEqual(crossDelete.status, 403, "non-owner delete is denied");
  const afterAttempts = await Pet.findById(petA).select("name");
  assert.strictEqual(afterAttempts.name, "PetA", "denied writes must not mutate the pet");
  ok("update/delete ownership guards intact");

  const ownerUpdate = await api(base, "PUT", `/api/pets/${petA}`, aliceTok, { name: "PetA2" });
  assert.strictEqual(ownerUpdate.status, 200, "owner can still update");
  const qr = await api(base, "GET", `/api/pets/${petA}/qr`, aliceTok);
  assert.strictEqual(qr.status, 200, "owner can still generate QR");
  const qrCross = await api(base, "GET", `/api/pets/${petA}/qr`, bobTok);
  assert.strictEqual(qrCross.status, 403, "non-owner QR still denied");
  ok("owner update + QR flows intact");

  const adminList = await api(base, "GET", "/api/admin/pets", adminTok);
  assert.strictEqual(adminList.status, 200, "admin pet list still works");
  const adminListUser = await api(base, "GET", "/api/admin/pets", aliceTok);
  assert.strictEqual(adminListUser.status, 403, "normal user cannot reach admin pet list");
  ok("admin pet access still works");

  const ownerDelete = await api(base, "DELETE", `/api/pets/${petB}`, bobTok);
  assert.strictEqual(ownerDelete.status, 200, "owner can still delete own pet");
  ok("owner delete intact");

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();

  console.log(`\n${passed} checks passed`);
  process.exit(0);
})().catch((error) => {
  console.error("\nFAIL -", error.message);
  process.exit(1);
});
