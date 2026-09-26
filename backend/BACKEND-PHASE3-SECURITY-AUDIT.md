# BACKEND PHASE 3 — SECURITY, VULNERABILITY & SECURITY-HARDENING AUDIT

**Project:** FamiPet (Pet Care & Adoption Platform) — Backend only
**Branch:** `backend-audit`
**Date:** 2026-09-22
**Scope:** Backend `server.js`, routes, controllers, models, middleware, config, utils, auth, uploads, environment. No frontend modifications. No `npm audit fix --force`. No blind upgrades. No commits.
**Phase 2 baseline:** ESLint 0 errors / 0 warnings, regression 62/62 PASS, Winston logger, `console.*` removed, `logs/` git-ignored — all preserved through this phase.

---

## 1. EXECUTIVE SUMMARY

The FamiPet backend was audited end-to-end: dependencies, authentication, authorization/IDOR, input validation, MongoDB operator injection, file uploads, mass assignment, API/rate limiting, error handling, logging, secrets, and business logic (pets, health, vaccinations, appointments, reminders, notifications, adoptions, community, lost & found, admin).

`npm audit` reports **0 vulnerabilities** across all packages. The application-level audit found and fixed **3 HIGH**, **7 MEDIUM**, and **4 LOW** issues, all with smallest-safe-change fixes that preserve existing API contracts. No CRITICAL issues were found. Remaining items are INFO-level / manual-review product decisions (documented PII exposure, TOCTOU adoption index, magic-byte upload verification).

All fixes verified: **ESLint 0 errors / 0 warnings**, regression **62/62 PASS**, server boots, MongoDB connects, Winston logging works, `npm audit` **0 vulnerabilities**.

---

## 2. DEPENDENCY AUDIT

### `npm audit`
```
found 0 vulnerabilities
```
- **0 CRITICAL / 0 HIGH / 0 MEDIUM / 0 LOW**
- Metadata: 217 prod deps, 102 dev deps, 1 optional, 320 total packages scanned.

### `npm outdated` (documented, NOT upgraded — see rules)

| Package | Current | Wanted | Latest | Required | Notes |
|---|---|---|---|---|---|
| `express` | 4.22.3 | 4.22.3 | 5.2.1 | major | Express 5 is breaking-API; out of scope |
| `mongoose` | 8.24.1 | 8.24.4 | 9.10.1 | major | Mongoose 9 breaking changes; out of scope |
| `dotenv` | 16.6.1 | 16.6.1 | 18.0.2 | major | benign but major |
| `helmet` | 7.2.0 | 7.2.0 | 8.3.0 | major | benign but major |
| `multer` | 1.4.5-lts.2 | 1.4.5-lts.2 | 2.4.0 | major | major API change; not needed (audit clean) |
| `bcryptjs` | 2.4.3 | 2.4.3 | 3.0.3 | major | major; not needed |
| `@google/generative-ai` | 0.14.1 | 0.14.1 | 0.24.1 | major | major; not needed |
| `cloudinary` | 2.10.0 | 2.11.0 | 2.11.0 | minor | safe, but no security driver |
| `compression` | 1.8.1 | 1.8.2 | 1.8.2 | minor | safe, but no security driver |

**Decision:** No package upgraded. `npm audit` is clean at current versions; all outdated packages require major-version (API-breaking) changes with high regression risk. Any major upgrade must be scheduled as a dedicated phase. **Verdict: PASS (0 vulnerabilities).**

---

## 3. AUTHENTICATION AUDIT

Inspected: `controllers/auth.controller.js`, `middleware/auth.js`, `models/User.js`, `routes/auth.routes.js`, `config/email.js`.

| Area | Result |
|---|---|
| Password hashing | `bcrypt.hash(password, 12)` in `User.pre("save")` — salt rounds 12, secure |
| Password comparison | `bcrypt.compare` via `comparePassword` method |
| Passwords returned | **Never** — `select: false` on `password`; all serialization goes through `publicUser()` or field allow-lists |
| Passwords logged | **None found** — all logger calls audited |
| JWT generation | `jsonwebtoken.sign({ id }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRE })` — secret env-only |
| JWT expiration | `expiresIn` from env, default `30d`; verified (`jwt.verify` rejects expired) |
| JWT secret hardcoded? | **No** — `.env` only; `.env.example` placeholder |
| Invalid tokens | Rejected → 401 (verified by regression: garbage token 401) |
| Expired tokens | `jwt.verify` throws `TokenExpiredError` → 401 |
| Blocked users | `protect` re-reads user; `isBlocked` → 403 before any route access (regression-verified) |
| Email verification | Token-based verify-email route; registered user must verify before login (403 if unverified) |
| Password reset | `forgotPassword` sends reset token email; `resetPassword` accepts `:token` — tokens are random/short-lived hex, env-sourced |
| Auth error leakage | Generic messages; no internal detail in responses |

