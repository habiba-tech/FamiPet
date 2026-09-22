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
- PetGPT is a controller pair (`ai.controller.js` + `conversation.controller.js`) behind the `/api/ai` router, a central config module (`backend/config/ai.js`), a provider layer (`backend/ai/`) with a Google/Gemini adapter and an OpenAI-compatible adapter, and (Phase 2) persistent `Conversation`/`Message` models. No tool layer, no SSE/streaming yet.

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

### Persistent conversations (Phase 2) — `/api/ai/conversations` (auth required)

Every conversation/message operation is scoped to `req.user._id` (ownership is never client-supplied). Contract per endpoint: see §16 "API contracts".

Exchange flow behind `POST /api/ai/conversations/:conversationId/messages`:
1. Validate `content` (non-empty, ≤ `AI_CONFIG.maxQuestionLength`) and that the conversation is owned by the user (else 404).
2. Load the user's own pet context (≤ 5 pets) and the conversation's prior user/assistant messages capped at `AI_CONFIG.maxHistoryMessages` (default 20, oldest-first).
3. Persist the user message (`role: "user"`, backend-set).
4. Scope gate: clearly unrelated question → persist the canned scope answer and stop (no provider call). Otherwise call `generatePetGPTResponse(content, petContext, history)` — the system prompt/scope rules still rank above any history.
5. Persist the assistant message — whatever the user actually saw (provider text, or the Phase 1 fallback answer if the provider failed). **The persisted assistant message is the source of truth; it never depends on the HTTP request staying alive.**
6. Update conversation `title` (only if still the default), `lastMessageAt`, `lastMessagePreview`; respond with both persisted messages.

## 3. Relevant Files and Modules

