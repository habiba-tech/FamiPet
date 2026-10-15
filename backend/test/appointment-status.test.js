// =========================================================
// Appointment effective status — pure + E2E checks.
// Run: node test/appointment-status.test.js
// The pure half needs no DB; the E2E half requires a reachable
// MongoDB. The db name is forced to a dedicated `*_test` database
// by test/db.js and dropped before and after.
//
// Covers the bug where a pending/confirmed appointment stayed in
// "Upcoming" forever after its scheduled moment passed:
//   * effectiveAppointmentStatus flips past pending/confirmed to
//     completed, leaves future and terminal states alone
//   * GET /api/appointments reports the effective status
// =========================================================

const assert = require("assert");
const { testDbUri } = require("./db");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const {
  parseTimeOfDay,
  appointmentDateTime,
  isAppointmentPast,
  effectiveAppointmentStatus,
} = require("../utils/appointmentTime");

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

// ---------------- pure: time parsing ----------------
assert.strictEqual(parseTimeOfDay("14:30"), 14 * 60 + 30, "24h HH:MM");
assert.strictEqual(parseTimeOfDay("2:30 PM"), 14 * 60 + 30, "12h with minutes + PM");
assert.strictEqual(parseTimeOfDay("2:30 pm"), 14 * 60 + 30, "lowercase meridiem");
assert.strictEqual(parseTimeOfDay("9am"), 9 * 60, "bare hour with meridiem");
assert.strictEqual(parseTimeOfDay("9"), 9 * 60, "bare hour");
assert.strictEqual(parseTimeOfDay("12:00 AM"), 0, "12 AM is midnight");
assert.strictEqual(parseTimeOfDay("12:00 PM"), 12 * 60, "12 PM is noon");
assert.strictEqual(parseTimeOfDay("not a time"), null, "garbage time is null");
assert.strictEqual(parseTimeOfDay("99:99"), null, "out-of-range time is null");
ok("time strings parse (24h, 12h, bare hour, invalid)");

// ---------------- pure: boundary ----------------
const day = new Date("2026-01-15T00:00:00Z");
const at = appointmentDateTime(day, "10:00");
assert.strictEqual(at.toISOString(), "2026-01-15T10:00:00.000Z", "date + time combine in UTC");
assert.strictEqual(isAppointmentPast(day, "10:00", new Date("2026-01-15T09:59:59.999Z")), false, "a minute before is not past");
assert.strictEqual(isAppointmentPast(day, "10:00", new Date("2026-01-15T10:00:00.000Z")), false, "the exact instant is not yet past");
assert.strictEqual(isAppointmentPast(day, "10:00", new Date("2026-01-15T10:00:00.001Z")), true, "just after is past");
assert.strictEqual(isAppointmentPast(new Date("not-a-date"), "10:00"), false, "unparseable date is never past");
ok("past boundary is exclusive and timezone-consistent");

// ---------------- pure: effective status ----------------
const past = new Date("2000-01-01T00:00:00Z");
const future = new Date("2999-01-01T00:00:00Z");
assert.strictEqual(effectiveAppointmentStatus("pending", past, "10:00"), "completed", "past pending -> completed");
assert.strictEqual(effectiveAppointmentStatus("confirmed", past, "10:00"), "completed", "past confirmed -> completed");
assert.strictEqual(effectiveAppointmentStatus("pending", future, "10:00"), "pending", "future pending stays pending");
assert.strictEqual(effectiveAppointmentStatus("confirmed", future, "10:00"), "confirmed", "future confirmed stays confirmed");
assert.strictEqual(effectiveAppointmentStatus("cancelled", past, "10:00"), "cancelled", "past cancelled stays cancelled");
assert.strictEqual(effectiveAppointmentStatus("no-show", past, "10:00"), "no-show", "past no-show stays no-show");
assert.strictEqual(effectiveAppointmentStatus("completed", future, "10:00"), "completed", "completed is terminal");
ok("effective status flips only past pending/confirmed");

// ---------------- E2E: GET /api/appointments reports effective status ----------------
const DB_NAME = "animal_planet_appointment_status_test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "appointment-status-test-secret";

async function initAppRouter() {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/appointments", require("../routes/appointment.routes"));
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
  await mongoose.connect(testDbUri(DB_NAME));
  await mongoose.connection.dropDatabase();
  const server = await initAppRouter();
  const base = `http://127.0.0.1:${server.address().port}`;

  const User = require("../models/User");
  const Pet = require("../models/Pet");
  const Breed = require("../models/Breed");
  const Veterinarian = require("../models/Veterinarian");
  const Appointment = require("../models/Appointment");

  const breed = await Breed.create({ name: "ApptTestBreed", species: "dog" });
  const alice = await User.create({ name: "Alice", email: "appt-alice@test.dev", password: "testpass123", role: "user" });
  const token = jwt.sign({ id: alice._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const pet = await Pet.create({ owner: alice._id, breed: breed._id, name: "Rex", species: "dog", gender: "male", age: 3 });
  const vet = await Veterinarian.create({ name: "Dr Vet", email: "vet@test.dev", phone: "555", isActive: true });

  const pastDate = new Date("2000-01-01T00:00:00Z");
  const futureDate = new Date("2999-01-01T00:00:00Z");
  const mk = (status, date) =>
    Appointment.create({ user: alice._id, pet: pet._id, veterinarian: vet._id, date, time: "10:00", status });

  const pastPending = await mk("pending", pastDate);
  const pastConfirmed = await mk("confirmed", pastDate);
  const pastCancelled = await mk("cancelled", pastDate);
  const futurePending = await mk("pending", futureDate);
  const futureConfirmed = await mk("confirmed", futureDate);

  const res = await api(base, "GET", "/api/appointments", token);
  assert.strictEqual(res.status, 200, "GET /api/appointments works");
  const byId = Object.fromEntries(res.data.appointments.map((a) => [a._id, a.status]));

  assert.strictEqual(byId[pastPending._id.toString()], "completed", "past pending reported as completed");
  assert.strictEqual(byId[pastConfirmed._id.toString()], "completed", "past confirmed reported as completed");
  assert.strictEqual(byId[pastCancelled._id.toString()], "cancelled", "past cancelled unchanged");
  assert.strictEqual(byId[futurePending._id.toString()], "pending", "future pending unchanged");
  assert.strictEqual(byId[futureConfirmed._id.toString()], "confirmed", "future confirmed unchanged");
  ok("GET /api/appointments reports effective status");

  // The stored record must NOT be rewritten — this is a read-time projection.
  const stored = await Appointment.findById(pastPending._id).select("status");
  assert.strictEqual(stored.status, "pending", "the persisted status is untouched (no hidden write)");
  ok("effective status is computed on read, never written back");

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();

  console.log(`\n${passed} checks passed`);
  process.exit(0);
})().catch((error) => {
  console.error("\nFAIL -", error.message);
  process.exit(1);
});