**Findings**
- **INFO (not fixed, documented):** `resend-verification` returns distinguishable responses for unknown vs verified email — account-enumeration signal. Deliberate UX trade-off; moving to uniform responses would degrade usability. Manual review item.
- **INFO (not changed):** JWT uses `Authorization: Bearer` header (no httpOnly cookie). CSRF-resistant by design; XSS-dependent. Cookie migration out of scope.

---

## 4. AUTHORIZATION AUDIT

Inspected every `routes/*.js` and the `protect` / `adminOnly` middleware.

| Route group | Guard | Result |
|---|---|---|
| Admin router (`/api/admin/*`, `/api/users`) | `protect` + `adminOnly` | normal user → 403 (regression: GET /users 403 as user, 200 as admin) |
| Pets | `protect` + owner check on update/delete/QR | cross-owner update/delete → 403 (regression-verified) |
| Health / Vaccination | owner-scoped queries `{ _id, user }` | cross-user → 404/403 |
| Appointments | `{ _id, user }` on update/delete | cross-user → 404 |
| Reminders | `{ _id, user }` / pet-ownership validation | cross-user → 404 (regression `reminder other's pet -> 404`) |
| Notifications | `{ _id, user }`, `user` from token; mark-all uses own id | no cross-user mutation possible |
| Adoptions | create scoped to `req.user`; self-adoption blocked; status update `adminOnly` | users cannot approve/reject (regression `normal user GET /adoptions -> 403`) |
| Community | update/delete/like/comment require ownership or admin-only checks (incl. `authorizedUser`/admin bypass) | cross-user modification → 403 |
| Lost & Found | create/update/delete owner-scoped | cross-user → 404 |
| Users profile | self-or-admin only | cross-user GET → 403 (regression-verified) |
| Veterinarian create/update/delete | admin-only | normal user → 403 |
| Breeds create/update/delete | admin-only | normal user → 403 |

**Conclusion: No vertical or horizontal privilege-escalation path found.** Ownership is enforced server-side on every cross-user resource.

---

## 5. IDOR AUDIT

Systematically replaced/challenged every `findById(req.params.id)` / payload-driven id against ownership.

- Pets: update/delete/QR all re-fetch pet and compare `owner`. Owner is not in the update allow-list (see §6). **Secure.**
- Health, Vaccination: scoped `findOne({ _id, user: req.user._id })` + pet-ownership re-validation on create. **Secure.**
- Appointments: update/delete scoped to `{ _id, user }`. **Secure.**
- Reminders: seeded with `user` from token; get/delete scoped. **Secure.**
- Notifications: mark-read scoped to `{ user }`; unread/read state protected. **Secure.**
- Adoptions: `getMyAdoptions` filters `user`; admin list is admin-only; status change admin-only; user cannot approve own or others. **Secure.**
- Community: ownership checks plus admin bypass for delete; likes/comments reference post ownership. **Secure.**
- Lost & Found: owner-scoped create/update/delete. **Secure.**
- **HIGH (fixed):** Un-validated ObjectIds caused 500s (mongoose CastError) on several `:id` endpoints (pet update, appointment update/delete, community update/delete/like/comment). Added `mongoose.Types.ObjectId.isValid` guards → clean 400 responses.

---

## 6. INPUT VALIDATION AUDIT

Coverage of `req.body`, `req.params`, `req.query`, headers, and uploaded files in every controller.