| File | Role |
|---|---|
| `backend/routes/ai.routes.js` | Mounts `/ask`, `/advice` (both behind `protect`), `/conversations` (Phase 2 sub-router) and `/providers` (Phase 3 sub-router) |
| `backend/routes/conversation.routes.js` | **Phase 2** — conversation CRUD + message routes, all behind `protect` |
| `backend/routes/provider.routes.js` | **Phase 3** — provider-config CRUD + test routes, all behind `protect` |
| `backend/controllers/ai.controller.js` | `askPetGPT` (legacy single-turn), `getPetAdvice`, `fallbackAnswer`, `loadPetContext` (shared with the conversation controller); provider calls delegated to `backend/ai` |
| `backend/controllers/conversation.controller.js` | **Phase 2** — create/list/get/clear conversations, add message + Persist→Generate→Persist flow; **Phase 3** — resolves the user's active provider config before generating |
| `backend/controllers/provider.controller.js` | **Phase 3** — provider-config CRUD + test (owner-scoped, encrypted keys, safe responses) |
| `backend/models/Conversation.js` | **Phase 2** — conversation doc (`owner`, `title`, `lastMessageAt`, `lastMessagePreview`, timestamps) |
| `backend/models/Message.js` | **Phase 2** — message doc (`conversation`, `role: user\|assistant\|system`, `content`, timestamps) |
| `backend/models/AiProvider.js` | **Phase 3** — user-owned provider configuration doc (`owner`, `provider`, `name`, `baseUrl`, `model`, `apiKeyEnc` [AES-256-GCM ciphertext], `enabled`, `active`, timestamps) |
| `backend/utils/cipher.js` | **Phase 3** — AES-256-GCM encrypt/decrypt for stored API keys; key derived from `PETGPT_ENCRYPTION_KEY`; fails closed |
| `backend/ai/index.js` | **Provider layer entry (Phase 1):** registers `google`+`openai` adapters, selects the active one, `generatePetGPTResponse()` with normalized outcome logging (`ok`/`failed (<code>); using fallback`). **Phase 3:** `resolveActiveProviderConfig()`, `buildProviderRequest()` (decrypts stored keys only at request time), optional per-user config passed to adapters |
| `backend/ai/provider.js` | **Provider contract/interface (Phase 1):** `AiProviderError` + `AI_ERROR_CODES` (`config|timeout|http|malformed|unknown`), adapter registry, `fetchWithTimeout` (AbortController), `parseJson`, `userPetsText` prompt assembly |
| `backend/ai/gemini.js` | **Google/Gemini adapter (Phase 1)** — name `"google"`; same endpoint/body/config as pre-Phase-0 `callGemini`; `GEMINI_API_KEY` + `PETGPT_MODEL` |
| `backend/ai/openai.js` | **OpenAI-compatible adapter (Phase 1)** — name `"openai"`; chat-completions dialect, no SDK, no vendor hard-coding (OmniRoute/proxies/local endpoints all work) |
| `backend/config/ai.js` | **PetGPT foundation (Phase 0) + provider config (Phase 1):** `AI_CONFIG` (provider/model/timeout/length + `gemini`/`openai` blocks), `buildSystemPrompt()` (product rules), `outOfScopeResponse()` scope gate |
| `backend/middleware/auth.js` | `protect` (JWT) + `adminOnly` |
| `backend/models/Pet.js` / `User.js` / `Breed.js` | Pet & ownership data |
| `backend/models/HealthRecord.js`, `Vaccination.js`, `Reminder.js`, `Appointment.js`, `Veterinarian.js` | Adjacent data (currently **not** exposed to PetGPT) |
| `backend/server.js` | Route mount `/api/ai`, middleware, error/404 handlers |
| `backend/test/ai-provider.test.js` (new, npm `test`) | **Phase 1 assert-based checks (no framework, no real keys):** adapter error-code mapping, real local mock OpenAI endpoint, service fallback & logging |
| `backend/test/conversation-api.test.js` (new, npm `test`) | **Phase 2 assert-based API checks** over real local Mongo: auth gate, create/list/get, ownership isolation, validation, persistence, clear-chat, legacy `/ask` backward compat, no-secrets-in-messages |
| `backend/test/petgpt-provider-conversation.test.js` (new, npm `test`) | **Phase 2 mock-provider checks:** persist→generate→persist flow, history reuse + cap, provider-failure fallback (no fake success), durability from DB |
| `backend/test/petgpt-omniroute.test.js` (new, npm `test`) | **Phase 2 real OpenAI-compatible E2E** through the local OmniRoute container; SKIPS when `PETGPT_OPENAI_API_KEY` is unset |
| `backend/test/provider-config.test.js` (new, npm `test`) | **Phase 3 assert-based checks** over real local Mongo + a mock OpenAI-compatible endpoint: encryption round-trip/wrong-key/missing-key fail-safe, CRUD, validation, ownership isolation, active selection, disabled behavior, test endpoint (no persistence), conversation uses configured provider, disable/delete → env fallback, legacy `/ask` intact, no-secret leakage in messages/docs/logs |
| `backend/test/petgpt-provider-config-omniroute.test.js` (new, npm `test`) | **Phase 3 real OpenAI-compatible E2E** through the local OmniRoute container using an encrypted user-owned configuration; disable/delete → deterministic system fallback; no-secret checks; SKIPS when unset |
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
- **Persistent conversations (Phase 2):** ownership-scoped `Conversation`+`Message` records; the DB is the source of truth for chat history — page refresh, navigation, focus changes, and reconnects survive. Prior context is replayed to the provider (capped). "Clear chat" hard-deletes the conversation and all its messages on the backend.
- Owns no memory of prior `/ai/ask` questions (the legacy endpoint stays stateless); persistent memory lives in the `/api/ai/conversations` API.

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

## 8. Conversation/History Behavior

- **Phase 2: persistent conversations** are implemented and durable (see §16). Every `/api/ai/ask` remains independent and stateless for backward compatibility.
- Follow-up questions ("and what about food?") get their prior context inside a conversation via `/api/ai/conversations/:id/messages`.

## 9. Security and Authorization Model

