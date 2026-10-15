// =========================================================
// Pet age unit — assert-based E2E checks.
// Run: node test/pet-age.test.js
// Requires a reachable MongoDB. MONGODB_URI, if set, supplies
// only the host:port; the database name is forced to a dedicated
// `*_test` database by test/db.js. Dropped before and after.
//
// Covers the bug where the age unit was discarded on save, so a
// 2-month-old pet was displayed (and stored) as 2 years:
//   * ageUnit persists through create + update
//   * it survives to the public Pet ID endpoint
//   * a missing/unknown unit falls back to "years" (legacy pets)
// =========================================================

const assert = require("assert");
const { testDbUri } = require("./db");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const DB_NAME = "animal_planet_pet_age_test";
const URI = testDbUri(DB_NAME);

process.env.JWT_SECRET = process.env.JWT_SECRET || "pet-age-test-secret";

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

const tokenFor = (userId) => jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  const server = await initAppRouter();
  const base = `http://127.0.0.1:${server.address().port}`;

  const User = require("../models/User");
  const Pet = require("../models/Pet");
  const Breed = require("../models/Breed");

  const breed = await Breed.create({ name: "AgeTestBreed", species: "dog" });
  const alice = await User.create({ name: "Alice", email: "age-alice@test.dev", password: "testpass123", role: "user" });
  const tok = tokenFor(alice._id);

  // ---- create with an explicit "months" unit ----
  const created = await api(base, "POST", "/api/pets", tok, {
    breed: breed._id.toString(), name: "Puppy", species: "dog", gender: "male", age: 2, ageUnit: "months",
  });
  assert.strictEqual(created.status, 201, "pet with a months unit is created");
  assert.strictEqual(created.data.pet.age, 2, "age number persisted");
  assert.strictEqual(created.data.pet.ageUnit, "months", "ageUnit 'months' persisted, not discarded");
  const puppyId = created.data.pet._id;
  const puppyUid = created.data.pet.petUid;
  ok("create persists age + ageUnit=months");

  // ---- it reaches the public Pet ID endpoint (QR destination) ----
  const pub = await api(base, "GET", `/api/pets/public/${puppyUid}`);
  assert.strictEqual(pub.status, 200, "public pet lookup works");
  assert.strictEqual(pub.data.pet.age, 2, "public lookup returns the age number");
  assert.strictEqual(pub.data.pet.ageUnit, "months", "public lookup returns the ageUnit");
  ok("public Pet ID endpoint returns ageUnit");

  // ---- omitted unit defaults to years ----
  const createdDefault = await api(base, "POST", "/api/pets", tok, {
    breed: breed._id.toString(), name: "OldDog", species: "dog", gender: "male", age: 5,
  });
  assert.strictEqual(createdDefault.status, 201, "pet without a unit is created");
  assert.strictEqual(createdDefault.data.pet.ageUnit, "years", "missing unit defaults to years");
  ok("missing ageUnit defaults to years");

  // ---- update switches the unit and it persists ----
  const updated = await api(base, "PUT", `/api/pets/${puppyId}`, tok, { age: 2, ageUnit: "years" });
  assert.strictEqual(updated.status, 200, "owner can update the age unit");
  assert.strictEqual(updated.data.pet.ageUnit, "years", "update response carries the new unit");
  const persisted = await Pet.findById(puppyId).select("age ageUnit");
  assert.strictEqual(persisted.ageUnit, "years", "update persisted to the database");
  ok("update persists the new age unit");

  // ---- an unknown unit is sanitized to years, never a 500 ----
  const bogus = await api(base, "PUT", `/api/pets/${puppyId}`, tok, { ageUnit: "decades" });
  assert.strictEqual(bogus.status, 200, "a bogus unit is accepted and normalized");
  assert.strictEqual(bogus.data.pet.ageUnit, "years", "bogus unit normalizes to years instead of crashing");
  ok("unknown ageUnit normalizes to years");

  // ---- /pets/my exposes the unit (My Pets page source) ----
  const mine = await api(base, "GET", "/api/pets/my", tok);
  assert.strictEqual(mine.status, 200, "/pets/my works");
  const minePuppy = mine.data.pets.find((p) => p._id === puppyId);
  assert.ok(minePuppy && minePuppy.ageUnit === "years", "/pets/my returns the ageUnit");
  ok("/pets/my returns ageUnit");

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();

  console.log(`\n${passed} checks passed`);
  process.exit(0);
})().catch((error) => {
  console.error("\nFAIL -", error.message);
  process.exit(1);
});