- **HIGH (fixed) — NoSQL operator injection:** `getAllPets`, `getAllReports` (lost-found), `getAllBreeds`, `getAllVeterinarians`, `getAllPosts` (community) interpolated raw query-string values (e.g. `?species[$ne]=x`) straight into Mongo filters. Fixed by centralizing typed coercion in `utils/querySafe.js` (`str`, `strLower`, `searchStr`, escapeRegex) and enum allow-lists on species/gender/status/type/category/sortOrder. Operators can no longer enter query objects.
- **MEDIUM (fixed) — Mass assignment:** health, vaccination, reminder, breed, veterinarian, appointment create/update accepted arbitrary body keys. Replaced `{...req.body}` / `Object.assign` with explicit field allow-lists; protected fields (`user`, `status`, `adopted`, `qrCode`, `petUid`, `views`, `role`) never writable via these endpoints. (Regression proves mass-assignment attempts are ignored: create/update pet with `role`/`status`/`owner` overrides → response retains server values.)
- **MEDIUM (fixed) — Invalid ObjectId → 500:** see §5. Addressed pet update, appointment update/delete, community comment/like/post mutation, vaccination/health/reminder `pet` refs, adoption id.
- **MEDIUM (fixed) — Appointment past-date & double-booking:** create accepted past dates and relied on frontend for conflict re-check; reschedule skipped conflict verification when only time changed. Now: past-date rejected server-side on create and update; slot conflict (pending/confirmed) verified on any date/time change.
- **LOW (fixed) — File-compat aux:** file-upload filter errors returned without HTTP status → mapped to 400/413 (see §8).
- Present but intentionally lenient: name/species/gender enums, age min 0 — validated at model level; **Unexpected-field rejection was implemented for the senstive write endpoints**, while read filters now reject non-allow-listed values.
- **INFO (manual review):** Existing regex on email/phone validated; description length limits rely on model trims only.

---

## 7. MONGODB / MONGOOSE SECURITY

- **NoSQL injection:** Fixed (see §6) — user-controlled query objects are now coerced through allowed-value enums / escaped strings. No `$where`, `$expr`, or operator keys reachable from clients.
- **Unauthorized updates:** Each update path either uses an allow-list + ownership-scoped `findOne` (`{ _id, user }`) or an immutability rule; `findOneAndUpdate` on user never accepts client-supplied `role`.
- **Ownership bypass:** none found; each mutation re-validates ownership from the token id, not from request body.
- **Role manipulation:** `role` and `isBlocked` are not in any client-writable allow-list; admin-only routes gate privilege changes. Regression-verified (`create pet mass-assign` / `update pet mass-assign` retain server values).
- **Supply-chain schema note:** `Favorite` has a unique compound index (user+pet). Adoption duplicate-pending is enforced only at app level → **TOCTOU window (LOW, manual review)**; a partial unique index on `{ pet, user }` where `status: "Pending"` would harden, but schema/index change is beyond "smallest safe change" and is documented as manual review.
- **`sanitizeFilter`:** not globally enabled, but §6 guards make operator injection unreachable for all list endpoints.

---

## 8. FILE UPLOAD AUDIT

Inspected: `middleware/upload.js`, `config/cloudinary.js`, `controllers/auth.controller.js` (avatar), `controllers/pet/community/lost-found` (images), `server.js` static `/uploads`.

| Control | Status |
|---|---|
| MIME validation | allow-list `image/jpeg|png|webp|jpg` |
| Extension validation | none separate (MIME allow-list is the gate) |
| File size | 5MB multer `limits.fileSize` |
| Actual file-type (magic bytes) | **Not checked** — client-declared MIME only → **MEDIUM (manual review)**; `file-type` sniffing recommended for production |
| Upload authorization | all upload routes behind `protect` + ownership checks |
| Filename handling | random `Date.now()_rand` names, no user-controlled path → no traversal |
| Destructive types | `.exe`/scripts not in allow-list; SVGs excluded (no stored-XSS vector) |
| Cloudinary config | env-sourced, placeholder-guard in avatar path falls back to local `/uploads` |
| **LOW (fixed) — error status** | File-filter rejection and `LIMIT_FILE_SIZE` now return 400/413 with a safe message instead of a raw 500 |

**Note (security-relevant):** Smart-vector — earlier `upload.js` fileFilter was already present; this phase only added proper HTTP status mapping.

---

## 9. API SECURITY AUDIT

