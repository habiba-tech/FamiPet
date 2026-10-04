// =========================================================
// Push notifications — assert-based E2E checks.
// Run: node test/push-notifications.test.js
// Requires a reachable MongoDB. MONGODB_URI, if set, supplies
// only the host:port; the database name is forced to a dedicated
// `*_test` database by test/db.js, which refuses any other name.
// That database is dropped before and after the run.
//
// What is actually proved here:
//   * the Mongo Notification document is authoritative — it is
//     written first, and the inbox/unread endpoints read it back
//   * push is best effort and can never fail the operation that
//     produced the notification (an appointment booking survives
//     both a push outage and a notification-write failure)
//   * the push subscription endpoints are authenticated, user
//     scoped and validated
//   * a 404/410 "gone" endpoint is pruned, other failures are
//     counted and the row is only dropped at the ceiling
//   * VAPID fails closed when unset, and the private key is never
//     returned by anything
//
// No real push service is contacted: config/push.js exposes a
// transport seam (setTransport) that this suite replaces.
// =========================================================

const assert = require("assert");
const { testDbUri } = require("./db");

const DB_NAME = "animal_planet_push_test";
const URI = testDbUri(DB_NAME);

process.env.JWT_SECRET = process.env.JWT_SECRET || "push-test-secret";

// VAPID must be in the environment BEFORE config/push.js is first
// required, because it snapshots the keys at load time (like
// config/ai.js). Real generated keys, so webpush.setVapidDetails
// genuinely accepts the pair and `configured` is genuinely true.
const webpush = require("web-push");
const VAPID = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = VAPID.publicKey;
process.env.VAPID_PRIVATE_KEY = VAPID.privateKey;
process.env.VAPID_SUBJECT = "mailto:push-test@famipet.test";

const mongoose = require("mongoose");

let passed = 0;
const ok = (name) => { passed++; console.log(`ok ${passed} - ${name}`); };