- JWT Bearer on both PetGPT endpoints (`protect`). Payload `{ id }` (user ObjectId string), exp `30d` default. `req.user` is a fresh full User doc per request.
- `getPetAdvice` enforces pet ownership (`owner: req.user._id`) → cross-user pet access returns 404 (verified e2e).
- `askPetGPT` scopes the pet-context query to the authenticated user — no cross-tenant leakage of context.
- Gaps (tracked, later phases): no rate limiting / per-user quota; no per-request cost cap beyond length limit; prompt-injection surface mitigated only by prompt + length cap; Gemini key in query string; internal error messages leak on 500s.

## 10. Current Limitations

- Legacy `/api/ai/ask` remains stateless single-turn chat (deliberate; persistent chat lives on `/api/ai/conversations`).
- Thin context (no age/weight/health/vaccination data) — Phase 5.
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

Implementations: A ✅ (Phase 1), B ✅ (Phase 2), provider configuration ✅ (Phase 3). C/D/E-F design, not implemented.

### A. Provider abstraction
- PetGPT must NOT be architecturally tied to Google/Gemini, nor to OmniRoute.
- ✅ **Implemented (Phase 1):** `backend/ai/` provider layer — `provider.js` (contract: `provider.generate({system, question, petContext}) → {text, latencyMs}`; `AiProviderError` + `AI_ERROR_CODES` `config|timeout|http|malformed|unknown`; `register/getProvider/getActiveProvider` registry; `fetchWithTimeout`, `parseJson`, `userPetsText`), `gemini.js` (name `"google"`, default), `openai.js` (name `"openai"`, chat-completions dialect, no SDK), `index.js` (registration + `generatePetGPTResponse()` with normalized logging and `null`-on-failure fallback signal). The controller no longer embeds vendor details.
- Additive providers implement the same contract and `register()` their name; selection stays env-driven via `AI_CONFIG.provider`.
- OpenAI-compatible APIs are the initial compatibility target (chat completions shape). OmniRoute is only one possible provider implementation/configuration, never a hard dependency.
- Users configure their own compatible provider/API key via the Phase 3 provider-configuration API (`/api/ai/providers`).
- Provider-specific details stay isolated behind the provider layer; the controller/policy code never embeds vendor knowledge.

### B. Conversation architecture ✅ implemented (Phase 2)
- Persistent `Conversation` + `Message` models.
- Conversations belong to the authenticated user (`owner: user`).
- Messages belong to a conversation (parent ref), ordered, with `role` and content.
- Pet context is loaded from the authenticated user's own pets, never from client-supplied owners; all conversation reads/writes are scoped `owner: req.user._id`. History is replayed to the provider capped at `AI_CONFIG.maxHistoryMessages`.

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

Ordering rationale: (1) a stable provider interface must exist before anything consumes it (Phase 0→1→2); (2) conversations consume the provider and are prerequisites for good context and tools (2→4); (3) durable generations and rich pet context and tool calling build on persisted conversations so the AI can reference "Max's vaccination history" across turns (4→5→6); (4) safety/limits/observability gate any public/general use and rate the spend (7); (5) streaming is a delivery mechanism layered on durable generations (8); (6) evaluation keeps the product honest against the non-negotiable rules (9). This reorders the earlier draft (which had provider config before conversations) because conversations are required before provider/API-key management can be user-facing.

- **Phase 0 — Foundation & Architecture** ✅ implemented
  Backend-only. Central config/prompt/scope module (`config/ai.js`), product-rules system prompt, question-length limit, outcome logging, scope gate. `/api/ai/ask` contract preserved; Gemini fallback preserved. Later-phase architecture documented (not implemented).
- **Phase 1 — Provider abstraction + OpenAI-compatible provider** ✅ implemented
  Provider layer (`backend/ai/`): chat-completions-shaped `provider.generate(...)` contract, normalized error codes (`config|timeout|http|malformed|unknown`), adapter registry, Google/Gemini adapter (default, preserves `GEMINI_API_KEY`), OpenAI-compatible adapter (no SDK, no vendor hard-coding), service entry with normalized outcome logging and `null`-on-failure fallback. Dead `config/gemini.js` removed; single `AI_CONFIG`. Verified by assert-based `npm test` + e2e.