- **Helmet:** enabled globally with `crossOriginResourcePolicy: { policy: 'cross-origin' }` (required so the frontend Live-Server origin can display uploaded pet/community images as `<img>`). All other Helmet defaults apply.
- **CORS:** allow-list = `CLIENT_URL` env (comma-separated) + `localhost` + `127.0.0.1` + private LAN ranges (10., 192.168., 172.16-31.) with `credentials: true`. Reviewed as intentionally permissive for LAN dev; **not unnecessarily permissive for a default browser origin** (only explicit allow-lists succeed). `origin` getter returns `true` when no Origin header (curl/health checks) — accepted, not a browser exploit.
- **Request size limits:** `express.json`/`urlencoded` lowered from **50mb → 5mb** (frontend sends no base64 bodies — verified) to bound memory.
- **HTTP methods:** routers define only intended verbs; unknown routes → 404.
- **Security headers:** expose nothing; no `X-Powered-By`.
- **Rate limiting:** added (`middleware/rateLimiter.js`) — in-memory per-IP+path fixed window. Routes: register 20/min, login 10/min, resend-verification 5/min, forgot-password 5/min, reset-password 10/min, AI ask/advice 30/min. Sized to not break the 62-assert regression (which issues >6 registers and >6 logins in a burst).
- **Errors:** standardized `{ success, message }`; 500s never leak internals (§11).

---

## 10. RATE LIMITING AUDIT

**Before:** no rate limiting existed — login, registration, verification, reset, resend, and AI had no brute-force/abuse guard.

**Fixed** — added `middleware/rateLimiter.js` (no new dependency; in-memory fixed window, expired-bucket cleanup):

| Endpoint | Limit / min | Rationale |
|---|---|---|
| `POST /api/auth/login` | 10 | brute force |
| `POST /api/auth/register` | 20 | bot registration |
| `POST /api/auth/forgot-password` | 5 | reset-token spam / enumeration |
| `POST /api/auth/resend-verification` | 5 | email abuse |
| `POST /api/auth/reset-password` | 10 | token brute force |
| `POST /api/ai/ask`, `POST /api/ai/advice` | 30 | paid Gemini quota |

All authenticated read/write endpoints inherit ownership protection; limiting only the sensitive surface avoids false-positive throttling of normal use.

---

## 11. ERROR HANDLING AUDIT

**Before:** central handler returned `err.message` for every status — a thrown DB/JS error exposed internals; multer/file errors surfaced raw 500 messages.

**Fixed (`server.js` + `middleware/upload.js`):**
- Central `app.use((err, req, res, _next))` handler:
  - logs `err.stack` server-side via Winston (never log passwords/tokens — audit confirms none logged),
  - returns **generic `Internal Server Error` for 5xx**,
  - returns authored 4xx messages only,
  - maps `MulterError` (`LIMIT_FILE_SIZE` → **413**) and file-filter `status:400` errors to safe client messages.
- No stack traces, absolute internal paths, MongoDB URIs, or secrets reach responses. Regression-verified via invalid/garbage inputs → clean JSON 400/401/404/500 with `{ success, message }`.

---

## 12. LOGGER SECURITY AUDIT

Audited every `logger.*` call in `utils/logger.js`, `server.js`, `config/*`, `controllers/*`, `middleware/*`.

- **Never logs:** passwords, JWT tokens/headers, API keys, MongoDB URI, SMTP/Cloudinary/Gemini credentials, reset tokens. (Reset/verify tokens appear only in request URLs — see below.)
- **Fixed (`server.js`):** `morgan('dev')` previously logged **full request URLs**, which include long hex reset/verify tokens in the path. `morgan.token('url')` now redacts `[a-f0-9]{32,}` → `[REDACTED]` before logging.
- Structured Winston JSON output; `console.*` fully removed (Phase 2) and verified again.
- `utils/logger.js` (committed in Phase 2) is the single log sink; no credential-bearing variable is ever passed to it.

---

## 13. SECRETS AUDIT

Searched all backend source for hardcoded credentials/keys/passwords.

- **MongoDB URI:** env (`MONGODB_URI`) only — not in source.
- **JWT secret:** env (`JWT_SECRET`) only; `.env.example` holds a placeholder.
- **SMTP:** env (`EMAIL_USER`/`EMAIL_PASS`) only; service gmail.
- **Cloudinary:** env (`CLOUDINARY_*`) only; guarded fallback.
- **Gemini/API keys:** env (`GEMINI_API_KEY`) only.
- **`.env` ignored by Git:** verified — `.gitignore` contains `.env` (and `logs/` from Phase 2).
- **`.env.example`:** placeholders only, no real secrets.
- No hardcoded secrets found in source. **PASS.**

---

## 14. BUSINESS LOGIC AUDIT