// A real-looking FCM endpoint. The controller requires a known push
// service host, so a test endpoint of `https://example.test/...`
// would be (correctly) rejected.
const endpoint = (id) => `https://fcm.googleapis.com/fcm/send/push-test-${id}`;
const KEYS = { p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U", auth: "8eDyX_uCN0XRhW6RZk7SmQ9A" };

async function initAppRouter() {
  const express = require("express");
  const app = express();
  app.use(express.json());
  app.use("/api/notifications", require("../routes/notification.routes"));
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

const tokenFor = (userId) => {
  const jwt = require("jsonwebtoken");
  return jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  const server = await initAppRouter();
  const base = `http://127.0.0.1:${server.address().port}`;

  const User = require("../models/User");
  const Pet = require("../models/Pet");
  const Veterinarian = require("../models/Veterinarian");
  const Notification = require("../models/Notification");
  const PushSubscription = require("../models/PushSubscription");

  const pushConfig = require("../config/push");
  const pushService = require("../services/push.service");
  const { createNotification } = require("../services/notification.service");
  const { createAppointmentForUser, AppointmentError } = require("../services/appointment.service");

  const alice = await User.create({ name: "Alice", email: "push-alice@test.dev", password: "testpass123", role: "user" });
  const bob = await User.create({ name: "Bob", email: "push-bob@test.dev", password: "testpass123", role: "user" });
  const aliceTok = tokenFor(alice._id);
  const bobTok = tokenFor(bob._id);

  /* ---- VAPID key endpoint: authenticated, public key only ---- */

  assert.strictEqual(pushConfig.isPushConfigured(), true, "VAPID must be configured in this suite");

  {
    const anon = await api(base, "GET", "/api/notifications/vapid-public-key", null);
    assert.strictEqual(anon.status, 401, "vapid-public-key must require authentication");
    ok("GET /vapid-public-key rejects an unauthenticated request (401)");
  }

  {
    const res = await api(base, "GET", "/api/notifications/vapid-public-key", aliceTok);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.configured, true);
    assert.strictEqual(res.data.publicKey, VAPID.publicKey);
    // The private key must never appear in any response.
    assert.ok(!JSON.stringify(res.data).includes(VAPID.privateKey), "private key must never be returned");
    ok("GET /vapid-public-key returns only the public key to the authenticated user");
  }

  /* ---- subscription input validation ---- */

  // The push routes are behind the project's rate limiter (10/min per IP and
  // path, and POST and DELETE share one bucket). Every status asserted below
  // is a specific 4xx, so a 429 would fail the suite rather than pass it.

  {
    const bad = await api(base, "POST", "/api/notifications/push-subscription", aliceTok, {});
    assert.strictEqual(bad.status, 400);
    assert.match(bad.data.message, /endpoint is required/i);
    ok("POST /push-subscription rejects a missing endpoint (400)");
  }

  {
    const res = await api(base, "POST", "/api/notifications/push-subscription", aliceTok, {
      endpoint: "http://fcm.googleapis.com/fcm/send/insecure",
      keys: KEYS,
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /https/i);
    ok("POST /push-subscription rejects a non-https endpoint (400)");
  }

  {
    const res = await api(base, "POST", "/api/notifications/push-subscription", aliceTok, {
      endpoint: "https://attacker.test/fcm/send/evil",
      keys: KEYS,
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /not a recognised push service/i);
    ok("POST /push-subscription rejects a host that is not a push service (400)");
  }

  {
    const res = await api(base, "POST", "/api/notifications/push-subscription", aliceTok, {
      endpoint: endpoint("nokeys"),
      keys: { p256dh: KEYS.p256dh },
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /auth is required/i);
    ok("POST /push-subscription rejects a missing auth key (400)");
  }

  {
    const res = await api(base, "POST", "/api/notifications/push-subscription", aliceTok, {
      endpoint: endpoint("badkey"),
      keys: { p256dh: "not a valid key!!", auth: KEYS.auth },
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.data.message, /not a valid key/i);
    ok("POST /push-subscription rejects a non-base64url p256dh key (400)");
  }

  assert.strictEqual(await PushSubscription.countDocuments(), 0, "no rejected request may write a row");
  ok("no rejected subscription request created a PushSubscription row");

  /* ---- authenticated save, user-scoped ---- */

  const aliceEndpoint = endpoint("alice");

  {
    const res = await api(base, "POST", "/api/notifications/push-subscription", aliceTok, {
      endpoint: aliceEndpoint,
      keys: KEYS,
    });
    assert.strictEqual(res.status, 200);
    const row = await PushSubscription.findOne({ endpoint: aliceEndpoint });
    assert.ok(row, "the subscription row must be persisted");
    assert.strictEqual(row.user.toString(), alice._id.toString());
    assert.strictEqual(row.p256dh, KEYS.p256dh);
    assert.strictEqual(row.auth, KEYS.auth);
    ok("POST /push-subscription persists the endpoint against the AUTHENTICATED user");
  }

  {
    // Re-subscribing the same endpoint must not duplicate the row.
    const res = await api(base, "POST", "/api/notifications/push-subscription", aliceTok, {
      endpoint: aliceEndpoint,
      keys: KEYS,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await PushSubscription.countDocuments({ endpoint: aliceEndpoint }), 1);
    ok("re-subscribing the same endpoint updates in place (no duplicate rows)");
  }

  /* ---- cross-user isolation on DELETE ---- */

  const bobEndpoint = endpoint("bob");
  await api(base, "POST", "/api/notifications/push-subscription", bobTok, { endpoint: bobEndpoint, keys: KEYS });

  {
    // Alice asking to delete Bob's endpoint must not delete it.
    const res = await api(base, "DELETE", "/api/notifications/push-subscription", aliceTok, { endpoint: bobEndpoint });
    assert.strictEqual(res.status, 200);
    const stillThere = await PushSubscription.findOne({ endpoint: bobEndpoint });
    assert.ok(stillThere, "another user's endpoint must survive");
    assert.strictEqual(stillThere.user.toString(), bob._id.toString());
    ok("DELETE /push-subscription cannot remove another user's endpoint");
  }

  {
    // Bob's own DELETE does remove it.
    const res = await api(base, "DELETE", "/api/notifications/push-subscription", bobTok, { endpoint: bobEndpoint });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(await PushSubscription.countDocuments({ endpoint: bobEndpoint }), 0);
    ok("DELETE /push-subscription removes the caller's own endpoint");
  }

  /* ---- the Notification document is authoritative ---- */

  // A successful transport that records what it was asked to send.
  let sent = [];
  pushConfig.setTransport((subscription, payload) => {
    sent.push({ endpoint: subscription.endpoint, payload });
    return Promise.resolve({ statusCode: 201 });
  });

  {
    sent = [];
    const notification = await createNotification({
      user: alice._id,
      title: "Appointment Booked",
      message: "Your appointment is booked for tomorrow at 10:00.",
      type: "appointment",
      url: "/app/appointments",
    });

    // 1. persisted FIRST, and it is what the API serves back
    const stored = await Notification.findById(notification._id);
    assert.ok(stored, "the notification must exist in MongoDB");
    assert.strictEqual(stored.user.toString(), alice._id.toString());
    assert.strictEqual(stored.title, "Appointment Booked");
    assert.strictEqual(stored.message, "Your appointment is booked for tomorrow at 10:00.");
    assert.strictEqual(stored.type, "appointment");
    assert.strictEqual(stored.isRead, false);

    const list = await api(base, "GET", "/api/notifications", aliceTok);
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.data.count, 1);
    assert.strictEqual(list.data.notifications[0]._id, notification._id.toString());

    // 2. mirrored to the user's devices, carrying only inbox-safe fields
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].endpoint, aliceEndpoint);
    assert.strictEqual(sent[0].payload.title, "Appointment Booked");
    assert.strictEqual(sent[0].payload.body, "Your appointment is booked for tomorrow at 10:00.");
    assert.strictEqual(sent[0].payload.notificationId, notification._id.toString());
    assert.strictEqual(sent[0].payload.url, "/app/appointments");
    // A lock screen must never carry pet records, health data, owner
    // details or any credential.
    const payloadKeys = Object.keys(sent[0].payload).sort().join(",");
    assert.strictEqual(payloadKeys, "body,notificationId,tag,title,url");
    assert.ok(!JSON.stringify(sent[0].payload).includes(process.env.JWT_SECRET));

    ok("the Notification document is persisted and is what the inbox API serves");
    ok("push mirrors the persisted notification with a minimal, inbox-safe payload");
  }

  /* ---- push failure cannot break the notification or the inbox ---- */

  {
    pushConfig.setTransport(() => Promise.reject(Object.assign(new Error("push service down"), { statusCode: 503 })));
    const notification = await createNotification({
      user: alice._id,
      title: "Push Outage",
      message: "This must still land in the inbox.",
      type: "system",
      url: "/app/dashboard",
    });
    assert.ok(await Notification.findById(notification._id), "the document survives a push outage");

    // Failure is counted, not deleted: 503 is not a "gone" signal.
    const row = await PushSubscription.findOne({ endpoint: aliceEndpoint });
    assert.ok(row, "a transient failure must not delete the subscription");
    assert.strictEqual(row.failureCount, 1);
    assert.ok(row.lastFailureAt, "lastFailureAt must be recorded");

    const list = await api(base, "GET", "/api/notifications", aliceTok);
    assert.strictEqual(list.data.count, 2);
    ok("a push outage does not fail notification creation; the inbox still updates");
    ok("a non-410 failure increments failureCount instead of deleting the subscription");
  }

  /* ---- an explicit 404/410 "gone" is pruned immediately ---- */

  {
    pushConfig.setTransport(() => Promise.reject(Object.assign(new Error("gone"), { statusCode: 410 })));
    const summary = await pushService.sendToUser(alice._id, { title: "Pruned", body: "x", type: "system" });
    assert.strictEqual(summary.delivered, 0);
    assert.strictEqual(summary.failed, 1);
    assert.strictEqual(summary.removed, 1);
    assert.strictEqual(await PushSubscription.countDocuments({ endpoint: aliceEndpoint }), 0);
    ok("a 410 response prunes the dead subscription immediately");
  }

  /* ---- repeated failures are only dropped at the ceiling ---- */

  {
    await PushSubscription.create({ user: alice._id, endpoint: aliceEndpoint, p256dh: KEYS.p256dh, auth: KEYS.auth });
    pushConfig.setTransport(() => Promise.reject(Object.assign(new Error("refused"), { statusCode: 401 })));

    for (let i = 1; i < pushService.MAX_FAILURES; i += 1) {
      const summary = await pushService.sendToUser(alice._id, { title: "Retry", body: "x", type: "system" });
      assert.strictEqual(summary.removed, 0, `must survive failure ${i}`);
      assert.strictEqual(summary.failed, 1);
    }
    assert.ok(await PushSubscription.findOne({ endpoint: aliceEndpoint }), "must survive up to the ceiling - 1");

    const last = await pushService.sendToUser(alice._id, { title: "Retry", body: "x", type: "system" });
    assert.strictEqual(last.removed, 1);
    assert.strictEqual(await PushSubscription.countDocuments({ endpoint: aliceEndpoint }), 0);
    ok(`a subscription is dropped only after ${pushService.MAX_FAILURES} consecutive failures`);
  }

  /* ---- delivery is scoped to the authenticated user ---- */

  {
    await PushSubscription.create({ user: alice._id, endpoint: aliceEndpoint, p256dh: KEYS.p256dh, auth: KEYS.auth });
    await PushSubscription.create({ user: bob._id, endpoint: bobEndpoint, p256dh: KEYS.p256dh, auth: KEYS.auth });
    sent = [];
    pushConfig.setTransport((subscription, payload) => {
      sent.push({ endpoint: subscription.endpoint, payload });
      return Promise.resolve({ statusCode: 201 });
    });

    await pushService.sendToUser(alice._id, { title: "Scoped", body: "x", type: "system" });
    assert.deepStrictEqual(sent.map((s) => s.endpoint), [aliceEndpoint], "bob's device must not be sent to");
    ok("sendToUser only delivers to the target user's own subscriptions");
  }

  /* ---- deep link and text are bounded, never an off-site redirect ---- */

  {
    assert.strictEqual(pushService.buildPayload({ title: "t", body: "b", url: "https://evil.test/steal" }).url, "/app/dashboard");
    assert.strictEqual(pushService.buildPayload({ title: "t", body: "b", url: "//evil.test/steal" }).url, "/app/dashboard");
    assert.strictEqual(pushService.buildPayload({ title: "t", body: "b", url: "/app/health" }).url, "/app/health");
    assert.strictEqual(pushService.buildPayload({ title: "t", body: "b" }).url, "/app/dashboard");
    const long = pushService.buildPayload({ title: "x".repeat(500), body: "y".repeat(500) });
    assert.ok(long.title.length <= 120, "title is clamped");
    assert.ok(long.body.length <= 200, "body is clamped");
    ok("a push deep link stays an in-app path and lock-screen text is clamped");
  }

  /* ---- the real transport hands web-push a string/Buffer, not an object ---- */

  // Every other block in this file replaces the transport, so none of them
  // can see the actual web-push call. web-push rejects a plain object
  // payload up front ("Payload must be either a string or a Node Buffer"),
  // which failed EVERY delivery while all the stubbed tests stayed green.
  // This block keeps the real transport and stubs only web-push itself, so
  // the wire format is what is actually asserted.
  {
    const realSend = webpush.sendNotification;
    const wire = [];
    webpush.sendNotification = (subscription, payload) => {
      wire.push({ endpoint: subscription.endpoint, payload });
      return Promise.resolve({ statusCode: 201 });
    };
    pushConfig.setTransport(); // restore the real transport

    try {
      await PushSubscription.deleteMany({ endpoint: aliceEndpoint });
      await PushSubscription.create({ user: alice._id, endpoint: aliceEndpoint, p256dh: KEYS.p256dh, auth: KEYS.auth });
      const summary = await pushService.sendToUser(alice._id, {
        title: "Wire Format",
        body: "must be JSON on the wire",
        type: "system",
        url: "/app/dashboard",
      });

      assert.strictEqual(summary.delivered, 1, `real transport must deliver, got ${JSON.stringify(summary)}`);
      assert.strictEqual(wire.length, 1, "web-push must be called once");
      assert.ok(
        typeof wire[0].payload === "string" || Buffer.isBuffer(wire[0].payload),
        `web-push only accepts a string or Buffer, got ${typeof wire[0].payload}`
      );

      // The service worker JSON.parses the raw body, so the encoded payload
      // must round-trip back to exactly what the service built.
      const decoded = JSON.parse(wire[0].payload.toString());
      assert.strictEqual(decoded.title, "Wire Format");
      assert.strictEqual(decoded.body, "must be JSON on the wire");
      assert.deepStrictEqual(Object.keys(decoded).sort().join(","), "body,tag,title,url");
      ok("the real transport encodes the payload for web-push (a string, not an object)");
    } finally {
      webpush.sendNotification = realSend;
      pushConfig.setTransport();
    }
  }

  /* ---- a notification write failure cannot fail an appointment ---- */

  {
    await api(base, "POST", "/api/notifications/push-subscription", aliceTok, { endpoint: aliceEndpoint, keys: KEYS });

    const Breed = require("../models/Breed");
    const breed = await Breed.create({ name: "PushTestRetriever", species: "dog" });
    const pet = await Pet.create({
      name: "Rex",
      species: "dog",
      breed: breed._id,
      gender: "male",
      age: 3,
      owner: alice._id,
    });
    const vet = await Veterinarian.create({
      name: "Dr Test",
      clinic: "Test Clinic",
      phone: "+1 555 0100",
      email: "vet@test.dev",
      isActive: true,
    });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 1. push transport is throwing for every device already.
    pushConfig.setTransport(() => Promise.reject(new Error("push service down")));
    const result = await createAppointmentForUser({
      userId: alice._id.toString(),
      pet: pet._id.toString(),
      veterinarian: vet._id.toString(),
      date: tomorrow,
      time: "10:00",
      type: "checkup",
    });
    assert.ok(result.appointment && result.appointment._id, "the appointment must still be booked");
    assert.strictEqual(result.appointment.user.toString(), alice._id.toString());
    const Reminder = require("../models/Reminder");
    assert.ok(await Reminder.findOne({ pet: pet._id, isActive: true }), "the reminder is still created");
    ok("a push outage does not fail an appointment booking (and the reminder is still created)");

    // 2. Now the notification WRITE itself fails. The appointment is
    //    already persisted at that point, so the user must not lose it.
    const realCreate = Notification.create;
    Notification.create = () => Promise.reject(new Error("inbox unavailable"));
    try {
      const second = await createAppointmentForUser({
        userId: alice._id.toString(),
        pet: pet._id.toString(),
        veterinarian: vet._id.toString(),
        date: tomorrow,
        time: "11:00",
        type: "checkup",
      });
      assert.ok(second.appointment && second.appointment._id, "the appointment must survive a notification failure");
    } finally {
      Notification.create = realCreate;
    }
    const Appointment = require("../models/Appointment");
    assert.strictEqual(await Appointment.countDocuments({ user: alice._id }), 2, "both bookings are persisted");
    ok("a notification write failure does not roll back or fail the booking");
  }

  /* ---- a bad booking still fails the same way it always did ---- */

  {
    let error = null;
    try {
      await createAppointmentForUser({
        userId: alice._id.toString(),
        pet: new mongoose.Types.ObjectId().toString(),
        veterinarian: new mongoose.Types.ObjectId().toString(),
        date: new Date().toISOString(),
        time: "10:00",
      });
    } catch (caught) { error = caught; }
    assert.ok(error instanceof AppointmentError, "a bad booking must still raise AppointmentError");
    assert.strictEqual(error.status, 404);
    ok("appointment validation is unchanged (a non-owned pet is still a 404 AppointmentError)");
  }

  /* ---- indexes the query patterns depend on ---- */

  {
    await Notification.syncIndexes();
    await PushSubscription.syncIndexes();

    // Declared on the model AND actually present in the database: a schema
    // index that was never created is no index at all.
    const declared = (Model) => Model.schema.indexes().map(([key]) => JSON.stringify(key));
    assert.ok(
      declared(Notification).includes(JSON.stringify({ user: 1, createdAt: -1 })),
      "the Notification schema must declare { user: 1, createdAt: -1 } for the newest-first user-scoped inbox"
    );

    const notificationLive = await Notification.collection.indexes();
    assert.ok(
      notificationLive.some((i) => i.name === "user_1_createdAt_-1"),
      "the { user, createdAt } inbox index must exist in MongoDB, not just in the schema"
    );

    const pushLive = await PushSubscription.collection.indexes();
    const endpointIndex = pushLive.find((i) => i.key && i.key.endpoint === 1);
    assert.ok(endpointIndex, "PushSubscription needs an index on endpoint");
    assert.strictEqual(endpointIndex.unique, true, "the endpoint index must be unique");
    ok("the { user, createdAt } inbox index and the unique endpoint index exist");
  }

  /* ---- VAPID fails closed when it is not configured ---- */

  {
    const configPath = require.resolve("../config/push");
    const savedPublic = process.env.VAPID_PUBLIC_KEY;
    const savedPrivate = process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete require.cache[configPath];
    try {
      const unconfigured = require("../config/push");
      assert.strictEqual(unconfigured.isPushConfigured(), false, "missing keys must fail closed");
      assert.strictEqual(unconfigured.getVapidPublicKey(), "");
    } finally {
      process.env.VAPID_PUBLIC_KEY = savedPublic;
      process.env.VAPID_PRIVATE_KEY = savedPrivate;
      delete require.cache[configPath];
      require("../config/push");
    }
    ok("with no VAPID keys, push reports itself unconfigured instead of throwing at require time");
  }

  // Restore the real transport so nothing leaks past the suite.
  pushConfig.setTransport();

  console.log(`\n${passed} checks passed.`);
  server.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  process.exit(0);
})().catch(async (error) => {
  console.error("\nFAIL push-notifications.test.js");
  console.error(error && error.stack ? error.stack : error);
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  } catch { /* already gone */ }
  process.exit(1);
});