- **Phase 2 — Persistent conversations/messages** ✅ implemented
  Implement §B: `Conversation`/`Message` models, ownership-scoped CRUD, conversation-aware message flow (new `/api/ai/conversations` API; legacy `/api/ai/ask` untouched), history fetch + provider context reuse with a bounded cap.
- **Phase 3 — Provider/API-key/model configuration** ✅ implemented
  Per-user provider + model + API key configuration (encrypted); owner-scoped CRUD + test API; active-provider resolution honored by the provider layer with system-env fallback. See §17.
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

## 15. Phase 0/1 Implementation Status & Verification

Implementing note: Phase 0 shipped the foundation; Phase 1 ships the provider layer on top of it; Phase 2 ships persistent conversations. See Phase 2 section (§16) after the Phase 0/1 sections below.

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

---

## 16. Phase 2 — Persistent Conversations + Messages + Chat Lifecycle

Status: **✅ implemented & verified** (2026-09-22). Backend-only; no frontend changes; React-migration worktree untouched; no streaming; no tool calling; no provider/API-key management (Phase 3).

### Goal

Chat history is durable on the backend and survives page refresh, navigation, focus changes, reconnects, and server-side AI processing. The MongoDB database is the source of truth for conversation history.

### Conversation/Messages architecture

- `Conversation` (owner) owns many `Message` records; every operation resolves the conversation first via `{ _id, owner: req.user._id }`, then acts on its messages. Cross-user access is impossible through IDs (404, identical to "not found").
- The legacy single-turn `POST /api/ai/ask` is preserved untouched and stateless; persistent chat is a separate API so existing clients and the React migration keep working.

### Database schema decisions (`backend/models/`)

- **Conversation**: `owner` (ObjectId→User, required — never client-supplied), `title` (default `"New conversation"`, auto-derived from the first user message on first exchange), `lastMessageAt` (Date), `lastMessagePreview` (String, first 60 chars of the last assistant message — drives the list UI), `timestamps`. Index `{ owner: 1, lastMessageAt: -1 }`. No `deleted` flag: **hard-delete strategy** (see Clear-chat behavior).
- **Message**: `conversation` (ObjectId→Conversation, required, indexed), `role` (enum `user|assistant|system`, backend-set only), `content` (String, required, trimmed), `timestamps`. Index `{ conversation: 1, createdAt: 1 }`.
- Deliberately omitted (not premature): `status`/`pending|completed|failed` (durable generation records are Phase 4), `provider`/`model`/metadata (Phase 3/4), attachments, pagination keys, soft-delete flags. The enum includes `system` so a future system message fits without a migration, but nothing writes it yet.

### API contracts (all behind `protect`; mounted `/api/ai/conversations`)

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `POST /api/ai/conversations` | `{ title? }` (also serves "start new conversation" — no duplicate endpoint) | `201 { success, conversation: { id, title, lastMessageAt, lastMessagePreview, createdAt, updatedAt } }` | 400 title too long; 401 |
| `GET /api/ai/conversations` | — | `200 { success, conversations: [...] }` sorted by `lastMessageAt` desc | 401 |
| `GET /api/ai/conversations/:conversationId` | — | `200 { success, conversation, messages: [{ id, role, content, createdAt }] }` (chronological) | 400 invalid id; 404 not found/not owned; 401 |
| `POST /api/ai/conversations/:conversationId/messages` | `{ content }` | `200 { success, conversationId, userMessage, assistantMessage }` (both persisted) | 400 empty/oversized; 400 invalid id; 404 not found/not owned; 500 provider/persistence failure (generic message); 401 |
| `DELETE /api/ai/conversations/:conversationId` | — | `200 { success, message: "Conversation cleared." }` | 400 invalid id; 404 not found/not owned; 401 |

Server errors always respond `{ success:false, message:"Something went wrong." }` — internal database/provider errors are never leaked.

