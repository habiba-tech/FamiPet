# PetGPT — Enhancement Working Reference

Branch: `feature/petgpt-enhancement`
Scope: FamiPet backend PetGPT (AI assistant) enhancement.
Constraint: The React migration runs in a separate worktree (`~/Code/FamiPet`, branch `react-migration`). Do **not** touch it, merge it, or build on it. Vanilla frontend + this backend are the working surface. This phase is backend-only; the vanilla frontend contract is preserved.

Everything below is based on the actual code at the time it was written. Nothing speculative or aspirational.

---

## Product Rules (non-negotiable)

PetGPT's behavior is governed by these rules. They are encoded in the backend system prompt (`buildSystemPrompt()` in `backend/config/ai.js`) and enforced where possible by backend logic. The provider/model may not override them.

1. **PetGPT is NOT a general-purpose chatbot.**
   - Only handle requests relevant to FamiPet and pet-care functionality supported by the application.
   - Clearly unrelated requests must receive a concise scope response.

2. **Never fabricate information.**
   - If PetGPT does not know something or lacks reliable information, it must explicitly say so.
   - It must never invent pet records, FamiPet data, capabilities, actions, tools, or results.

3. **Never pretend an unavailable FamiPet feature exists.**
   - If a requested action/feature is not currently implemented in FamiPet/PetGPT, explicitly state that it is currently unavailable.
   - Never simulate successful execution.

4. **Never recommend competing or alternative applications/services for the same purpose as FamiPet.**
   - PetGPT must not tell users to use another pet-management app, pet-care app, or similar competing application instead of FamiPet.
   - If FamiPet does not support something, state that the capability is currently unavailable.
   - This does NOT prevent appropriate real-world safety guidance: contacting a veterinarian, emergency veterinary service, animal hospital, or another qualified professional when necessary.

5. **PetGPT must remain honest about its capabilities.**
   - It may only claim to perform actions that are actually implemented and authorized through backend tools.
   - Tool availability is determined by the backend, never invented by the model.

6. **PetGPT must respect user/pet ownership boundaries.**
   - AI context and future tools must never expose another user's pets or records.

7. **PetGPT must have clear pet-health safety boundaries.**
   - Never present diagnosis as fact.
   - Never invent medical records/results.
   - Clearly escalate emergencies and situations requiring professional veterinary attention.

---

## 1. Current Architecture

