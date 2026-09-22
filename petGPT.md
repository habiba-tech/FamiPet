# PetGPT — Enhancement Working Reference

Branch: `feature/petgpt-enhancement`
Scope: FamiPet backend PetGPT (AI assistant) enhancement.
Constraint: The React migration runs in a separate worktree (`~/Code/FamiPet`, branch `react-migration`). Do **not** touch it, merge it, or build on it. Vanilla frontend + this backend are the working surface.

Everything below is based on the actual code at the time of the audit (2026-09-22). Nothing is speculative or aspirational.

---

## 1. Current Architecture

- **Stack**: Express 4 + Mongoose 8 (MongoDB), vanilla Node backend in `backend/`; vanilla HTML/CSS/JS frontend in `frontend/` (served statically either by Live Server or by the backend's own fallback listener on `CLIENT_URL`/5502).
- **No TypeScript, no build step, no test suite, no linter** for the backend. Only npm scripts: `start`, `dev`, `seed`.
- Entry: `backend/server.js` mounts helmet (with `crossOriginResourcePolicy: cross-origin` for image embedding), compression, CORS (dev-origin allowlist incl. LAN private ranges), `express.json({limit:'50mb'})`, morgan, static `/uploads`, a health route (`GET /api/status`), all route modules under `/api/...` (incl. `/api/ai`), an inline error handler, and a 404 handler.
- `backend/middleware/errorHandler.js` exists but **is not wired into `server.js`** (dead code; `server.js` has its own inline handler).
- Data: `mongodb://localhost:27017/animal_planet` by default. No `.env` present locally (only tracked `backend/.env.example`; `backend/.gitignore` ignores `.env`, `node_modules/`, `uploads/`).
- PetGPT is a single controller pair (`ai.controller.js`) behind the `/api/ai` router. There is **no conversation store, no tool layer, no SSE/streaming**.

## 2. Complete Request/Response Flow

### `POST /api/ai/ask` (auth required) — `askPetGPT`
1. `protect` middleware validates `Authorization: Bearer <jwt>`, loads `User.findById(decoded.id)` (minus password), rejects missing/blocked users, sets `req.user` = full Mongoose doc.
2. Body `{ question }` — only check: non-empty string after trim, else `400 {success:false, message:"Question is required."}`.
3. Pet context: `Pet.find({ owner: req.user._id }).select("name species breed").populate("breed","name").limit(5).lean()` inside a try/catch that silently sets `petContext = []` on failure.
4. `callGemini(question, petContext)`:
   - Returns `null` immediately if `process.env.GEMINI_API_KEY` unset.
   - Raw `fetch` to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=<API_KEY>`.
   - Body: `{ systemInstruction: { parts: [{text: <system>}] }, contents: [{ parts: [{ text: userPets + "User asks: " + question }] }] }`.
   - 25s `AbortController` timeout.
   - On non-OK response or unparseable body → returns `null`. On exception → `null`. **No logging of any of these.**
5. If Gemini returned nothing → `fallbackAnswer(question)` = keyword-matched canned strings (dog/cat/vaccin/food/diet/exercise/walk), else a generic "provide more details" line.
6. Respond `200 { success: true, question, answer }`. Any upstream throw → `500 { message: error.message }` (leaks Mongo/Express error text).

### `POST /api/ai/advice` (auth required) — `getPetAdvice`
1. Body `{ petId }` → `400` if missing/invalid ObjectId.
2. `Pet.findOne({ _id: petId, owner: req.user._id })` populated with `breed` → `404 "Pet not found or not owned by you."` if no match (ownership enforced).
3. Rule-based advice array (not AI): unvaccinated → warn; `age < 1` → young-pet advice; missing/zero weight → record-weight advice; else generic continue-care advice.
4. Respond `200 { success, pet: {id,name,species,breed,age,weight,vaccinated}, advice }`.

## 3. Relevant Files and Modules

| File | Role |
|---|---|
| `backend/routes/ai.routes.js` | Mounts `/ask`, `/advice`, both behind `protect` |
| `backend/controllers/ai.controller.js` | `askPetGPT`, `getPetAdvice`, `callGemini`, `fallbackAnswer` |
| `backend/middleware/auth.js` | `protect` (JWT) + `adminOnly` |
| `backend/config/gemini.js` | **Unused** `@google/generative-ai` SDK wrapper (`gemini-1.5-flash`) |
| `backend/models/Pet.js` / `User.js` / `Breed.js` | Pet & ownership data |
| `backend/models/HealthRecord.js`, `Vaccination.js`, `Reminder.js`, `Appointment.js`, `Veterinarian.js` | Adjacent data (currently **not** exposed to PetGPT) |
| `backend/server.js` | Route mount `/api/ai`, middleware, error/404 handlers |
| `frontend/js/petgpt.js` | Chat UI: `FamiPetAPI.post("/ai/ask", {question})`, error fallback to **its own** canned `getResponse()` |
| `frontend/pages/petgpt.html` | Chat page, quick questions, popular topics, emergency card, "Find Nearby" button |
| `frontend/js/api.js` | `FamiPetAPI` fetch wrapper (`API_BASE=http://localhost:5000/api`, Bearer token from `localStorage`) |
| `frontend/js/home.js` / `sidebar.js` | Promo card + nav link to `petgpt.html` |
| `frontend/index.html` | Footer "PetGPT" link is `href="#"` (dead) |

## 4. Current Capabilities

- Single-turn, stateless Q&A about general pet care (Gemini-backed when a key is configured).
- Injects the user's pet names/species/breeds (max 5) into the prompt.
- Keyword fallback so chat "works" offline / without a key.
- Rule-based per-pet advice endpoint.
- Owns no conversation; no memory of prior questions or follow-ups.

## 5. Available Tools

**None.** No function calling / tool parameters are sent to Gemini. `callGemini` only sends `systemInstruction` + one inline text part and reads back `candidates[0].content.parts[].text`. The only "tool" is the hard-coded `fallbackAnswer` keyword matcher on the backend, plus a duplicated client-side canned matcher in `petgpt.js`.

## 6. Data/Context Available to the AI

Currently sent to Gemini per ask:
- `name`, `species`, `breed.name` — for up to 5 pets owned by the user.

Available in the DB but **not** used:
- Pet: `age`, `weight`, `gender`, `vaccinated`, `description`, `status`, `adopted`.
- Breed: `origin`, `lifespan`, `weightRange`, `heightRange`, `temperament`, `exerciseRequirements`, `groomingGuide`, `commonDiseases`, `suitableEnvironment`, `description`.
- Per-user, per-pet: health records (diagnosis/treatment/doctor/hospital/prescription/visit dates), vaccinations (name/dose/dates/status), reminders (type/date/time/frequency), appointments (type/status/notes/symptoms), veterinarians.
- User: `name`, `city`, `phone`, `address` (not exposed to AI today).

## 7. Gemini Configuration

- Model: hard-coded `gemini-1.5-flash` (in `ai.controller.js` via REST URL; duplicated in unused `config/gemini.js`).
- Transport: raw `fetch` to the v1beta REST endpoint with API key in the query string. The `@google/generative-ai` SDK is installed but unused.
- No `generationConfig` (temperature, `maxOutputTokens`, topK/topP), no `safetySettings`, no `tools`, no stop sequences, no candidate count. System prompt only; user turn is `userPets + "User asks: " + question`.
- Timeout: 25s client abort.
- No retries, no rate-limit handling, no usage/cost tracking.

## 8. Current Prompts/Instructions

System instruction (verbatim logic):
```
You are PetGPT, a friendly pet-care assistant inside the FamiPet app.
Answer clearly and helpfully in 2-4 sentences. Focus on pet health, care,
nutrition, behavior, and veterinary advice.
```
No medical disclaimer, no refusal policy, no scope limits, no "urgency → contact a vet / emergency helpline" rule, no grounding instruction to admit when it doesn't know, no instruction about using the pet context, and no prompt-injection hardening beyond a `"User asks: "` label.

Fallback prompt/canned replies: fixed keyword strings (see §2.5) and a generic "provide more details" default.

## 9. Conversation/History Behavior

- **None.** Every `/ai/ask` is independent. No conversation model exists in the backend, no session ids, no message persistence, nothing stored client-side either (messages are DOM-only and lost on refresh).
- Follow-up questions ("and what about food?") get no context.
- No per-user chat ledger → no ability to personalize, moderate, or charge/limit by usage besides the auth gate.

## 10. Security and Authorization Model

- JWT Bearer on both PetGPT endpoints (`protect`). Payload `{ id }` (user ObjectId string), exp `30d` default. `req.user` is a fresh full User doc per request.
- `getPetAdvice` enforces pet ownership (`owner: req.user._id`) → cross-user pet access returns 404 (verified e2e).
- `askPetGPT` scopes the pet-context query to the authenticated user — no cross-tenant leakage of context; only that user's pets enter the prompt.
- Gaps:
  - **No rate limiting / per-user quota** on `/api/ai/ask` → unlimited, anonymously auth'd-but-not, LLM spend.
  - **No input length cap** on `question` → token blowup / cost abuse.
  - Prompt-injection surface: arbitrary user text + a thin system prompt that does not forbid ignoring instructions or claiming lab results.
  - Gemini key is sent as a URL query parameter (works, but `x-goog-api-key` header is the non-leaking convention).
  - Errors re-surface internal messages (`res.status(500).json({ message: error.message })`).
  - CORS intentionally allows any private-LAN origin in dev; JWT lives in `localStorage` (XSS-sensitive).

## 11. Current Limitations

- Stateless single-turn chat; no memory of the user's pets beyond a flat `name (species, breed)` string.
- Thin context (no age/weight/health/vaccination/reminder data), so answers are generic even when specific data exists.
- No tool/function calling — AI cannot look anything up, cannot reference real records, cannot carry out any action.
- `gemini-1.5-flash` hard-coded; no model config knobs; no streaming; no retry/backoff; no structured output.
- Silent failure cascade: any Gemini failure (missing key, rejection, timeout, parse error) degrades to canned keywords with **zero logging** — operators cannot tell AI was down.
- Duplicated, drifting canned-answer logic in two places (backend `fallbackAnswer`, frontend `getResponse` in `petgpt.js`).
- No safety guardrails for a pet-health product: e.g. dosage questions, "should I go to the vet", poisoning, emergency — no escalation policy in the prompt.
- Hard-coded UI bits: `petgpt.html` greets "Hi Mahek!", footer `index.html` PetGPT link is dead, quick-question/topic buttons are static.
- Backend error handling inconsistent: `errorHandler.js` unused; some controllers leak `error.message`.

## 12. Bugs/Issues Found

1. `config/gemini.js` is dead code; two divergent Gemini configs/models exist (SDK vs raw REST). Cleanup or reconcile.
2. Gemini failures are completely unobserved: `callGemini` returns `null` silently; pet-context lookup failure is equally silent (in `askPetGPT`). No logs, no metrics.
3. No `maxOutputTokens`: Gemini can return up to the model default per call despite the 2-4 sentence instruction → wasted tokens/cost.
4. No question-length cap → huge inputs hit the API or cost money, and the 400/abort path is indistinguishable from a model failure.
5. Weak system prompt for a pet **health** assistant: no disclaimer, no emergency guidance, no refusal policy (dosage/diagnosis hallucinations risk).
6. Fallback answer can reference a species the user doesn't own (e.g. generic dog advice to a cat owner) — keyword matcher has no pet-context awareness.
7. Full user DB doc is attached to `req.user` on every request including these endpoints (minor over-fetch; pattern across app).
8. Frontend duplicates canned answers (`getResponse`) that already diverge from backend `fallbackAnswer`.
9. `errorHandler.js` (with CastError/11000/ValidationError handling) is never mounted — validation errors surface as raw `error.message` 500s from catch blocks instead.
10. No concurrency control: double-click Send fires duplicate `/ai/ask` calls (frontend has no in-flight guard).

## 13. Enhancement Opportunities

- **Conversation & memory**: persist chat sessions/messages per user; send prior turns; let the AI remember "my dog Max".
- **Richer pet context**: include age/weight/gender/vaccinated/description, full breed data (temperament, exercise, grooming, common diseases), recent health records, vaccinations, reminders, upcoming appointments, and relevant veterinarians.
- **Tool/function calling**: read-side tools (get pet's health records / vaccinations / reminders / appointments, find veterinarians by city) so answers are grounded in real data; guarantee ownership scoping on every tool.
- **Robust model config**: configurable model, `temperature`, `maxOutputTokens`, topK/topP, `safetySettings`, abort/retry/backoff, structured JSON output where useful.
- **Prompt hardening**: medical disclaimer, emergency escalation, refusal-of-diagnosis, "state what you know vs don't", no shell/instruction-follow pressure, max prompt size.
- **Guardrails/ops**: rate limit + per-user daily quota on `/ai/ask`, question length cap, structured logs + a failure metric for Gemini, cost tracking.
- **Streaming**: SSE/streaming responses for perceived latency.
- **Frontend contract**: remove duplicate canned logic, in-flight guard, fix dead links, make greeting dynamic, keep the public `/ai/ask` contract (or add versioned endpoints).
- **Reconcile Gemini layer**: drop the unused SDK config or adopt the SDK consistently (it also exposes function calling more cleanly than raw REST).
- Wire `errorHandler.js`; stop leaking internal error messages.

## 14. Important Architectural Constraints

- Keep the vanilla frontend's `/ai/ask` contract working — the React migration runs concurrently in another worktree; any frontend-consuming change on this branch must remain compatible with the existing `frontend/js/petgpt.js` (or be clearly additive/versioned). Do not modify files that the React worktree owns if avoidable.
- Backend pattern: controller + Mongoose model + `req.user._id` ownership; `{ _id, user }` scoping is the established security idiom — new tools must follow it.
- No test infrastructure or linter exists; any added logic must leave its own runnable check (per repo convention, an assert-based demo or small `test_*.js`), not depend on a framework.
- Keep dependencies minimal — the SDK (`@google/generative-ai`) is already installed if the API path is reused.
- Env keys required for live Gemini: `GEMINI_API_KEY`. The repo only tracks `.env.example`.

## 15. Recommended Phased Enhancement Plan

Each phase lands on `feature/petgpt-enhancement`, is backward-compatible with the vanilla frontend, and runs its own check; no phase touches reaction-migration work.

- **Phase 0 — Foundation & observability**: wire `errorHandler.js`; log Gemini outcomes (ok/abort/error/fallback) with latency; reconcile or delete `config/gemini.js`; cap `question` length; add an `assert`-backed test for the AI controller's fallback/validation logic.
- **Phase 1 — Model config & safety prompt**: configurable model/temperature/`maxOutputTokens`/safety settings; rewrite system prompt (medical disclaimer, emergency helpline, no-diagnosis, uncertainty honesty); keep responses streaming-compatible.
- **Phase 2 — Richer context**: expand pet context (age/weight/gender/vaccinated/description, full breed doc); assemble a compact per-user context blob; token-budget it (truncate oldest data) before sending.
- **Phase 3 — Conversation history**: add a `Chat`/`Message` model + per-user session; include recent turns; expose GET history; enforce retention/limits.
- **Phase 4 — Tool/function calling**: define read-only, ownership-scoped tools (pet's health records, vaccinations, reminders, upcoming appointments, vets by city) with locked schemas + validation; map results back into the prompt; unit-test the ownership guard per tool.
- **Phase 5 — Guardrails & scaling**: rate limit + daily quota (`/ai/ask`), in-flight lock semantics on the contract, response caching for repeated questions if warranted, cost tracking per user/day.
- **Phase 6 — Streaming + frontend contract**: SSE streaming of answers; refresh the vanilla PetGPT page only if safe (else keep contract and leave UI to the React fork); remove duplicated frontend canned answers.
- **Phase 7 — Evaluation**: small golden-set of pet-care queries with expected refusal/disclaimer boundary checks to prevent regression.

---

### Audit verification log (2026-09-22)

- `npm install` in `backend/` (node_modules was absent; gitignored). Lockfile unchanged.
- `node --check` on all 55 backend JS files → all pass.
- Require-load of all 54 backend modules → all load.
- Fresh server boot on isolated port against real local Mongo (`animal_planet`): `/`, `/api/status`, 404 handler all correct; Mongo connects.
- E2E over real HTTP + Mongo (isolated server, seeded+cleaned test user):
  - login → 200 with token
  - `POST /api/pets` → 201
  - `POST /api/ai/ask` (no `GEMINI_API_KEY`) → 200 via fallback path
  - `POST /api/ai/ask` empty question → 400
  - `POST /api/ai/advice`: owned pet → 200; foreign pet id → 404; invalid id → 400; missing id → 400
  - no-token / bad-token on `/api/ai/*` → 401
- Pre-existing operational issues (not introduced by this audit, not PetGPT code bugs): no `.env` (so register fails at SMTP step with 500, Gemini key absent); a leftover `node server.js` on :5000 belongs to the **other** worktree (`~/Code/FamiPet/backend`) and was left untouched.
- Test data (1 user, 1 pet) created for verification was removed afterward; DB left as found.