### Ownership rules

- `owner` is always taken from `req.user._id`. Client-supplied `owner`/`userId`/`conversationsOwner` fields in bodies are ignored (verified by test).
- Read, append, and delete all return 404 for a foreign or unknown id — no method/status signaling that reveals the existence or ownership of another user's data.
- Pet context for prompts is loaded from `Pet.find({ owner: req.user._id })` only.

### Clear-chat behavior

- `DELETE /api/ai/conversations/:conversationId` is a real backend operation (hard delete): `Message.deleteMany({ conversation })` then `Conversation.deleteOne({ _id, owner })`.
- After clearing: the conversation 404s on get/send, is absent from the list, and **cannot participate in AI context** (history queries and the provider path are conversation-scoped, so a deleted conversation can never produce history or prompts).
- `ponytail:` — sequential deletes, not a Mongo transaction. A mid-sequence failure leaves the conversation plus an unreachable orphan (all reads are conversation-scoped), never a leaked history; wrap in a transaction if multi-document atomicity ever matters (Phase 4).

### Context/history handling

- Prior `user`/`assistant` messages are replayed to the provider between the system message and the current user turn (`{role}` mapped to `model` on the Gemini adapter), oldest-first.
- **Cap: `PETGPT_MAX_HISTORY_MESSAGES` (default 20)** prior messages per exchange. Worst case ≈ 20 × `PETGPT_MAX_QUESTION_LENGTH` (2000) chars ≈ 40k chars. Bound chosen so the default context window is never exceeded by an ordinary conversation; raise it by env when a model's window allows. The provider layer treats `history` as optional, so single-turn providers remain valid.
- The system prompt (product rules) is always first — **history can never override PetGPT's product rules**. The scope gate still short-circuits the provider regardless of history.
- The database retains full history (source of truth); only the provider *context* is truncated.

### PetGPT request flow

```text
Authenticated user
      ↓
Conversation (ownership-checked)
      ↓
Persist user message
      ↓
Load permitted conversation context (capped) + user's own pet context
      ↓
PetGPT provider layer (generatePetGPTResponse) — scope gate first, no provider call when out of scope
      ↓
Persist assistant message (provider text, or Phase 1 fallback when the provider failed)
      ↓
Return persisted result
```

The persisted assistant message is the source of truth; nothing relies on the HTTP request remaining alive.

### Error handling covered

unauthenticated (401), invalid conversation id (400), conversation not found (404), conversation belongs to another user (404), invalid/empty message (400), oversized message (400), provider failure (normalized → fallback answer, still 200, no fabricated success), persistence failure (500 generic). Internal messages never leak.

### Testing strategy

`npm test` chains four assert-based suites (no framework, no external API keys required):

1. `test/ai-provider.test.js` (Phase 1, unchanged) — 17 checks.
2. `test/conversation-api.test.js` (Phase 2, real local Mongo + real HTTP) — 15 checks: auth gate; create (default/custom title); client-supplied owner ignored; list scoped per user; empty retrieval; invalid-id 400 / unknown 404 / foreign read-append-delete 404 (and the target untouched); empty/oversized/missing content → 400; send+persist user/assistant with server-set roles; retrieval + ordering (user/assistant/user/assistant) + title/metadata updates; ownership isolation on retrieval; title auto-derived from first message; scope-gate exchange persisted (no provider call); clear-chat hard-delete + cannot-be-reused; legacy `/api/ai/ask` unchanged; no JWT/secret material in persisted messages.
3. `test/petgpt-provider-conversation.test.js` (Phase 2, mock OpenAI-compatible HTTP server) — 5 checks: persist→provider→persist; history reused in order + roles; provider 500 → fallback persisted, no fake success; history capped at `PETGPT_MAX_HISTORY_MESSAGES`; full history durable from DB.
4. `test/petgpt-omniroute.test.js` (Phase 2, real OpenAI-compatible E2E) — 5 checks against the local OmniRoute container; **skips** (exit 0) when `PETGPT_OPENAI_API_KEY` is unset or the container is unreachable.

