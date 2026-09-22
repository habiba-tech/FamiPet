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
- PetGPT is a controller pair (`ai.controller.js` + `conversation.controller.js`) behind the `/api/ai` router, a central config module (`backend/config/ai.js`), a provider layer (`backend/ai/`) with a Google/Gemini adapter and an OpenAI-compatible adapter, persistent `Conversation`/`Message` models (Phase 2), a durable `GenerationJob` + in-process worker (Phase 4), and (Phase 5) a pet-aware context builder + a registered/schema-validated/ownership-scoped read-tool layer with a bounded calling loop. No SSE/streaming yet.

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

> **Phase 4/5 override:** in-scope `POST .../messages` now returns `202` + a durable `GenerationJob` (§18) that the worker runs. The worker reuses this same pet-context + history pipeline and, when the active provider is tool-capable, dispatches through the bounded tool-calling loop (§19) instead of `generatePetGPTResponse`. Legacy `/api/ai/ask` still uses the sync `generatePetGPTResponse` path unchanged.

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
| `backend/ai/pet-context.js` | **Phase 5** — pet-aware context service: owner-scoped normalization (no secrets, no Mongo dumps), `requireOwnedPet` ownership gate (foreign/invalid ids → null, no existence leak), `loadPetContext` (thin legacy prompt context, bounded at `AI_CONFIG.tools.maxContextPets`), `buildPetContext` (rich per-pet records bounded per type at `AI_CONFIG.tools.maxResults`) |
| `backend/ai/context.js` | **Phase 5** — `buildProviderMessages` (mirrors the OpenAI user-turn assembly: pet context + `"User asks: "` + question) for the worker tool path; `buildConversationContext`/`updateConversationMetadata` (Phase 2 metadata shared with the worker); `publicMessage` exposure of bounded `toolCalls` |
| `backend/ai/tools/` | **Phase 5** — tool layer: `registry.js` (explicit `registerTool` + declaration/schema validation, typed `ToolError`, `TOOL_ERRORS`), `read-tools.js` (registers the 6 read tools: `get_my_pets`, `get_my_pet`, `get_health_records`, `get_vaccinations`, `get_reminders`, `search_veterinarians`), `index.js` (`listToolDeclarations`, `executeTool`) |
| `backend/ai/tool-calling.js` | **Phase 5** — bounded tool-calling loop (`runToolCallingLoop({ adapter, config, messages, userId })`): owns message assembly, appends assistant `tool_calls` + `role:"tool"` result messages per round, caps rounds at `AI_CONFIG.tools.maxIterations`, returns `{ok, text, toolLog}` and `{ok:false, reason:`max_iterations`|`error`|`no_tools`}`; `canUseTools(provider)` via capability declaration; `TOOL_CALLS_METADATA_MAX` (20) bounds persisted tool metadata |
| `backend/jobs/generation.worker.js` | **Phase 4/5** — durable worker; tool-calling providers take the tool path via `runToolCallingLoop`, other providers fall back to legacy `generatePetGPTResponse`; tool-round provider failure fails the job safely (`SAFE_ERRORS.PROVIDER`, no fabricated answer); `toolCalls: result.toolLog` persisted on the assistant message |
| `backend/ai/index.js` | **Phase 5** — `require("./tools")` registers the read tools with the AI layer as a side effect (this registration was the integration fix that made the worker's tool path actually dispatch) |
| `backend/test/petgpt-tools.test.js` (new, npm `test`) | **Phase 5 assert-based checks** over real local Mongo + a mock OpenAI-compatible provider: registry/declarations, `get_my_pets` normalization + no-secrets, unknown tool, argument validation, ownership isolation (foreign pet error indistinguishable from nonexistent), capability gates (google stays off the tool path), bounded iterations, bounded metadata (25 calls → 20 recorded), per-tool failure model-safety, provider failure mid-round abort |
| `backend/test/petgpt-jobs-tools.test.js` (new, npm `test`) | **Phase 5 durable-worker checks** over real local Mongo + a mode-switchable mock provider on :4115: tool path (worker → tool execution → final answer, 2 provider calls), persisted assistant `toolCalls`, tool result fed back to the model, tool failure completes the job with `ok:false` + error, always-tools provider bounded then failed, HTTP 500 aborts without a fake assistant, ownership isolation, idempotency, no secrets in jobs/messages/docs/logs |
| `backend/test/petgpt-tools-omniroute.test.js` (new, npm `test`) | **Phase 5 real OpenAI-compatible E2E** through the live `catlium-omniroute` container: the model actually calls `get_my_pets`, the worker executes it and the final reply names **Rex and not Max** (no foreign-pet leak), bounded tool metadata, legacy `/ask` intact, no secrets in logs/DB; retried probe, SKIPS honestly when unreachable |
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

**Phase 5: read-only tool calling implemented.** Tools are explicitly registered in `backend/ai/tools/` (never invented by the model — product rule 5), strictly schema-validated, ownership-scoped per call, and only dispatched by providers that declare tool-calling capability (`canUseTools`). The calling loop (`backend/ai/tool-calling.js`) is bounded at `AI_CONFIG.tools.maxIterations` rounds and never fabricates a final answer. Only read tools exist; **mutation tools are deliberately deferred to Phase 6** (see `petGPT.md` §19 and the `ponytail:` comment in `read-tools.js`). The only non-AI "tool" remains the hard-coded `fallbackAnswer` keyword matcher.

## 6. Data/Context Available to the AI

**Phase 5 (rich pet context, enabled for OpenAI-compatible tool-calling providers):** per ask, the backend injects the authenticated user's own pet records — pet `name`, `species`, `breed.name`, plus `age`, `weight`, `gender`, `vaccinated`, `description` (bounded: max 5 pets, max 3 records each by type). Health records, vaccinations, reminders, and vets are served on demand by the read tools §5 rather than pre-injected — the model stays honest about what it knows.

Pre-Phase-5 (legacy) path sent only `name`, `species`, `breed.name` for up to 5 owned pets.

Available in the DB but **not** used by the AI:
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
- Rich pet context + read-tool calling are **only** exercised when the active provider declares tool-calling capability (OpenAI-compatible completions that advertise `tool_calling`); Gemini (`google`) currently stays on the legacy chat path without tools.
- No mutation tools (Phase 6); the AI can read pet data but cannot change anything.
- Tool-call metadata persisted on assistant messages is bounded (`TOOL_CALLS_METADATA_MAX` = 20) and the loop caps at `AI_CONFIG.tools.maxIterations` rounds — a chatty provider degrades to a safe stop, not an unbounded loop.
- No streaming, no retry/backoff, no structured output.
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

Implementations: A ✅ (Phase 1), B ✅ (Phase 2), provider configuration ✅ (Phase 3), C ✅ (Phase 4), D ✅ (Phase 5), E ✅ (Phase 5). F design, not implemented.

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

### C. Durable generation architecture (design → implement as Phase 4) ✅ implemented (see §18)
- An accepted AI request must be able to continue even if the browser refreshes, changes page, or loses focus.
- The persisted backend result becomes the source of truth; the frontend reads it back/replays it.
- A generation record (request, status: queued/running/done/failed, result, timestamps) owned by the user.
- Streaming/reconnection is a later delivery mechanism (Phase 8), not a requirement for durability.

### D. Tool architecture ✅ implemented (Phase 5, see §19)
- Tools must be:
  - explicitly registered (not discoverable/invented by the model) — `registerTool` in `backend/ai/tools/registry.js`;
  - strictly schema-validated (arguments) — JSON-schema-like `<arg>.type`/`required`/`enum` checks, unknown args rejected;
  - authenticated-user ownership enforced on every record access — each tool resolves records as `owner: req.user._id`; foreign pets are indistinguishable from nonexistent ones (no existence oracle);
  - only exposed for actually implemented FamiPet capabilities — read-only today (Phase 5); mutation tools are Phase 6;
  - never invented by the model — the backend sends explicit function declarations; any other call is rejected as an unknown tool;
  - returning structured results — normalized results, numbers/names/IDs only, no secrets;
  - auditable (logged invocations) — every execution is logged with name/ok/error and persisted (bounded) as `Message.toolCalls`.
- Backend decides which tools exist and are available; the model only calls what the backend offers (product rule 5).
- Capability-gated: tools are only offered to providers that declare `tool_calling` support (`canUseTools`); chat-only providers keep the legacy path.

### E. Provider capabilities ✅ implemented (Phase 5)
- Providers/models differ in capability: chat, streaming, tool calling, structured output, vision, context length, cost.
- Never assume a provider supports every capability; capability detection/declaration lives in the provider layer and is checked before a request relies on it — `supportsToolCalling`, surfaced as `canUseTools` and used by the worker to pick the tool path vs the legacy chat path.

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
- **Phase 4 — Durable AI generations + recovery** ✅ implemented (see §18)
  Implement §C: generation records with status transition, persisted result as source of truth, replay/recovery path, cleanup/retention.
- **Phase 5 — Rich pet context + read-only tool calling** ✅ implemented (see §19)
  Expand context (pet age/weight/gender/vaccinated/description, bounded per-type) and implement §D read tools: registered, schema-validated, ownership-scoped read tools (pet records, health records, vaccinations, reminders, vets by city) with a bounded calling loop, capability gating, and a durable-worker integration. Phases 5+6 merged: read-only here; mutation tools stay deferred (see below).
- **Phase 6 — Mutation tool calling**
  Implement §D mutation tools the model can invoke on FamiPet data (e.g. schedule/create reminders, record medication). Read-only tools from Phase 5 are the safety floor; mutation requires explicit design of side effects, idempotency, and confirmation UX (product rule 5).
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
| `POST /api/ai/conversations/:conversationId/messages` | `{ content, idempotencyKey? }` | In-scope: `202 { success, conversationId, userMessage, job }` (job queued). Out-of-scope: `200 { success, conversationId, userMessage, assistantMessage }` (canned answer persisted, no job). See §18 for Phase 4. Both messages persisted in-scope; no `jobId` field. | 400 empty/oversized/idempotencyKey; 400 invalid id; 404 not found/not owned; 409 idempotency conflict; 401 |
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
Scope gate (out of scope → persist user message + canned assistant answer, 200, no job)
      ↓
Persist user message
      ↓
Create GenerationJob (queued) — async acceptance, 202
      ↓
Worker poller claims & runs the job (loads bounded history + own pet context)
      ↓
Provider resolves (owner's active config, or system env) → persist assistant message on success
      ↓
Job → completed (assistantMessageId) | failed (provider error, no fake answer) | retried (bounded)
```

The persisted job and assistant message are the source of truth; nothing relies on the HTTP request remaining alive. The client polls `GET /api/ai/jobs/:id` for the result.

### Error handling covered

unauthorized (401), invalid conversation id (400), conversation not found (404), conversation belongs to another user (404), invalid/empty message (400), oversized message (400), invalid idempotencyKey (400), idempotency conflict (409), foreign/unknown job id (404), invalid job id (400), provider failure (job → `failed` with normalized code, no fake assistant message), persistence failure (job → `failed`). Internal messages never leak.

### Testing strategy

`npm test` chains eight assert-based suites (no framework, no external API keys required):

1. `test/ai-provider.test.js` (Phase 1, unchanged) — 17 checks.
2. `test/conversation-api.test.js` (Phase 2, real local Mongo + real HTTP, adapted for Phase 4) — 15 checks: auth gate; create (default/custom title); client-supplied owner ignored; list scoped per user; empty retrieval; invalid-id 400 / unknown 404 / foreign read-append-delete 404 (and the target untouched); empty/oversized/missing content → 400; in-scope send → 202 + job `failed` (no assistant); out-of-scope send → 200 canned answer persisted; retrieval + ordering + title/metadata updates; ownership isolation; title auto-derived; scope-gate exchange persisted (no provider call); clear-chat hard-delete of messages+jobs; legacy `/api/ai/ask` unchanged; no JWT/secret material in persisted messages.
3. `test/petgpt-provider-conversation.test.js` (Phase 2, mock OpenAI-compatible HTTP server, adapted) — 5 checks: persist→provider→persist; history reused in order + roles; provider 500 → job fails (no fake success); history capped at `PETGPT_MAX_HISTORY_MESSAGES`; full history durable from DB.
4. `test/petgpt-omniroute.test.js` (Phase 2, real OpenAI-compatible E2E) — 5 checks against the local OmniRoute container; **skips** (exit 0) when `PETGPT_OPENAI_API_KEY` is unset or the container is unreachable.
5. `test/petgpt-jobs.test.js` (Phase 4, real local Mongo + real HTTP + mock OpenAI server) — job lifecycle end-to-end (see §18).
6. `test/petgpt-jobs-omniroute.test.js` (Phase 4, real OmniRoute) — durable generation through the env path with the real container; **skips** like the Phase-2 OmniRoute suite.
7. `test/provider-config.test.js` and 8. `test/petgpt-provider-config-omniroute.test.js` (Phase 3, adapted for Phase 4) — see §17.

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

Provider credentials never live on `Conversation`/`Message` documents. Provider failure in the persistent flow (Phase 4) fails the job (`failed`, code `provider`) with no fabricated answer; only the legacy `/api/ai/ask` still falls back to canned answers. `clear/delete` behavior: `DELETE .../conversations/:id` also removes the conversation's jobs. The scope gate is unchanged.

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

---

## 18. Phase 4 — Durable AI Generation + Background Jobs

Status: **✅ implemented & verified** (2026-09-22). Backend-only; no frontend changes; React-migration worktree untouched; no streaming; no tool calling; no Phase 5.

### Goal

In-scope AI generation outlives the HTTP request. The request is accepted with `202 Accepted` and a persisted `GenerationJob`; an in-process poller worker runs it in the background; the client polls the job status API for the durable result. A refresh/navigation loses nothing.

### Job model (`backend/models/GenerationJob.js`)

`owner` (ObjectId→User, required, indexed), `conversation` (ObjectId), `userMessageId` (ObjectId), `assistantMessageId` (ObjectId, set on completion), `status` (`queued|processing|completed|failed`), `provider` (label: `"env"` or stored config name), `model`, `attemptCount`, `error` (`{ code, message }`, failed only), `idempotencyKey` (optional String), `timestamps` plus explicit `startedAt`/`completedAt`/`failedAt`.

Indexes: `{ owner, idempotencyKey }` **unique partial** (only docs where `idempotencyKey` exists) — idempotency scope = `(owner, key)`; `{ status, provider, createdAt }` for FIFO claim; `{ conversation }`. After `dropDatabase()` in tests the partial index must be rebuilt via `GenerationJob.init()`.

### Job lifecycle / state machine

```text
                  ┌────────────────────────────────────────────┐
        create    │   queued ──claim──▶ processing ──ok──▶ completed
 POST /messages ──▶  (attemptCount 0)         │                 │
                  │                          fail (retryable)     │
                  │                           ↕ bounded retries   │
                  └──────────────────────────────────────────────┘
                                              └────fail (terminal)▶ failed
```

- **queued** — created with the user message's newest turn inside, based on fresh (pre-create) messages so context replays correctly.
- **processing** — claimed atomically (see Worker).
- **completed** — assistant message persisted with the provider text; `assistantMessageId` set; `completedAt` stamped. Idempotent key+owner now yield the completed job → reuse.
- **failed** — `error: { code, message: "AI generation failed. Please try again." }`, `failedAt` stamped. No fake/fallback assistant message. Conflict/reuse keys return the failed job. Retryable codes are `config|timeout|http|unknown|malformed`; non-retryable (`invalid_request`) fails immediately at any attempt. `PETGPT_MAX_JOB_ATTEMPTS` (default 3) bounds retries; `attemptCount` increments each claim.

### Worker (`backend/jobs/generation.worker.js`, in-process poller)

- Single poller per process; **busy guard** (one job at a time) prevents overlapping claims while the poll is running and while a job is executing. Poll interval `PETGPT_WORKER_POLL_MS` (default 250).
- **Atomic claim**: `findOneAndUpdate({ status: "queued", ...at-most-PETGPT_MAX_JOB_ATTEMPTS }, { $set: { status: "processing", startedAt }, $inc: { attemptCount: 1 } })` sorted `createdAt` asc (FIFO). Survives restarts (orphaned `processing` jobs are re-enqueued by `reapStale`, default `PETGPT_WORKER_STALE_MS` = 60_000).
- **runJob** pipeline: load latest user turn + bounded history (`PETGPT_MAX_HISTORY_MESSAGES`) + owner's own pet context → resolve provider (owner's active config or system env) → `generatePetGPTResponse` → persist assistant `Message` → mark completed. On error: classify, increment attempts, re-enqueue or fail, using `$inc` + findOneAndUpdate guards so failures during provider latency race safely.
- Lifecycle hooks: `startWorker()` / `stopWorker()`; `server.js` starts the worker after DB connect, stops on shutdown. Tests start/stop their own in-process worker.
- `ponytail:` single-process in-process poller — a single instance must process claims (second instance would double-run; `reapStale` would still converge via atomic claims). Upgrade path: distributed claim via Mongo TTL/Tornado-style lease or a queue broker when multiple app instances ship (Phase 7).
- Config (`backend/config/ai.js`, frozen at require time — set env before requiring): `PETGPT_WORKER_POLL_MS`, `PETGPT_WORKER_STALE_MS`, `PETGPT_MAX_JOB_ATTEMPTS`, `PETGPT_MAX_HISTORY_MESSAGES`.

### API changes

| Method + path | Body | Success | Errors |
|---|---|---|---|
| `POST /api/ai/conversations/:conversationId/messages` | `{ content, idempotencyKey? }` | In-scope: `202 { success, conversationId, userMessage, job }` (job ) — no `assistantMessage`, no `jobId` field | 400 empty/oversized/invalid key; 400/404 conversation; 409 conflict; 401 |
| `GET /api/ai/jobs/:jobId` (`protect`) | — | `200 { success, job }` | 400 "Invalid job ID."; 404 foreign/unknown; 401 |
| `DELETE /api/ai/conversations/:conversationId` | — | also `GenerationJob.deleteMany({ conversation })` | unchanged |

`publicJob(job)` shape: `{ id, status, provider, model, attemptCount, conversationId, userMessageId, assistantMessageId, error, createdAt, updatedAt, startedAt, completedAt, failedAt }`.

Out-of-scope content stays synchronous `200` (canned scope answer persisted + metadata update, no job). Legacy `/api/ai/ask` untouched.

### Idempotency

- Same `owner + idempotencyKey + conversation` → `200` with the existing job (any status, incl. `failed`); no duplicate message, no duplicate job, no provider call.
- Same `owner + key` with a **different** conversation → `409`.
- Key optional, max 200 chars, scoped per owner (cross-user same string is fine).
- Race: two concurrent creates with the same key → one wins, the loser's `E11000` triggers delete of its orphan user message and a response pointing at the winner's job. Tests must `GenerationJob.init()` after `dropDatabase()` to rebuild the partial index (else no E11000 involved).

### Durability & recovery

- Persisted `GenerationJob` + `Message` are the source of truth; the HTTP response is only an acceptance receipt.
- Status transitions are monotonic writes with status-conditional (`strict` findOneAndUpdate) guards — no lost updates between request and worker.
- `clearConversation` hard-deletes messages + jobs together; a deleted conversation can never be re-processed.
- No TTL/retention (`ponytail:` deliberate — jobs accumulate; add a TTL on `updatedAt` when job growth matters, likely Phase 7).

### Verification (2026-09-22)

- `node --check` all touched files → pass.
- Local suites (mock OpenAI on :4105, OWN DBs, no keys): **`petgpt-jobs.test.js` 11 jobs / 7 provider calls** (lifecycle 202→queued/processing→completed; durability across refresh; history + pet-context follow-up; provider failure → `failed`, no fake assistant; idempotency incl. parallel race — exactly one job+message; conflict 409; cross-user reuse; failed-job reuse; concurrency atomic claim; stale + bounded retries; ownership isolation 404; no secrets in logs/docs) + adapted **conversation-api 15**, **petgpt-provider-conversation 5**, **provider-config 19** all pass.
- OmniRoute E2E (real container `catlium-omniroute`, dummy key, env path): **petgpt-omniroute 5/5**, **petgpt-provider-config-omniroute 6/6**, **petgpt-jobs-omniroute** durable completion (queued→…→completed, reply persisted) all pass. Suites skip cleanly (exit 0) when the key is unset.
- Full `npm test` chain exit 0 (no key) and exit 0 with the OmniRoute key.
- No frontend file changes; no React-migration worktree/file changes.

Commit: see Phase 4 commit on `feature/petgpt-enhancement`.

## 19. Phase 5 — Pet-Aware Context + Backend Tool Calling

Status: **✅ implemented & verified** (2026-09-22). Backend-only; no frontend changes; React-migration worktree untouched; no streaming; no mutation tools (Phase 6); legacy `/api/ai/ask` unchanged.

### Goal

Give the AI an honest, bounded view of the authenticated user's own pet data — partially injected as rich context, partially served on demand — via **registered, schema-validated, ownership-scoped read tools** executed by the backend in a **bounded calling loop** (product rule 5: the backend decides what tools exist, the model only calls what is offered). Tool calling is wired into the durable worker only, so legacy sync `/ask` is untouched.

### Phase 5 merges the original roadmap's Phase 5 ("Rich pet context") and Phase 6 ("Tool/function calling")

Read tools are the safety floor; mutation tools (create/update FamiPet records) are deliberately deferred to the new **Phase 6** and will need side-effect/idempotency/confirmation design.

### Pet-aware context (`backend/ai/pet-context.js`)

- Every lookup is owner-scoped through `userId` — pet IDs supplied by the model are **untrusted input**, re-checked by `requireOwnedPet` (`Pet.findOne({ _id, owner: userId })`); invalid/foreign/unknown IDs all normalize to `null` (no existence oracle).
- Normalized shapes only (no Mongo dumps, no secrets): pet `id/name/species/breed/gender/age/weight/color/vaccinated/status/description`; health records `diagnosis/treatment/doctor/hospital/visitDate/nextVisit/notes`; vaccinations `vaccineName/doseNumber/vaccinationDate/nextDueDate/veterinarian/hospital/status/notes`; appointments (vet name/clinic/specialization only, no fees/payment); reminders `title/type/description/date/time/frequency/isActive/isCompleted`.
- `loadPetContext` (≤ `AI_CONFIG.tools.maxContextPets`) keeps the thin legacy prompt injection; `buildPetContext` adds bounded per pet records (`AI_CONFIG.tools.maxResults` per category), feeding the tool-calling flow and available to chat-only providers.

### Tool layer (`backend/ai/tools/`)

- `registry.js`: `registerTool({ name, description, args, run })` — throws `ToolError` (typed, exported `TOOL_ERRORS`) on duplicate names, invalid declarations (missing name/description/run, non-object args), or unknown/duplicate args; duplicate registration is idempotent-safe.
- `read-tools.js`: registers the 6 read tools — `get_my_pets` (own normalized pets), `get_my_pet` (one owned pet by id + its records), `get_health_records`, `get_vaccinations`, `get_reminders` (per pet, ownership-re-checked), `search_veterinarians` (public name/clinic/specialization/city/address only, no contact/fee). Unknown tools → typed error.
- `index.js`: `listToolDeclarations()` (OpenAI function shapes sent to the provider), `executeTool({ name, args, userId })`.
- `ponytail:` read-only by design (mutation tools are Phase 6); results bounded; ownership gate per call.

### Bounded calling loop (`backend/ai/tool-calling.js`)

`runToolCallingLoop({ adapter, config, messages, userId })` owns **all** message assembly:

1. Call `adapter.complete(messages, { functions, ... })` (only when `canUseTools(provider)`).
2. If the reply contains `tool_calls`, execute each (`executeTool`) → append the assistant `tool_calls` message **plus** a `role:"tool"` message per result → next round.
3. Stop when a round returns plain text (≤ `maxIterations` rounds), returns `{ ok:true, text, toolLog }`.
4. Cap overflow → `{ ok:false, reason:"max_iterations", text }` (no fabricated answer). Per-tool failures become model-safe results (`{ ok:false, error }`), never fake success. Provider error mid-round → `{ ok:false, reason:"error" }`.
5. `toolLogEntry({ name, args, ok, error })` builds the audit trail; persisted metadata is bounded at `TOOL_CALLS_METADATA_MAX` = 20.

### Worker integration (`backend/jobs/generation.worker.js`)

- New `generateJobAnswer({ providerConfig, providerType, userId, userMessage, context })`: `canUseTools(providerType)` → assemble `buildProviderMessages` (system + bounded history + pet context + question) and run the loop with the resolved adapter/config (`providerConfig ? buildProviderRequest(providerConfig) : { adapter: getActiveProvider(), config: AI_CONFIG.openai }`); otherwise fall back to legacy `generatePetGPTResponse`.
- Result handling mirrors Phase 4: `reason:"error"` → job fails `SAFE_ERRORS.PROVIDER` (no fake assistant); `max_iterations` → completed with the loop's safe text; success persists the assistant `Message` with `toolCalls: result.toolLog`; completion log includes the tool call count.
- The one integration bug that mattered: `backend/ai/index.js` now `require("./tools")` so the read tools are **registered** — without it the loop saw `no_tools` and silently fell back to the legacy path.
- Job `provider` label: `providerConfig ? providerConfig.provider : AI_CONFIG.provider`; capability checked on the raw provider type (user-config labels resolve through it). Stored-config decrypt failure is reported as the configured provider failing to resolve — job fails safely.

### Persisted metadata

`Message.toolCalls: [{ name (required), arguments (Mixed), ok (required), error }]`, bounded at `TOOL_CALLS_METADATA_MAX`, `default: undefined`; surfaced through `publicMessage` and the conversation/job GET responses. Arguments are stored (bounded array, ≤ 20 items) so "what the AI asked to do" is auditable without ever leaking keys.

### Capability gating (`backend/ai/openai.js` + `gemini.js`)

Providers declare `supportsToolCalling()` (default false); OpenAI-compatible returns true when the declared model advertises `tool_calling`; Google/Gemini stays false (legacy chat path). No capability, no tools — never assume.

### Config (`backend/config/ai.js` — set env before require)

`PETGPT_MAX_TOOL_ITERATIONS` (default 3), `PETGPT_TOOL_MAX_RESULTS` (default 10), `PETGPT_CONTEXT_MAX_PETS` (default 5). See `backend/.env.example`.

### Verification (2026-09-22)

- `node --check` all touched files → pass.
- **`petgpt-tools.test.js` 10/10** (local Mongo + mock OpenAI): registry/declarations; `get_my_pets` normalization + no secrets; unknown tool; argument validation (missing args / wrong type / unknown args); ownership isolation (foreign pet error === nonexistent-pet error, no existence leak); capability gates (google stays off the tool path); bounded iterations (maxIterations=3); bounded metadata (25 calls → 20 recorded); per-tool failures model-safe; provider failure mid-round abort.
- **`petgpt-jobs-tools.test.js`** (local Mongo + mode-switchable mock provider on :4115): worker → tool execution → final answer over 2 provider calls; persisted assistant `toolCalls` `[{ get_my_pets, ok:true }]`; tool result fed back (answer names **Rex, not Max**); wipe_all_data tool failure → job completed with `ok:false` + error, no fake success; always-tools provider → bounded at maxIterations then job failed `provider`, no fabricated answer, no dangling jobs; HTTP 500 → failed with no assistant message; ownership isolation 404; no secrets in jobs/messages/docs/logs. Calls `startWorker()`/`stopWorker()`.
- **`petgpt-tools-omniroute.test.js`** (real `catlium-omniroute`, dummy key works on `/chat/completions`): the model actually called `get_my_pets`, the worker executed it, final reply "You have one pet: Rex, a 3-year-old male Golden Retriever"; 1 tool call recorded; ≤ 20 and only registered tools; no "Max"/"aged 7" leak; legacy `/ask` 200; no API key in logs/DB; honest SKIP when unreachable (probe retried 3×).
- **Full `npm test` chain exit 0 with the OmniRoute env** — all 11 suites: ai-provider 17, conversation-api 15, petgpt-provider-conversation 5, petgpt-omniroute 5, provider-config 19, petgpt-provider-config-omniroute 6, petgpt-jobs 11/7, petgpt-jobs-omniroute, petgpt-tools 10, petgpt-jobs-tools, petgpt-tools-omniroute.
- No frontend file changes; no React-migration worktree/file changes; no mutation tools; no Phase 6.

## 20. Phase 6 — Mutation Tools, Per-User Limits & Reliability

Status: **✅ implemented & verified** (2026-09-22). Backend-only. Provider-neutral (mock-verified, no OmniRoute hard-coding); React-migration worktree untouched; no streaming; no Phase 7. Builds directly on Phase 5: the same registry, the same durable worker, the same tool-calling loop.

### Design rules (from the Phase 5 notes)

- **Mutation surface is tiny and low-risk**: exactly two mutation tools — `create_reminder`, `complete_reminder`. Both are additive or a reversible status flag. Destructive/high-risk tools (delete, hard update, booking confirmations) are **not** implemented because there is no confirmation UX and the model can never be given the last word on destructive writes (product rule 5).
- **Confirmation is model-side + guardrail**: before mutating, the model must tell the user exactly what it will do and wait for confirmation. This lives in `buildSystemPrompt()`. Backend enforcement is by *exclusion*: the registerable surface only contains safe mutations, so there is nothing destructive to "confirm".
- **Idempotency is server-side and durable**: a retried/re-enqueued GenerationJob must never run a mutation twice. Every successful mutation writes a **MutationEffect** ledger row keyed `(owner, sha256(jobId:tool:normalizedArgs))` where `jobId` is the durable job id; a re-run of the same job+args **replays the recorded result** instead of executing again. Different job or different args = a legitimate separate action (its own key).
- **Reliability retry policy is intentionally unchanged**: provider failures stay terminal `failed` (`code:"provider"`) — the ledger, not retry semantics, protects against duplicate mutations. Legacy `/api/ai/ask` stays stateless and unquotaed.

### Mutation idempotency ledger (`backend/models/MutationEffect.js`)

- Schema: `owner` (ref User), `job` (ref GenerationJob, `index:true`), `tool`, `key`, `result` (Mixed — the normalized bounded result), timestamps.
- Unique index `{ owner, key }` — one recorded execution per (owner, mutation). `key` embeds the job id, so the same logical mutation across different jobs never collides.
- Write-once, **success-only**: a failed mutation leaves no row, so a retry is still allowed. `result` is the normalized/tool-returned value (id/title/status — never secrets or provider payloads).
- `GenerationJob` stays free of business data; the ledger is careful not to store keys or auth material.

### Mutation tools (`backend/ai/tools/mutation-tools.js`)

- `create_reminder { petId, title, type, description?, date (YYYY-MM-DD), time (HH:MM), frequency? }` — `type ∈ feeding/medicine/vaccination/grooming/appointment/exercise/custom`, `frequency ∈ once/daily/weekly/monthly` (default `once`). Enum/date/format validation lives in `execute()` (schema.js is types-only). Ownership gate via `authorizePetMutation` (full args returned only after `requireOwnedPet` passes — unlike the read-tool gate, which returns `{ petId }` only). Writes `Reminder.create`, then returns the **normalized created reminder** — success is only ever claimed after the backend write succeeds.
- `complete_reminder { reminderId }` — `Reminder.findOneAndUpdate({ _id, user: userId }, { isCompleted: true }, { new, runValidators })`; not found / not owned fail identically (`"Reminder not found or not owned by you."` — no existence oracle). Malformed ids → typed `invalid_arguments`.
- `readOnly:false` (defaults in `registerTool` are read-only; mutation tools opt out). Registered in `backend/ai/tools/index.js` exactly once, same as the read tools.

### Registry idempotency (`backend/ai/tools/registry.js`)

- `executeTool(name, args, userId, context)` — when `context.jobId` is present **and** the tool is a mutation, compute the deterministic key from the **scoped** (post-authorization) args via `stableStringify` (sorted-object-serial, so argument order doesn't change the key), look up the ledger; on hit `logEvent('petgpt.tool.replayed')` and return `{ ok:true, result: prior.result, replayed:true }`; on miss execute → `MutationEffect.create` → return result.
- Read tools (`readOnly:false === false`) skip the ledger entirely — the ledger is for side effects only.

### Per-user generation quota (`backend/ai/quota.js` + controller)

- `enforceGenerationQuota(userId)`: counts the owner's `GenerationJob` docs with `createdAt >= now - AI_CONFIG.rateLimit.windowMs`. The durable job collection **is** the usage ledger — one in-scope exchange (plain **or** tool path) creates exactly one job, so no second counting system exists. Default `max: 30 / windowMs: 60_000` via env `PETGPT_RATE_LIMIT_MAX`/`PETGPT_RATE_LIMIT_WINDOW_MS`.
- Enforced in `conversation.controller.js addMessage` **after** the scope gate (out-of-scope exchanges create no job and cost nothing) and **before** persisting the user message or creating a job → an exceeded window returns a deterministic `429 { success:false, message:"Rate limit exceeded. Please try again later." }` with **no orphan message/doc**.
- Out-of-scope and legacy `/api/ai/ask` (stateless) are intentionally exempt; the quota governs durable generations.

### Structured observability (`backend/ai/logging.js`)

- `logEvent(level, event, fields)` → one JSON object per line: `{ t, level, event, ... }`. Used by the worker (`petgpt.job.completed/failed`, `petgpt.worker.started`, `petgpt.worker.tick_failed`) and the tool layer (`petgpt.tool.executed` with `{userId, tool, ok, replayed}`, `petgpt.tool.replayed`).
- Log-greppable by event, but only ids/statuses/counts/labels; **never** args, results, keys, auth material, or raw provider payloads.

### Worker changes (`backend/jobs/generation.worker.js`)

- `runToolCallingLoop` now receives `options: { jobId }` so the durable job id reaches the mutation ledger.
- Graceful `stopWorker()`: clears the poller, then `await`s the in-flight tick (a claimed job mid-provider-exchange) before returning — a shutdown never abandons a claimed job mid-mutation with an unfinished ledger write.

### Config & env (`backend/config/ai.js`, `backend/.env.example`)

`PETGPT_RATE_LIMIT_MAX` (30), `PETGPT_RATE_LIMIT_WINDOW_MS` (60000). No new dependencies; ledger/quota/logging are stdlib/mongoose.

### Verification (2026-09-22)

- `node --check` all touched files → pass.
- **`petgpt-mutation-tools.test.js` 10/10** (local Mongo, direct layer): both mutation tools registered `readOnly:false` alongside read tools (get_my_pets stays read-only); `create_reminder` writes a real owner-scoped Reminder; argument/enum/date/id validation (schema + execute-level enums); ownership isolation (foreign pet error === nonexistent-pet error, foreign reminder === unknown reminder); `complete_reminder` reports the verified `isCompleted:true` only; idempotency ledger — same `jobId`+args → `replayed:true` returning the identical record, one Reminder, reordered args hit the same key, **different** jobId → legitimate second Reminder; failed mutation leaves **no** ledger row and stays retryable; no `jobId` → no ledger; system prompt confirm-first guardrail; persisted docs + declarations secret-free.
- **`petgpt-quota-reliability.test.js`** (local Mongo + mock provider on :4116, `PETGPT_RATE_LIMIT_MAX=3`, worker `poll 60/stale 150/maxAttempts 3`): 3 in-window exchanges → completed, 4th → `429` with no orphan job/message; quotas are per-user; legacy `/ask` unbounded; a mutation job **simulated-crash-re-enqueued twice** re-runs its full provider flow (≥6 tool requests) yet the Reminder and the ledger row exist **exactly once** (`attemptCount ≥ 2` proven); graceful `stopWorker()` waits out an in-flight 400 ms generation and the job lands `completed`; full security scan (jobs/messages/reminders/ledger/responses/logs) clean.
- **`petgpt-jobs.test.js` race assert hardened** (was timing-flaky when the fast mock completes an assistant reply before the follow-up GET — now counts the raced user message by content, not a length delta). Re-ran 3× green.
- Full `npm test` chain exit 0 — prior 11 suites + the 2 new ones (OmniRoute suites skip cleanly without the container).
- No frontend file changes; no React-migration worktree/file changes; no streaming; no Phase 7.

Commit: Phase 6 on `feature/petgpt-enhancement`.

Commit: this phase on `feature/petgpt-enhancement` (backend `ai/` tooling, worker integration, tests, config/docs).

## 21. Phase 7 — Production Readiness & Security Hardening

Status: **✅ implemented & verified** (2026-09-22). Backend-only. Provider-neutral (mock-verified). No frontend/React worktree changes; no streaming; no new AI features; no new queue system; no Phase 8. A security/reliability audit of the Phase 5/6 PetGPT backend, followed by targeted fixes — no design rework, everything below is a guard or a documented limitation.

### Audit — sound by design (unchanged)

- **Authorization is owner-scoped end to end**: every PetGPT route sits behind `protect`, and every controller scopes reads/writes to `req.user._id` (`AiProvider.findOne({ _id, owner })`, `FindOneAndDelete({ _id, owner })`, `GenerationJob.aggregate` on `owner`, etc.).
- **No existence oracle**: foreign ids, unknown-but-valid ids, and ids owned by another user all fail identically (same 404 message) on conversations, jobs, and provider configs; provider configs have no single-GET route at all (any `GET /providers/:id` is a plain route 404).
- **Provider isolation**: each user's provider config is private — created/read/updated/deleted/tested only by its owner; the `/test` endpoint persists nothing.
- **Prompt-injection resistant by construction**: tool authorization is **code-only**. The model/user text can never authorize an operation — `authorize()` resolves ownership server-side, and unregistered tool names (e.g. `delete_all_pets`) are refused by the registry before any code path exists. Repeated phases tested this and it holds under injected instructions.
- **Secret hygiene**: normalized `AiProviderError` codes never carry secrets; `safeProvider()` never serializes `apiKeyEnc`; provider requests/logs/persisted docs carry no keys (scan-verified).

### Audit — gaps found and fixed

| Gap | Fix |
|-----|-----|
| `/api/ai` body parsed by the 50 MB global limit before validation | `server.js` mounts `express.json({ limit: "32kb" })` + `express.urlencoded({ limit: "32kb" })` on `/api/ai` **before** the app-wide 50 MB parser; oversize → 413 (body-parser's second parser skips already-parsed requests via `req._body`) |
| Provider `name`/`model`/`apiKey` unbounded | `provider.controller.js` caps: `NAME_MAX=100`, `MODEL_MAX=200`, `API_KEY_MAX=500` → deterministic 400 |
| Tool args unbounded; loose date parsing (`new Date("01/31/2026")` passed Mongo's "string" check) | `mutation-tools.js` adds `TITLE_MAX=100`, `DESCRIPTION_MAX=500`, strict `isValidCalendarDate()` (regex + real calendar rollback, rejects `2026-02-30`), strict `isValidTime()` (00:00–23:59); `date` passed through as `String` |
| "One active provider per owner" only controller-enforced | `AiProvider` partial unique index `{ owner: 1 }` filtered `{ active: true }` (named `one_active_provider_per_owner`); `createActiveConfig()`/update-promote retry once on E11000 after re-deactivating siblings — concurrent double-promote fails instead of yielding two active configs |
| `clearConversation` left orphaned `MutationEffect` rows | deletes `{ owner, job: { $in: jobIds } }` alongside messages/jobs |
| No graceful shutdown | `server.js` SIGINT/SIGTERM → `server.close()` → `stopWorker()` → `mongoose.disconnect()` → exit(0); 10 s no-op timer unref'd as a failsafe |
| `server.log`/`server.err` tracked in git | `.gitignore` + untracked |

### Remaining limitations (documented, not fixed this phase)

- **Quota is a soft limit under true concurrency**: `enforceGenerationQuota` does a read-then-count race free of transaction; a fully concurrent burst can briefly exceed `max` (self-corrects each window), but the invariants that MUST hold are enforced and tested: only `202`/`429`, never `500`, every `202` persists exactly one job + one user message, every `429` creates nothing.
- **Single in-process worker** (one claim at a time) with reaper-based crash recovery; jobs are claimed `startedAt`-stamped and the reaper re-queues/fails stalls by `attemptCount` (`PETGPT_MAX_JOB_ATTEMPTS=2`), no backoff.
- **Multi-worker duplicate window**: a reaper can re-enqueue a job another worker still holds; the mutation ledger bounds that to at most one *claimed-safe* mutation, but the ledger's `findOne→create` itself can race across processes, and a crash between `Reminder.create` and the ledger insert can leave a retryable duplicate. Both are real only with >1 worker process; moving the ledger insert before the mutation (or a transaction with a replica set) is the upgrade path.

### Config & env

No new env vars — the 32 KB `/api/ai` body bound is hardcoded in `server.js`; `.env.example` unchanged.

### Verification (2026-09-22)

- `node --check` all touched files → pass.
- **`petgpt-security.test.js` 12/12** (local Mongo + mode-switchable mock provider on :4119): cross-user conversation/job/provider access identical to unknown ids (no oracle); malformed/empty/oversized inputs deterministic 400, foreign idempotency-key reuse 409; oversized `/api/ai` body → 413 before parsing; provider-config bounds 400; strict tool date/time/length validation; **retried same-job mutation replays its recorded result** (one reminder, one ledger row — sequential exactly-once); HTTP 500 / non-JSON / empty-text / malformed-tool-call failures land the job `failed` with generic errors and no fabricated message; prompt-injection attempts refused by backend code (foreign-pet read, unregistered tool, foreign-pet mutation — all `ok:false`, nothing written); quota sequential 202/202/429 with no orphans + concurrent burst never 500/no drift; atomic claim + reaper (exhausted → failed, retryable → re-enqueued); clearConversation purges ledger rows; secret scan across persisted docs, API responses, provider requests, and logs clean.
- Regression suites re-run green: provider-config 19/19, petgpt-mutation-tools 10/10.
- Full `npm test` chain exit 0 (2 consecutive runs) — all 14 suites (OmniRoute suites skip cleanly without the container).

Commit: Phase 7 on `feature/petgpt-enhancement`.