- **Stack**: Express 4 + Mongoose 8 (MongoDB), vanilla Node backend in `backend/`; vanilla HTML/CSS/JS frontend in `frontend/` (served statically either by Live Server or by the backend's own fallback listener on `CLIENT_URL`/5502).
- **No TypeScript, no build step, no test suite, no linter** for the backend. Only npm scripts: `start`, `dev`, `seed`, `test` (assert-based provider-layer checks, no framework).
- Entry: `backend/server.js` mounts helmet (with `crossOriginResourcePolicy: cross-origin` for image embedding), compression, CORS (dev-origin allowlist incl. LAN private ranges), `express.json({limit:'50mb'})`, morgan, static `/uploads`, a health route (`GET /api/status`), all route modules under `/api/...` (incl. `/api/ai`), an inline error handler, and a 404 handler.
- `backend/middleware/errorHandler.js` exists but is **not wired into `server.js`** (dead code; `server.js` has its own inline handler).
- Data: `mongodb://localhost:27017/animal_planet` by default. No `.env` present locally (only tracked `backend/.env.example`; `backend/.gitignore` ignores `.env`, `node_modules/`, `uploads/`).
- PetGPT is a controller pair (`ai.controller.js`) behind the `/api/ai` router, a central config module (`backend/config/ai.js`), and a provider layer (`backend/ai/`) with a Google/Gemini adapter and an OpenAI-compatible adapter. No conversation store, no tool layer, no SSE/streaming yet.

## 2. Complete Request/Response Flow

### `POST /api/ai/ask` (auth required) — `askPetGPT`
1. `protect` middleware validates `Authorization: Bearer <jwt>`, loads `User.findById(decoded.id)` (minus password), rejects missing/blocked users, sets `req.user` = full Mongoose doc.
2. Body `{ question }`:
   - empty/whitespace → `400 {success:false, message:"Question is required."}` (unchanged contract).
   - longer than `AI_CONFIG.maxQuestionLength` (default 2000) → `400 "Question is too long. Maximum length is N characters."`
   - clearly unrelated topic (scope gate in `config/ai.js`) → `200 {success:true, question, answer: <scope response>}` and **no** provider call.
3. Pet context: `Pet.find({ owner: req.user._id }).select("name species breed").populate("breed","name").limit(5).lean()` inside a try/catch that silently sets `petContext = []` on failure.
4. `generatePetGPTResponse(question, petContext)` (`backend/ai/index.js`) resolves the active provider (default `google`; `openai` selects an OpenAI-compatible endpoint) and calls `provider.generate({ system, question, petContext })`:
   - Google adapter (`backend/ai/gemini.js`): raw `fetch` to the v1beta `generateContent` endpoint with the key in the query string; `config` error if `GEMINI_API_KEY` unset.
   - OpenAI adapter (`backend/ai/openai.js`): `POST {baseUrl}/chat/completions` with `Authorization: Bearer <key>` and `{model, messages:[{system},{user}], stream:false}`; parses `choices[0].message.content`; `config` error if base URL/key/model unset.
   - Shared layer (`backend/ai/provider.js`): normalized errors `config|timeout|http|malformed|unknown` via `AiProviderError`; fetch wrapped in an AbortController timeout (`AI_CONFIG.timeoutMs`); logs each outcome as `PetGPT: provider "<name>" ok/failed (<code>) after Nms ...`; on failure logs provider+code and returns `null`. Logs never contain keys, auth headers, or request bodies.
5. If the provider returned none → `fallbackAnswer(question)` (keyword-matched canned strings — unchanged behavior).
6. Respond `200 { success: true, question, answer }`. Any upstream throw → `500 { message: error.message }`.

### `POST /api/ai/advice` (auth required) — `getPetAdvice`
1. Body `{ petId }` → `400` if missing/invalid ObjectId.
2. `Pet.findOne({ _id: petId, owner: req.user._id })` populated with `breed` → `404 "Pet not found or not owned by you."` if no match (ownership enforced).
3. Rule-based advice array (not AI): unvaccinated → warn; `age < 1` → young-pet advice; missing/zero weight → record-weight advice; else generic continue-care advice.
4. Respond `200 { success, pet: {id,name,species,breed,age,weight,vaccinated}, advice }`.

## 3. Relevant Files and Modules

| File | Role |
|---|---|
| `backend/routes/ai.routes.js` | Mounts `/ask`, `/advice`, both behind `protect` |
| `backend/controllers/ai.controller.js` | `askPetGPT`, `getPetAdvice`, `fallbackAnswer`; provider calls delegated to `backend/ai` (Phase 1) |
| `backend/ai/index.js` | **Provider layer entry (Phase 1):** registers `google`+`openai` adapters, selects the active one, `generatePetGPTResponse()` with normalized outcome logging (`ok`/`failed (<code>); using fallback`) |
| `backend/ai/provider.js` | **Provider contract/interface (Phase 1):** `AiProviderError` + `AI_ERROR_CODES` (`config|timeout|http|malformed|unknown`), adapter registry, `fetchWithTimeout` (AbortController), `parseJson`, `userPetsText` prompt assembly |
| `backend/ai/gemini.js` | **Google/Gemini adapter (Phase 1)** — name `"google"`; same endpoint/body/config as pre-Phase-0 `callGemini`; `GEMINI_API_KEY` + `PETGPT_MODEL` |
| `backend/ai/openai.js` | **OpenAI-compatible adapter (Phase 1)** — name `"openai"`; chat-completions dialect, no SDK, no vendor hard-coding (OmniRoute/proxies/local endpoints all work) |
| `backend/config/ai.js` | **PetGPT foundation (Phase 0) + provider config (Phase 1):** `AI_CONFIG` (provider/model/timeout/length + `gemini`/`openai` blocks), `buildSystemPrompt()` (product rules), `outOfScopeResponse()` scope gate |
| `backend/middleware/auth.js` | `protect` (JWT) + `adminOnly` |
| `backend/models/Pet.js` / `User.js` / `Breed.js` | Pet & ownership data |
| `backend/models/HealthRecord.js`, `Vaccination.js`, `Reminder.js`, `Appointment.js`, `Veterinarian.js` | Adjacent data (currently **not** exposed to PetGPT) |
| `backend/server.js` | Route mount `/api/ai`, middleware, error/404 handlers |
| `backend/test/ai-provider.test.js` (new, npm `test`) | **Phase 1 assert-based checks (no framework, no real keys):** adapter error-code mapping, real local mock OpenAI endpoint, service fallback & logging |
| `backend/models/HealthRecord.js`, `Vaccination.js`, `Reminder.js`, `Appointment.js`, `Veterinarian.js` | Adjacent data (currently **not** exposed to PetGPT) |
| `backend/server.js` | Route mount `/api/ai`, middleware, error/404 handlers |
| `frontend/js/petgpt.js` | Chat UI: `FamiPetAPI.post("/ai/ask", {question})`, error fallback to **its own** canned `getResponse()` |
| `frontend/pages/petgpt.html` | Chat page, quick questions, popular topics, emergency card, "Find Nearby" button |
| `frontend/js/api.js` | `FamiPetAPI` fetch wrapper (`API_BASE=http://localhost:5000/api`, Bearer token from `localStorage`) |
| `frontend/js/home.js` / `sidebar.js` | Promo card + nav link to `petgpt.html` |
| `frontend/index.html` | Footer "PetGPT" link is `href="#"` (dead) |

## 4. Current Capabilities

- Single-turn, stateless Q&A about general pet care via a pluggable provider layer (Google/Gemini default; any OpenAI-compatible endpoint selectable via `PETGPT_PROVIDER=openai` — Phase 1).
- Provider failures are normalized (`config|timeout|http|malformed|unknown`) and logged with provider name + code, then fall back to canned answers; contract and status codes never leak provider errors.
- Injects the user's pet names/species/breeds (max 5) into the prompt.
- Scope gate rejects clearly unrelated requests with a fixed scope response (Phase 0).
- Question length limit enforced (Phase 0).
- Keyword fallback so chat "works" offline / without a key.
- Rule-based per-pet advice endpoint.
- Owns no conversation; no memory of prior questions or follow-ups.

## 5. Tools

**None implemented.** No function calling / tool parameters are sent to the provider. Product rule 5 means tools can only be added via the backend tool architecture (§D below). The only "tool" today is the hard-coded `fallbackAnswer` keyword matcher on the backend, plus a duplicated client-side canned matcher in `petgpt.js`.

## 6. Data/Context Available to the AI

Currently sent per ask:
- `name`, `species`, `breed.name` — for up to 5 pets owned by the user.

Available in the DB but **not** used:
- Pet: `age`, `weight`, `gender`, `vaccinated`, `description`, `status`, `adopted`.
- Breed: `origin`, `lifespan`, `weightRange`, `heightRange`, `temperament`, `exerciseRequirements`, `groomingGuide`, `commonDiseases`, `suitableEnvironment`, `description`.
- Per-user, per-pet: health records, vaccinations, reminders, appointments, veterinarians.
- User: `name`, `city`, `phone`, `address`.

## 7. Provider Configuration (Gemini default; OpenAI-compatible selectable)

- Provider/model/config centralized in `backend/config/ai.js` (`AI_CONFIG`), read once at boot (env snapshot).
  - `PETGPT_PROVIDER` — `"google"` (default; keeps existing deployments working) or `"openai"`.
  - `GEMINI_API_KEY` + `PETGPT_MODEL` (default `gemini-1.5-flash`) — Google/Gemini adapter.
  - `PETGPT_OPENAI_BASE_URL` (endpoint root, no trailing slash; adapter appends `/chat/completions`), `PETGPT_OPENAI_API_KEY`, `PETGPT_OPENAI_MODEL` (required when `"openai"`) — OpenAI adapter.
  - `PETGPT_TIMEOUT_MS` (default 25000), `PETGPT_MAX_QUESTION_LENGTH` (default 2000) — apply to every provider.
- Transport: raw `fetch`; Google uses the v1beta REST endpoint with key in the query string; OpenAI-compatible uses `POST {baseUrl}/chat/completions` with `Authorization: Bearer <key>`. No provider SDK used by the adapters (`@google/generative-ai` package remains installed but unused).
- System prompt = product rules (§Product rules) via `buildSystemPrompt()`. User turn is `userPets + "User asks: " + question`.
- Timeout: 25s client abort; outcome logging on every path with provider name + normalized code (Phase 0 foundation, Phase 1 provider layer).
- Logs never contain API keys, auth headers, or request bodies.
- No `generationConfig` (temperature, `maxOutputTokens`, topK/topP), no `safetySettings`, no `tools`, no stop sequences, no candidate count (later phases). No retries, no rate-limit handling, no usage/cost tracking.

## 8. Conversation/History Behavior (current = none; design in §B)

- **None.** Every `/ai/ask` is independent. No conversation model exists, no session ids, no message persistence, nothing stored client-side either (messages are DOM-only and lost on refresh).
- Follow-up questions ("and what about food?") get no context.

## 9. Security and Authorization Model

- JWT Bearer on both PetGPT endpoints (`protect`). Payload `{ id }` (user ObjectId string), exp `30d` default. `req.user` is a fresh full User doc per request.
- `getPetAdvice` enforces pet ownership (`owner: req.user._id`) → cross-user pet access returns 404 (verified e2e).
- `askPetGPT` scopes the pet-context query to the authenticated user — no cross-tenant leakage of context.
- Gaps (tracked, later phases): no rate limiting / per-user quota; no per-request cost cap beyond length limit; prompt-injection surface mitigated only by prompt + length cap; Gemini key in query string; internal error messages leak on 500s.

## 10. Current Limitations

- Stateless single-turn chat; no memory.
- Thin context (no age/weight/health/vaccination data).
- No tool/function calling.
- `gemini-1.5-flash` default, no streaming, no retry/backoff, no structured output.
- Scope gate is a keyword heuristic (deliberate; see `config/ai.js` `ponytail:` comment).
- Duplicated drifting canned-answer logic (backend `fallbackAnswer` vs frontend `getResponse`).
- No safety/observability infra beyond console logs.
- Hard-coded UI bits (greeting, dead footer link, static topics) — frontend changes are out of scope on this branch.

## 11. Bugs/Issues Status

| # | Issue | Status |
|---|---|---|
| 1 | `config/gemini.js` dead code, divergent configs | **Fixed in Phase 1** — dead file removed; single `AI_CONFIG` + provider layer |
| 2 | Gemini failures unobserved / silent | **Fixed in Phase 0** — outcome logging on all paths; **Phase 1** adds normalized provider codes |
| 3 | No `maxOutputTokens` | Open (Phase 1/5) |
| 4 | No question-length cap | **Fixed in Phase 0** — `AI_CONFIG.maxQuestionLength` |
| 5 | Weak system prompt for a pet-health assistant | **Fixed in Phase 0** — product-rules prompt |
| 6 | No scope boundary for unrelated requests | **Fixed in Phase 0** — scope gate + prompt |
| 7 | Fallback can reference wrong species | Open (rich context, Phase 5) |
| 8 | Full user doc attached to `req.user` | Open — app-wide pattern |
| 9 | Frontend duplicates canned answers | Open (frontend out of scope on this branch) |
| 10 | `errorHandler.js` never mounted | Open (backend-wide, not PetGPT-specific) |
| 11 | No in-flight guard on Send | Open (frontend out of scope) |

## 12. Architecture Roadmap (design intent)

### A. Provider abstraction
- PetGPT must NOT be architecturally tied to Google/Gemini, nor to OmniRoute.
- ✅ **Implemented (Phase 1):** `backend/ai/` provider layer — `provider.js` (contract: `provider.generate({system, question, petContext}) → {text, latencyMs}`; `AiProviderError` + `AI_ERROR_CODES` `config|timeout|http|malformed|unknown`; `register/getProvider/getActiveProvider` registry; `fetchWithTimeout`, `parseJson`, `userPetsText`), `gemini.js` (name `"google"`, default), `openai.js` (name `"openai"`, chat-completions dialect, no SDK), `index.js` (registration + `generatePetGPTResponse()` with normalized logging and `null`-on-failure fallback signal). The controller no longer embeds vendor details.
- Additive providers implement the same contract and `register()` their name; selection stays env-driven via `AI_CONFIG.provider`.
- OpenAI-compatible APIs are the initial compatibility target (chat completions shape). OmniRoute is only one possible provider implementation/configuration, never a hard dependency.
- Users should eventually configure their own compatible provider/API key (Phase 2).
- Provider-specific details stay isolated behind the provider layer; the controller/policy code never embeds vendor knowledge.

### B. Conversation architecture (design, not implemented)
- Persistent `Conversation` + `Message` models.
- Conversations belong to the authenticated user (`owner: user`).
- Messages belong to a conversation (parent ref), ordered, with `role` and content.
- Pet context is associated safely (per-conversation or per-message pet refs) and **must** be validated against `owner === req.user._id` before any read; never allows cross-user access.

### C. Durable generation architecture (design, not implemented)
- An accepted AI request must be able to continue even if the browser refreshes, changes page, or loses focus.
- The persisted backend result becomes the source of truth; the frontend reads it back/replays it.
- A generation record (request, status: queued/running/done/failed, result, timestamps) owned by the user.
- Streaming/reconnection is a later delivery mechanism (Phase 8), not a requirement for durability.

### D. Tool architecture (design, not implemented)
- Tools must be:
  - explicitly registered (not discoverable/invented by the model);
  - strictly schema-validated (arguments);
  - authenticated-user ownership enforced on every record access;
  - only exposed for actually implemented FamiPet capabilities;
  - never invented by the model;
  - returning structured results;
  - auditable (logged invocations).
- Backend decides which tools exist and are available; the model only calls what the backend offers (product rule 5).

### E. Provider capabilities
- Providers/models differ in capability: chat, streaming, tool calling, structured output, vision, context length, cost.
- Never assume a provider supports every capability; capability detection/declaration lives in the provider layer and is checked before a request relies on it.

### F. Observability and limits
- Needed: input/question length limits (Phase 0), provider timeout handling (Phase 0), retries/backoff where appropriate, rate limiting, per-user quotas, provider failure logging (Phase 0), usage/cost tracking where available.
- Only the minimal foundation items (length limit, timeout, failure logging) are in Phase 0; the rest land in Phase 7.

## 13. Important Architectural Constraints

- Keep the vanilla frontend's `/api/ai/ask` contract working — the React migration runs concurrently in another worktree; any frontend-consuming change on this branch must remain compatible with `frontend/js/petgpt.js`. Do not modify files the React worktree owns.
- Backend pattern: controller + Mongoose model + `req.user._id` ownership; `{ _id, user }` scoping is the established security idiom — new tools/conversations must follow it.
- No test infrastructure or linter exists; any added logic leaves its own runnable check (assert-based demo or small `test_*.js`), not a framework.
- Keep dependencies minimal — the SDK (`@google/generative-ai`) is already installed if reused; do not add providers as hard deps.
- Env keys required for live Gemini: `GEMINI_API_KEY`; repo only tracks `.env.example`.

## 14. Phased Roadmap

Ordering rationale: (1) a stable provider interface must exist before anything consumes it (Phase 0→1→2); (2) conversations and durable generations both consume the provider and are prerequisites for good context and tools (3→4); (3) rich pet context and tool calling build on persisted conversations so the AI can reference "Max's vaccination history" across turns (5→6); (4) safety/limits/observability gate any public/general use and rate the spend (7); (5) streaming is a delivery mechanism layered on durable generations (8); (6) evaluation keeps the product honest against the non-negotiable rules (9). This reorders the earlier draft (which had context before provider/config) because provider/config are upstream dependencies.

- **Phase 0 — Foundation & Architecture** ✅ implemented
  Backend-only. Central config/prompt/scope module (`config/ai.js`), product-rules system prompt, question-length limit, outcome logging, scope gate. `/api/ai/ask` contract preserved; Gemini fallback preserved. Later-phase architecture documented (not implemented).
- **Phase 1 — Provider abstraction + OpenAI-compatible provider** ✅ implemented
  Provider layer (`backend/ai/`): chat-completions-shaped `provider.generate(...)` contract, normalized error codes (`config|timeout|http|malformed|unknown`), adapter registry, Google/Gemini adapter (default, preserves `GEMINI_API_KEY`), OpenAI-compatible adapter (no SDK, no vendor hard-coding), service entry with normalized outcome logging and `null`-on-failure fallback. Dead `config/gemini.js` removed; single `AI_CONFIG`. Verified by assert-based `npm test` + e2e.
- **Phase 2 — Provider/API-key/model configuration**
  Per-user or per-instance provider + model + API key configuration; manage secrets; provider selection honored by the provider layer.
- **Phase 3 — Persistent conversations/messages**
  Implement §B: `Conversation`/`Message` models, ownership-scoped CRUD, conversation-aware ask endpoint (backward-compatible), history fetch.
- **Phase 4 — Durable AI generations + recovery**
  Implement §C: generation records with status transition, persisted result as source of truth, replay/recovery path, cleanup/retention.
- **Phase 5 — Rich pet context**
  Expand context: pet age/weight/gender/vaccinated/description, full breed doc, recent health records, vaccinations, reminders, upcoming appointments; token-budget assembly.
- **Phase 6 — Tool/function calling**
  Implement §D: registered, schema-validated, ownership-scoped read tools (pet records, vaccinations, reminders, upcoming appointments, vets by city); structured results fed back; audit logging.
- **Phase 7 — Safety, rate limits, quotas, observability**
  Implement §F: provider rate limits + per-user quotas, retries/backoff, structured failure logging, usage/cost tracking, stronger scope handling (replace keyword gate with provider/moderator judgment).
- **Phase 8 — Streaming/reconnection**
  SSE/streaming as a delivery mechanism on top of durable generations (§C); reconnection/resume.
- **Phase 9 — PetGPT evaluation/regression checks**
  Golden-set of pet-care queries + product-rule boundary checks (scope refusals, honesty, no-competitor, emergency escalation, ownership) as a runnable regression suite.

## 15. Phase 0 Implementation Status & Verification

Implementing note: Phase 0 shipped the foundation; Phase 1 ships the provider layer on top of it. See Phase 1 section after this one.

### Phase 0

Implemented (backend only):
- `backend/config/ai.js` (new): `AI_CONFIG` (provider/model/timeout/maxQuestionLength with env overrides + defaults), `buildSystemPrompt()` encoding the 7 product rules, `outOfScopeResponse()` conservative scope gate (high precision; `ponytail:` comment documents ceiling/upgrade path).
- `backend/controllers/ai.controller.js` (edited): reads config from `config/ai.js`; question length limit (400 on exceed); scope-gate short-circuit (200 with scope answer, no provider call); reusable outcome logging in `callGemini` (no-key/HTTP status/no-text/exception/success with latency); contract (`{success, question, answer}`, 400 empty-question message) unchanged; Gemini fallback path unchanged; `getPetAdvice` unchanged.

Verified on 2026-09-22 against real local Mongo (isolated port, seeded+cleaned test user):
- `node --check` on all touched/files → pass; all backend modules load → pass.
- `POST /api/ai/ask`:
  - empty question → 400 "Question is required." (unchanged)
  - question > 2000 chars → 400 "Question is too long…"
  - clearly unrelated ("what is the capital of France") → 200 scope answer, **no** Gemini/fallback
  - pet question with unrelated token guard ("should I buy bitcoin for my dog's food") → passes scope gate (pet-care keyword present)
  - normal pet question → 200 via fallback path (no `GEMINI_API_KEY` configured), fallback behavior intact
- `POST /api/ai/advice`: owned pet → 200; foreign pet id → 404; invalid id → 400 (ownership/auth intact).
- Auth gate: no token / bad token → 401 (unchanged).
- Server boot clean; no new dependencies added.

### Phase 1 — Provider abstraction + OpenAI-compatible provider

Implemented (backend only, no frontend changes, no React-migration worktree touched):
- `backend/ai/provider.js` (new): provider contract (`provider.generate({system, question, petContext}) → {text, latencyMs}`), `AiProviderError` with normalized `AI_ERROR_CODES` (`config|timeout|http|malformed|unknown`), adapter registry (`register`/`getProvider`/`getActiveProvider`), `fetchWithTimeout` (AbortController → `timeout`; transport errors → `unknown`), `parseJson` (bad JSON → `malformed`), `userPetsText` prompt assembly.
- `backend/ai/gemini.js` (new, name `"google"`, default): preserves the pre-Phase-0 Google adapter exactly — same v1beta `generateContent` endpoint/body, `GEMINI_API_KEY`, `PETGPT_MODEL`; `config` error when key missing; HTTP status → `http`; no text → `malformed`.
- `backend/ai/openai.js` (new, name `"openai"`): `POST {baseUrl}/chat/completions` with `Authorization: Bearer <key>`, `{model, messages:[{role:system},{role:user}], stream:false}`; parses `choices[0].message.content` (string, non-empty); `config` error when base URL / key / model missing; no SDK, no OmniRoute/OpenAI hard-coding.
- `backend/ai/index.js` (new): registers both adapters; `generatePetGPTResponse(question, petContext)` resolves the active provider, logs `PetGPT: provider "<name>" ok ... / failed (<code>) ...; using fallback: <message>`, returns `null` on any failure (controller falls back to static answers). Logs never contain keys, headers, or bodies.
- `backend/config/ai.js` (edited): `AI_CONFIG` split into `{provider, timeoutMs, maxQuestionLength, gemini:{apiKey, model}, openai:{baseUrl, apiKey, model}}`; `buildSystemPrompt`/`outOfScopeResponse` unchanged.
- `backend/controllers/ai.controller.js` (edited): removed `callGemini` (and its Google-specific logic/fetch); controller now calls `generatePetGPTResponse` from `backend/ai`; validation, scope gate, fallback, `getPetAdvice` unchanged.
- `backend/config/gemini.js` (deleted): unused `@google/generative-ai` SDK wrapper (grep-confirmed no require sites).
- `backend/.env.example` (edited): documented all `PETGPT_*` vars + the `GEMINI_API_KEY`/`PETGPT_OPENAI_*` pair.
- `backend/test/ai-provider.test.js` (new) + `npm test` script: 17 assert-based checks, no framework, no external API keys — stub a fake `global.fetch` for the Google adapter (missing key/valid/HTTP/429/malformed/timeout-abort/network-error), a **real local mock HTTP server** for the OpenAI adapter (valid/500/non-JSON/timeout/missing-key/missing-model), and service-level checks (selection, `null` fallback, provider+code logging).

Verified on 2026-09-22 (unit + e2e over real local Mongo with a real mock OpenAI-compatible endpoint):
- `node --check` all touched backend files → pass; `npm test` → 17/17 provider-layer checks pass.
- e2e boot A (`PETGPT_PROVIDER=openai` → mock endpoint): provider answer returned verbatim (`mock openai answer`); mock HTTP 500 → graceful fallback, still 200; empty → 400; > 2000 chars → 400; off-topic → scope answer; advice owned 200 / foreign 404; no-token & bad-token → 401.
- e2e boot B (default `google`, no key): fallback answers intact; pet-word scope guard intact.
- App logs show `provider "google"/"openai" ok/failed (<code>)` — no API keys, auth headers, or request bodies leaked.

---

### Audit verification log (2026-09-22, pre-Phase-0 baseline)

- `npm install` in `backend/` (node_modules was absent; gitignored). Lockfile unchanged.
- `node --check` on all 55 backend JS files → all pass. Require-load of all 54 modules → pass.
- Fresh server boot on isolated port against real local Mongo: `/`, `/api/status`, 404 handler correct.
- E2E over real HTTP + Mongo (seeded+cleaned test user): login → pet create → `/ai/ask` 200 (fallback), `/ai/ask` empty → 400, `/ai/advice` owned 200 / foreign 404 / bad 400 / none 400, no-token & bad-token → 401.
- Pre-existing operational issues (not code bugs): no `.env` (SMTP + Gemini key absent); leftover `node server.js` on :5000 belongs to the **other** worktree (`~/Code/FamiPet/backend`) and was left untouched.
- Test data (1 user, 1 pet) removed after verification; DB left as found.