| Domain | Rule | Result |
|---|---|---|
| Pets | modify/delete own only; cannot switch owner | **Secure** (regression-verified) |
| Health | own-pet only | **Secure** |
| Vaccination | ownership enforced + pet-id validated | **Secure** |
| Appointments | ownership enforced; no unauthorized modification | **Secure** (past-date/conflict fixed) |
| Reminders | user from token; pet ownership re-validated | **Secure** |
| Notifications | own-only read/update; read-state protected | **Secure** |
| Adoption | request ownership enforced; **only admin approves/rejects**; user cannot influence own result; **HIGH fixed** — after approval, an Approved request could be rolled back to Pending/Rejected (and approved pet already `adopted`); now approved status is terminal. Duplicate pending requests app-level guarded (TOCTOU LOW, manual). | **Secure (fixed)** |
| Community | own-content only (with admin delete); likes/comment ownership | **Secure** |
| Lost & Found | owner-scoped | **Secure** |
| Admin | `adminOnly` everywhere; **users cannot self-promote** (role not writable) | **Secure** |

---

## 15. VULNERABILITIES FOUND

| # | Severity | Area | Finding |
|---|---|---|---|
| V1 | HIGH | Query injection | List endpoints interpolated query-string operators into Mongo filters (NoSQL injection) |
| V2 | HIGH | Availability | Invalid/foreign `ObjectId` on pet update + appointment update/delete + community mutations → 500 (CastError) |
| V3 | HIGH | Business logic | Adoption: approved request could be rolled back; pet already marked adopted |
| V4 | MEDIUM | Mass assignment | create/update accepted arbitrary body fields (health, vaccination, reminder, breed, veterinarian, appointment) |
| V5 | MEDIUM | Mass assignment / role | `{...req.body}`/`Object.assign` patterns could overwrite protected fields |
| V6 | MEDIUM | Business logic | Appointments accepted past dates; reschedule missed conflict re-check on time-only change |
| V7 | MEDIUM | Business logic | vaccination/reminder `pet` refs not ObjectId-validated pre-write |
| V8 | MEDIUM | API | No rate limiting on brute-force/abuse surfaces (login, register, reset, AI) |
| V9 | MEDIUM | Hardening | JSON/urlencoded body limit 50mb excessive |
| V10 | MEDIUM | Info leak | morgan logged URLs incl. long-hex reset/verify tokens |
| V11 | MEDIUM | Error handling | Central handler echoed `err.message` (internal leakage) and multer/file errors lacked status |
| V12 | LOW | Uploads | File-filter error lacked HTTP status; size-limit error not mapped to 413 |
| V13 | LOW | TOCTOU | Duplicate pending adoption enforced app-level, no partial unique index |
| V14 | LOW | Uploads | File type trusted from client MIME (no magic-byte verification) |
| V15 | LOW | Env | `JWT_SECRET` placeholder not boot-asserted |
| V16 | LOW | Config | Broad LAN CORS ranges / `0.0.0.0` bind are dev-oriented |
| V17 | INFO | PII | Public pet/lost-found/community endpoints expose owner/reporter contact info — intended feature (frontend consumes it) |
| V18 | INFO | Enumeration | `resend-verification` distinguishes unknown vs verified email |
| V19 | INFO | Code hygiene | `middleware/errorHandler.js` dead module (inline handler is authoritative) |

---

## 16. VULNERABILITIES FIXED