### OmniRoute local testing setup/verification

- OmniRoute runs as the Docker container `catlium-omniroute` (`diegosouzapw/omniroute:latest`), exposed on `127.0.0.1:20128`. Start it with `docker start catlium-omniroute`.
- An API key is created in the OmniRoute dashboard/API (e.g. `POST /api/keys {"name":"..."}` after log-in) and passed to the test via env — the key is **never hard-coded** in the application or the repo.
- Verify the path: `PETGPT_OPENAI_BASE_URL=http://localhost:20128/v1 PETGPT_OPENAI_API_KEY=<key> PETGPT_OPENAI_MODEL=auto/best-fast node test/petgpt-omniroute.test.js`.
- The application itself points at OmniRoute purely through `PETGPT_OPENAI_*` env (Phase 1 provider config); OmniRoute is a test/lab target, not a code dependency.
- Verified 2026-09-22: real provider exchange + follow-up with history persisted, scope gate still enforced in the conversation flow, and the API key absent from persisted messages and all captured logs.

### Phase 2 verification (2026-09-22, real local Mongo + local OmniRoute)

- `node --check` on all touched backend files → pass.
- `npm test` (default env, no key): 17 Phase-1 + 15 API + 5 provider-path checks pass; OmniRoute suite skips cleanly.
- OmniRoute E2E: 5/5 pass against the live container (real model `codestral-2508` backing `auto/best-fast`).
- Ownership isolation, clear-chat determinism, scope gate, fallback behaviour, and backward-compat `/api/ai/ask` all re-verified end-to-end.
- No API keys/secrets in logs or persisted messages (asserted by the suites).
- No frontend file changes; no React-migration worktree/file changes.

Commit: see Phase 2 commit on `feature/petgpt-enhancement`.

---

## 17. Phase 3 — Provider / API-Key / Model Configuration

Status: **✅ implemented & verified** (2026-09-22). Backend-only; no frontend changes; React-migration worktree untouched; no streaming; no tool calling; no durable background generation (Phase 4).

### Goal

Make PetGPT provider configuration explicit and extensible:

```text
Gemini
OpenAI-compatible provider
      └── OmniRoute can be one configuration
      └── Any compatible provider can be another configuration
```

Provider-specific implementation stays inside the Phase 1 provider layer (`backend/ai/`). OmniRoute appears only through environment configuration at test time (`PETGPT_OPENAI_BASE_URL=…`, `PETGPT_OPENAI_API_KEY=…`, `PETGPT_OPENAI_MODEL=…`) — never hard-coded, no SDK, no OmniRoute-specific logic.

### Provider configuration architecture

- **`backend/models/AiProvider.js`** — one doc per user-owned provider configuration. Fields (nothing extra): `owner` (ObjectId→User, required, never client-supplied), `provider` (registry key: `google` / `openai`), `name` (display name, defaults to provider type), `baseUrl` (endpoint root, OpenAI-compatible only), `model`, `apiKeyEnc` (AES-256-GCM ciphertext — **never plaintext**), `enabled`, `active`, `timestamps`. Index `{ owner: 1, active: 1 }`.
- **`backend/utils/cipher.js`** — `encryptSecret`/`decryptSecret`: AES-256-GCM; the 32-byte key is `sha256(PETGPT_ENCRYPTION_KEY)`; stored shape `iv:authTag:ciphertext` (base64). Fails closed: no env key → encrypt/decrypt throw before any plaintext is written or returned.
- The **provider registry stays generic**: `getProviderNames()` returns the registered adapter names, so any adapter that `register()`s itself becomes a valid configuration type automatically. The CRUD layer validates against the registry rather than a hard-coded list.
- **`backend/ai/index.js`** — new Phase-3 surface:
  - `resolveActiveProviderConfig(userId)` → the user's `{owner, active:true, enabled:true}` config (lean, key still encrypted) or `null`.
  - `buildProviderRequest(configDoc)` → `{ adapter, config: { apiKey, model, baseUrl? } }`, decrypting the stored key **here and only here**, immediately before a real provider request.
  - `generatePetGPTResponse(question, petContext, history, providerConfig)` — optional 4th arg; when absent the legacy system-env behavior is unchanged; when present the named adapter runs with the decrypted stored credentials.