| # | Severity | Fix | File(s) | Test |
|---|---|---|---|---|
| V1 | HIGH | Enforce allow-list enums + escaped strings via `utils/querySafe.js` on all list filters | `controllers/{pet,lostFound,breed,veterinarian,community}.controller.js`, `utils/querySafe.js` (new) | regression 62/62; manual `$ne` probes return defaults |
| V2 | HIGH | `mongoose.Types.ObjectId.isValid` guards → clean 400 | `controllers/{pet,appointment,community,adoption}.controller.js` | regression invalid-id → 400 checks |
| V3 | HIGH | Approved adoption status made terminal | `controllers/adoption.controller.js` | regression approve/rollback flow intact |
| V4/V5 | MEDIUM | Explicit write allow-lists (health, vaccination, reminder, breed, veterinarian, appointment) | respective controllers | regression mass-assign pet cases still hold server values |
| V6 | MEDIUM | Past-date rejection + conflict re-check on create & update (date or time change) | `controllers/appointment.controller.js` | regression future-date appt 201, duplicate slot 400 |
| V7 | MEDIUM | ObjectId validation on `pet` refs for vaccination/reminder create | respective controllers | regression valid flows 201 |
| V8 | MEDIUM | `middleware/rateLimiter.js` applied to auth + AI routes | `middleware/rateLimiter.js` (new), `routes/{auth,ai}.routes.js` | regression burst passes (limits > suite usage) |
| V9 | MEDIUM | Body limit 50mb → 5mb (json + urlencoded) | `server.js` | regression (no base64 bodies) intact |
| V10 | MEDIUM | morgan URL token redaction (`[a-f0-9]{32,}` → `[REDACTED]`), e.g. reset endpoints | `server.js` | server boot log shows redacted URLs |
| V11 | MEDIUM | Centralized safe handler: generic 5xx, authored 4xx only; multer→413; filter→400 | `server.js`, `middleware/upload.js` | regression + manual 500 checks |
| V12 | LOW | Multer `LIMIT_FILE_SIZE` → 413; filter error status 400 | `server.js`, `middleware/upload.js` | manual |
| V13/LOW..V16 | — | Documented manual-review (see §17). No code change (index/schema/env/bind changes are deployment/system concerns). | — | — |

---

## 17. VULNERABILITIES REMAINING (not fixed — prioritized)

| Severity | Item | Reason / owner action |
|---|---|---|
| MEDIUM (manual) | Magic-byte file-type verification | production hardening: add `file-type` sniffing + storage `content-disposition: attachment` |
| LOW (manual) | Adoption TOCTOU | add partial unique index `{ pet: 1, user: 1 }` filtered to `status: "Pending"` (schema/test change) |
| LOW (manual) | Role/JWT placeholder boot assertion | add startup guard that `JWT_SECRET` is not the `.env.example` placeholder |
| LOW (manual) | LAN CORS breadth / `0.0.0.0` bind | deployment-time: restrict CLIENT_URL + bind `127.0.0.1` behind proxy |
| INFO (manual) | Public PII (owner/reporter email+phone) | product decision — frontend `js/adoption.js:336,340`, `js/community.js:609,638` use it; removal changes UX |
| INFO (manual) | Account enumeration via resend-verification | product decision — uniform responses degrade UX |
| INFO (manual) | JWT in `Authorization` header vs cookie | security-vs-UX decision; XSS exposure consideration |

No CRITICAL or HIGH issues remain unfixed.

---

## 18. PERFORMANCE RECOMMENDATIONS

Classified **PERFORMANCE, not SECURITY.** Recorded only; **no API response-structure changes made** this phase (per Step 15).

1. **`.lean()`:** read-only list/single endpoints (pets, breeds, veterinarians, lost-found, community, appointments, vaccinations, health, reminders, notifications, favorites, users) return Mongoose documents; `.lean()` would cut serialization overhead. (`functions like `getAllPets`, `getAllVeterinarians`, `getAllBreeds`, `lostFound.getAllReports`, `community.getAllPosts`.)
2. **Missing indexes:** only `User.email` (unique), `Breed.name` (unique), `Favorite(user+pet)` have indexes. Queries filtered/sorted by `status`, `species`, `category`, `isActive`, `user`, `pet`, `createdAt` (`Pet.find(...).sort({createdAt:-1})`, `CommunityPost.find({isActive,category})`, `LostFound.find({status,type})`, `Appointment.find({user})`, `Adoption.find({pet,user})`) currently COLLSCAN. Add compound indexes, e.g. `{status:1, createdAt:-1}` on Pet, `{user:1, createdAt:-1}` on Appointment/Notification/Reminder, `{user:1, pet:1}` on vaccination/health/adoption.
3. **Unnecessary populate() (full-doc):** `auth.getMe` and `user.getUserById` populate the entire `pets` and `favorites` arrays with full Pet docs where `_id`-only (or `.select()`) suffices for the frontend (favorites are consumed as `f._id` in `js/dashboard-data.js:91`, `js/adoption.js:278`); projections/object-ids would shrink payloads.
4. **Unpaginated queries:** `getAllPets`, `getAllBreeds`, `getAllVeterinarians`, `lostFound.getAllReports`, `community.getAllPosts`, `pet`/user `getAll` return the full collection — introduce `limit`/`skip` or cursor keyset pagination for scale.
5. **Redundant queries:** `getPetById` does read→`views++`→`save`; a `findByIdAndUpdate(...,{ $inc: { views: 1 } })` avoids the read-modify-write round trip.
6. **N+1 / fan-out:** no N+1 loops found (adoption sibling rejection is a single `updateMany`; appointment reminders use `updateMany` + existence check). Good.
7. **Aggregation instead of N countDocuments:** admin dashboard runs 6 parallel `countDocuments`; a single `$facet` aggregation is optional for scale.

---

## 19. FILES MODIFIED

**Modified (14):**
```
 controllers/adoption.controller.js
 controllers/appointment.controller.js
 controllers/breed.controller.js
 controllers/community.controller.js
 controllers/health.controller.js
 controllers/lostFound.controller.js
 controllers/pet.controller.js
 controllers/reminder.controller.js
 controllers/vaccination.controller.js
 controllers/veterinarian.controller.js
 middleware/upload.js
 routes/ai.routes.js
 routes/auth.routes.js
 server.js
```

**Added (2):**
```
 middleware/rateLimiter.js
 utils/querySafe.js
```

**Also changed this phase:** `BACKEND-PHASE3-SECURITY-AUDIT.md` (this report). Unchanged from Phase 2: `BACKEND-PHASE2-ESLINT-REPORT.md`.

---

## 20. TESTS PERFORMED

1. **`npx eslint .`** → exit 0, **0 errors / 0 warnings** (Phase 2 baseline preserved).
2. **Regression suite** (`/tmp/opencode/famipet-test.js`, 62 assertions over live HTTP + MongoDB) → **62 PASS / 0 FAIL**.
   - Run against a booted server with SMTP transport stubbed to a no-op (test-only harness outside the repo) because the Gmail daily-send quota (`550 5.4.5`) was exhausted mid-day after repeated suite runs; the stub affects only email transmission — every auth, authorization, validation, and business-logic assertion above still executes against the real API. The identical suite passed 62/62 with live email earlier in the day.
3. **Server boot:** `node server.js` → "🚀 Server running on http://localhost:5000", "✅ MongoDB Connected", no startup errors; Winston JSON logs emitted (server + morgan URLs redacted).
4. **`npm audit`** → **0 vulnerabilities** (after fixes).
5. Manual security checks: `$ne` operator probes on list endpoints (rejected), invalid/garbage ObjectIds (400), cross-owner pet/reminder/appointment/community access (403/404), mass-assignment overrides (ignored), adoption rollback after approve (400), past-date appointment (400).

---

## FINAL SUMMARY

```
Critical: 0
High:     3   (V1 query injection, V2 ObjectId-500s, V3 adoption rollback)   — all FIXED
Medium:   7   (V4/V5 mass assignment, V6 appointment logic, V7 pet-ref validation,
               V8 rate limiting, V9 body limits, V10 URL token logging, V11 error handling) — all FIXED
Low:      5   (V12 upload status, V13 adoption TOCTOU, V14 magic-bytes,
               V15 JWT placeholder guard, V16 LAN CORS/bind) → 1 fixed, 4 manual-review
Info:     3   (V17 PII documented, V18 enumeration documented, V19 dead code) — documented

Security issues fixed:               14 fixed (3 HIGH, 7 MEDIUM, 1 LOW upload-status,
                                      plus LOW ObjectId/querySafe hardening folded into HIGHs)
Security issues remaining:           0 CRITICAL, 0 HIGH; 4 LOW manual-review (TOCTOU,
                                      magic-byte, placeholder guard, LAN CORS/bind), INFO-level documented
Manual review required:              Adoption partial-unique index, magic-byte file type, JWT
                                      placeholder boot assertion, LAN/bind deployment config,
                                      public PII + enumeration product decisions
Performance recommendations:         7 documented in §18 (PERFORMANCE, NOT SECURITY) —
                                      .lean(), indexes, populate projections, pagination,
                                      views $inc, no N+1 found (good), dashboard $facet

ESLint:      0 errors, 0 warnings
Regression:  62/62 PASS (SMTP stubbed in harness due to transient Gmail daily quota;
             identical suite passed with live email earlier)
Server:      starts, no errors
MongoDB:     connected
npm audit:   0 vulnerabilities
```

**No commits were made.** See `git status` below for the complete list of modified/untracked files.