- Adapters (`gemini.js`, `openai.js`) accept an optional `config` object that overrides the env snapshot; ignoring it is not an option for OpenAI-compatible providers that need a user-supplied base URL/model/key.

### Ownership / scope rules

- Every provider-config operation resolves the document via `{ _id, owner: req.user._id }`. Foreign or unknown ids → 404 (identical to "not found", no existence leak).
- A user can never read, modify, delete, test/use, or select another user's provider configuration or API key. Client-supplied `owner` fields in bodies are ignored (the doc always belongs to `req.user._id`).
- Provider resolution is strictly owner-scoped: `resolveActiveProviderConfig(req.user._id)` — no cross-user fallback, ever.
- "Do not silently fall back to another user's provider": there is no code path that can reference another user's provider. Either the authenticated user's active provider is used, or the system-level env configuration is.

### Encryption strategy

- Stored API keys are encrypted at the application layer with AES-256-GCM using a server-side secret: **`PETGPT_ENCRYPTION_KEY`** (any string; a SHA-256 of it derives the 32-byte key). Required environment variable, documented in `backend/.env.example`.
- Never hard-coded; never in git. `backend/.gitignore` already excludes `.env`.
- Decryption happens only inside `buildProviderRequest`, immediately before an actual provider request (conversation flow or the `/test` endpoint).
- Security invariants (asserted by tests):
  - stored value is ciphertext, never plaintext;
  - plaintext never appears in API responses, logs, error messages, persisted chat messages, or database queries;
  - missing/wrong encryption configuration fails safely (create → 500 without storing anything; request-time decrypt failure → normalized fallback, no fabricated success, no crash);
  - the `/test` endpoint decrypts for the request only and never returns the secret.
- Decision note: application-level AES-256-GCM with an env-derived key was chosen because it is the documented Phase-3 requirement and introduces no new dependency (Node `crypto`). If this instance ever needs key rotation/HSM/KMS, swap `utils/cipher.js` internals only — the provider layer and storage format are sealed by that one module.

### API contracts (all behind `protect`; mounted `/api/ai/providers`)

| Method + path | Request | Success | Errors |
|---|---|---|---|
| `GET /api/ai/providers` | — | `200 { success, providers: [{ id, provider, name, baseUrl, model, enabled, active, configured, createdAt, updatedAt }] }` | 401 |
| `POST /api/ai/providers` | `{ provider, name?, baseUrl?, model, apiKey, enabled?, active? }` | `201 { success, provider: <safe> }` | 400 validation; 500 encrypt/storage failure (generic); 401 |
| `PATCH /api/ai/providers/:id` | partial `{ provider?, name?, baseUrl?, model?, apiKey?, enabled?, active? }` | `200 { success, provider: <safe> }` | 400 invalid id / validation; 404 not found/not owned; 500 (generic); 401 |
| `DELETE /api/ai/providers/:id` | — | `200 { success, message }` | 400 invalid id; 404 not found/not owned; 401 |
| `POST /api/ai/providers/:id/test` | — | `200 { success, ok: true, provider, model, latencyMs }` or `200 { success, ok: false, provider, error: { code, status? } }` | 400 invalid id; 404 not found/not owned; 401 |

Validation: provider type must be registered (unsupported → 400); `model` required; `baseUrl` required for `openai` and must be a valid `http(s)` URL (trailing slash normalized away); `apiKey` required on create and must be non-empty on update; unknown provider types rejected; nothing obviously invalid is stored. No external provider call on CRUD — only `/test` does that.

Safe response mask `configured: boolean` (true when a key is stored). Responses **never** expose the API key, ciphertext, encryption key, or auth headers.

Active selection: `PATCH { active: true }` (or create) designates the active provider and deactivates the owner's other configurations (database-verified single-active invariant). The first configuration created for an owner auto-activates.

### Active-provider resolution / precedence

```text
authenticated user
      ↓
active provider configuration (owner-scoped: { owner: userId, active: true, enabled: true })
      ↓
provider registry (adapter registered under config.provider)
      ↓
Gemini / OpenAI-compatible adapter (decrypted stored credentials)
```

1. If the authenticated user has an **enabled, active** provider configuration → that adapter + the decrypted stored credentials are used for the exchange.
2. Otherwise (none configured, disabled, deleted) → the **system-level environment configuration** (`AI_CONFIG`, `PETGPT_PROVIDER` + `GEMINI_API_KEY`/`PETGPT_OPENAI_*`) is used, preserving Phase 0/1 behavior.
3. There is no cross-user fallback step. The resolution is deterministic (single active doc per owner; system env as the base case).

Legacy `POST /api/ai/ask` **never** resolves user provider configurations — it has no conversation/user-provider context and keeps its existing system-config behavior (verified by test with a stored active provider present).

### PetGPT integration

The persistent-conversation flow (Phase 2) now resolves the provider configuration after the scope gate:

```text
auth
 ↓
conversation ownership
 ↓
persist user message
 ↓
load bounded history + pet context
 ↓
scope gate
 ↓
resolve provider configuration (owner-scoped)   ← Phase 3
 ↓
provider adapter (decrypt stored key at call time)
 ↓
persist assistant response
```

Provider credentials never live on `Conversation`/`Message` documents. Provider failure still falls back to canned answers (persisted as-is, no fabricated success). `clear/delete` behavior and the scope gate are unchanged.

### OmniRoute testing setup

Same local container as Phase 2 (`catlium-omniroute`, `127.0.0.1:20128`). Phase 3 store an encrypted provider configuration pointing at it (`name`, `baseUrl`, `model`, `apiKey` sourced from env) and verify:

- the configured (encrypted-key) provider produces a real reply that is persisted;
- follow-up conversations reuse history through the configured provider;
- disabling and then deleting the configured provider deterministically falls back to the system configuration (google-without-key → canned answer);
- the API key is absent from persisted messages, provider docs, and all captured logs.

Reachability check: `POST /api/ai/providers/:id/test` against the stored config or the OmniRoute suite; both skip cleanly when `PETGPT_OPENAI_API_KEY` is unset or the container is down. Verify path with `PETGPT_OPENAI_BASE_URL=http://localhost:20128/v1 PETGPT_OPENAI_API_KEY=<key> PETGPT_OPENAI_MODEL=auto/best-fast npm test`.

### Phase 3 verification (2026-09-22, real local Mongo + local OmniRoute)

- `node --check` on all touched backend files → pass.
- `npm test` (default env, no key): **17 + 15 + 5 + 19 checks pass**, the two OmniRoute suites skip cleanly.
- With `PETGPT_OPENAI_API_KEY` set: **Phase-2 OmniRoute E2E 5/5** and **Phase-3 configured-provider OmniRoute E2E 6/6** pass against the live container — total **67 checks**.
- Encryption: round-trip AES-256-GCM, stored value is ciphertext (not plaintext), wrong key and missing key both fail safely at the util level and at request time; plaintext never appears in responses, logs, error messages, or persisted messages (asserted).
- Ownership isolation: cross-user read/update/delete/test all 404; list never exposes another user's provider; resolution never crosses owners.
- Active-provider selection determinism verified (single active per owner; auto-active first config; PATCH deactivates siblings).
- Disabled/deleted provider → system env fallback verified in both the mock and real OmniRoute suites.
- Legacy `/api/ai/ask` intact (system-config behavior preserved with a stored active provider present).
- No plaintext API keys persisted anywhere (Mongo docs checked) and none in logs or API responses (asserted by the suites).
- No frontend file changes; no React-migration worktree/file changes.

Commit: see Phase 3 commit on `feature/petgpt-enhancement`.