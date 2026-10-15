# FamiPet

FamiPet is a pet-care web application: owners register their pets, keep each pet's
health and vaccination history, book veterinary appointments, adopt and re-home pets
through a moderated request flow, and ask PetGPT — FamiPet's AI assistant — questions
answered from their own pets' data. This repository contains the full stack: a React
single-page app, an Express/MongoDB API, and the Docker/nginx deployment that serves
both.

## Overview

The application is one origin served through nginx. The React SPA calls a JSON API
over `/api`; the API owns authentication, authorization, ownership and all persistence
in MongoDB. Every user-specific screen — pets, health records, vaccinations,
appointments, reminders, adoptions, notifications, the AI assistant — reads and writes
real data from the database through authenticated endpoints, and shows an empty state
when no records exist.

Authorization is enforced in the backend. Ownership is always taken from the
authenticated session, never from the request body, and admin-only actions (user
management, adoption approval, community and lost & found moderation) are checked by
role on the server.

## Current Features

**Accounts and authentication** — email/password registration and login, email
verification and password-reset deep links, JWT bearer sessions, profile editing with
avatar upload, and password change.

**Pet management** — create, edit and delete pets with breed, species, sex, age,
weight, colour, vaccination flag, photos and description. Every pet belongs to exactly
one authenticated owner and is only reachable by that owner (or an admin).

**Pet profiles** — the "My Pet" page lists the signed-in user's pets with per-user
stats, species/breed filtering and search, a pet card grid, create/edit and delete
modals, and a per-pet detail view that shows the pet's record and generates its Digital
Pet ID QR on open.

**Pet breeds** — a browsable breed catalogue with species tabs, client-side search and
filtering, and a per-breed detail page.

**Digital Pet ID** — the owner (or an admin) generates a QR code for one of their own
pets; the QR encodes the pet's id, name, species, breed and the owner's contact name
and phone. Generation is owner/admin only, and a direct pet read by id is
ownership-checked, so one user cannot reach another user's pet.

**Health and vaccinations** — per-pet health records (diagnosis, treatment, doctor,
hospital, prescription, visit and next-visit dates, notes) and vaccination records
(vaccine, dose, dates, veterinarian, pending/completed), created and edited only by the
pet's owner.

**Appointments and reminders** — a veterinarian directory, appointment booking with
validation (including no double-booking of one veterinarian at the same date and time),
an appointment status lifecycle (pending, confirmed, completed, cancelled, no-show),
and reminders that are created automatically when an appointment is booked and can also
be created, edited, completed and deleted by their owner.

**Adoption** — an owner marks one of their own pets as available, other users browse
the public catalogue of available pets and submit a request (with contact details and
their reason), and an admin approves or rejects it; both the pet's owner and the
requester are notified of the outcome. Listing, approving and deleting a request are
all admin-gated on the server.

**Community and Lost & Found** — community posts and lost/found reports with
admin-driven moderation and status changes.

**Notifications** — a persisted per-user inbox with unread counts, read/unread state
and "mark all read", plus optional browser push (see [Notifications](#notifications)).

**PetGPT (AI assistant)** — per-user conversations with a chat-completions provider,
durable background generation jobs, and read tools over the caller's own pets plus
guarded, explicitly-confirmed mutations (create/complete a reminder, create an
appointment). See [PetGPT](#petgpt).

**Admin** — a role-gated area for dashboard statistics, users (block/delete), pets,
adoption approval, community moderation and lost & found moderation.

**Frontends** — the React SPA in `frontend-react/` is the application that is
deployed. The older Vanilla JS frontend in `frontend/` is retained as the parity
reference for the ongoing migration and is not built or served by the current
Compose stack (see `docs/migration.md`).

## Architecture

```text
Browser
  |
  +-- https (Cloudflare edge, optional)  or  http://<host>:<APP_PORT>
  |
nginx :80  — the only published application port
  |
  +-- /api/*     -> backend:5000   (Node.js / Express, private)
  +-- /uploads/* -> backend:5000   (private, static)
  +-- /*         -> frontend:5502  (nginx serving the built React SPA, private)

backend:5000 -> mongodb:27017 (private, named volume)
backend:5000 -> ai:8000       (private, Breed AI inference)
backend:5000 -> <OpenAI-compatible PetGPT endpoint> (deployment-provided)
```

* **Frontend** — React 19 + TypeScript, built with Vite, styled with Tailwind CSS 4,
  routed with react-router-dom. One API client (`src/api/`) with a shared auth-aware
  fetch layer; auth and notification state in React contexts.
* **Backend** — Node.js (CommonJS) with Express 4 and Mongoose 8. Route → controller
  → service → model layering, `protect` auth middleware, role middleware for admin
  routes, in-memory rate limiting on sensitive and AI endpoints, Helmet, CORS allow
  lists, and Winston logging. The PetGPT generation worker is an in-process poller
  started by the API, with a reaper that recovers stalled jobs on boot.
* **Database** — MongoDB (`mongo:7`) with Mongoose schemas per domain model, indexed
  for the user-scoped queries the app actually issues. No host port is published; only
  the backend reaches it, by service name, over a private network.
* **Reverse proxy** — nginx serves the SPA, proxies `/api` and `/uploads` to the
  backend, and joins both Compose networks. The backend is never exposed directly.
* **Docker Compose** — the canonical root `docker-compose.yml` (the only Compose file in
  the repository) builds and runs `frontend`, `backend`, `ai`, `mongodb`, `nginx` and
  `cloudflared`. The reviewed image definitions live in `docker-final/` and are the
  single source of truth for the Dockerfiles.
* **Cloudflare tunnel** — an outbound-only `cloudflared` container starts with the
  normal stack and needs `TUNNEL_TOKEN` in the root `.env`. The hostname →
  `http://nginx:80` mapping lives in the Cloudflare Zero Trust dashboard, not in this
  repository.
* **PetGPT provider** — an OpenAI-compatible chat-completions endpoint supplied by the
  deployment (default: FamiPet's own OmniRoute gateway, which is host-local and is
  never modified or reconfigured from this repository). No vendor SDK and no
  hardcoded endpoint.
* **Browser push** — a hand-written service worker (`frontend-react/public/sw.js`,
  native Push API, no Workbox and no fetch handler) with the `web-push` library on the
  server. VAPID keys are deployment configuration.

## Repository Structure

```text
backend/                 Express API (CommonJS)
  config/                env-backed config: ai, breed-ai, email, cloudinary, push
  controllers/           HTTP handlers, one per domain
  routes/                route tables, mounted in server.js
  services/              shared business logic (appointments, notifications, push)
  models/                Mongoose schemas (User, Pet, Adoption, Notification, ...)
  middleware/            auth, role and rate limiting
  ai/                    PetGPT provider, tool calling, tool registry
  ai/tools/              read tools and confirmed mutation tools
  jobs/                  durable PetGPT generation worker
  test/                  runnable test suites (see Testing)
frontend-react/          React SPA (deployed)
  src/api/               typed API modules + shared client
  src/components/        shared and feature components
  src/contexts/          auth and notification state
  src/pages/             landing, auth, app and admin pages
  src/routes/            route table and auth/admin guards
  src/styles/            global, landing, dashboard, notification styles
  public/sw.js           push service worker
frontend/                legacy Vanilla JS frontend (parity reference, not deployed)
ai/                      Python Breed AI service (FastAPI, internal on Compose)
docker-final/            reviewed Dockerfiles (frontend, backend, nginx, ai)
docs/migration.md        frontend migration plan and phase status
docker-compose.yml       canonical production Compose stack
.env.example             root deployment contract (the source of truth for Compose)
backend/.env.example     standalone backend template (running backend/ alone)
ai/.env.example          standalone AI service template (running ai/ alone)
AGENTS.md                agent rules for this repository
```

## Requirements

* **Node.js** with npm. The container images are built on `node:26-alpine`; the suites
  are verified locally on Node 24.
* **MongoDB** 7 (any 4.4+ server supported by Mongoose 8 works). A reachable mongod is
  required for the backend to start and for the test suites.
* **Docker** with Compose v2 — only for the containerised deployment.
* An **OpenAI-compatible endpoint** for PetGPT. Optional: without it the whole app
  works and PetGPT simply reports that no provider is configured.

## Environment Configuration

There is one source of truth per use case, and **no secret is ever committed**:

```text
Normal FamiPet deployment
        |
    .env            <- copy of the tracked .env.example; the ONLY place a
        |              deployment operator changes values
  docker-compose.yml   maps each variable explicitly into each service
        |
  individual services

Running one service alone (development)
        |
  <service>/.env.example  ->  developer creates <service>/.env  ->  that service
```

* **root `.env`** (gitignored, template `.env.example`) — the complete
  deployment contract: `APP_PORT`, `VITE_API_URL`, `CLIENT_URL`,
  `PUBLIC_APP_URL`, `TUNNEL_TOKEN`, Mongo/JWT, every `PETGPT_*`,
  `PET_BREED_*`, VAPID, optional SMTP/Cloudinary and the AI service tuning
  variables. `docker-compose.yml`
  interpolates this file and passes each container exactly the variables it
  needs — it never dumps the whole file into every container, and it reads no
  service-local env file.
* **`backend/.env`** (gitignored, template `backend/.env.example`) —
  development/standalone configuration for running the API alone
  (`cd backend && npm run dev`). Not read by the Compose stack.
* **`ai/.env`** (gitignored, template `ai/.env.example`) — standalone
  configuration for running the Python service alone. Not read by the Compose
  stack.

Key backend variables (documented with defaults in `.env.example`):

| Variable | Purpose |
| -------- | ------- |
| `MONGODB_URI` | The only source of the database URL. The Compose default is `mongodb://mongodb:27017/petDB`; there is deliberately no localhost fallback in the code. |
| `JWT_SECRET`, `JWT_EXPIRE` | Session signing key and lifetime. `JWT_SECRET` is required — Compose fails fast without it. |
| `CLIENT_URL` | Public origin(s) used for emailed deep links and the CORS allow list. Every origin the app is served from must be listed, or writes fail while reads keep working. |
| `PUBLIC_APP_URL` | Public origin encoded into generated Pet ID QR codes (e.g. `https://famipet.catlium.in`). Falls back to `CLIENT_URL`; without either, QR codes encode a placeholder host. |
| `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_SERVICE` | SMTP transport for verification and reset mail. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional image hosting; local uploads are used when unset. |
| `PETGPT_OPENAI_BASE_URL` | Chat-completions **root** of the provider (the adapter appends `/chat/completions`); no trailing slash. |
| `PETGPT_OPENAI_API_KEY` | Bearer value for the provider. |
| `PETGPT_OPENAI_MODEL` | Model name/alias to request. |
| `PET_BREED_AI_URL` | Backend address of the Breed AI service; Compose default `http://ai:8000`. |
| `VAPID_PUBLIC_KEY` | Browser push public key, published to authenticated clients. |
| `VAPID_PRIVATE_KEY` | Browser push private key. |
| `VAPID_SUBJECT` | `mailto:` or `https:` contact for this deployment's push keys. |

**Boot-time validation.** `backend/config/env.js` validates the process environment on
startup (zod). `MONGODB_URI` and `JWT_SECRET` are required — if either is missing the
server exits with a clear message before connecting to anything. Optional feature groups
are all-or-nothing and print a warning naming the missing variable: Email
(`EMAIL_SERVICE`/`EMAIL_USER`/`EMAIL_PASS`), PetGPT (`PETGPT_OPENAI_*`), VAPID and
Cloudinary.

Additional `PETGPT_*` tuning variables (timeouts, rate limits, worker poll interval,
job retries, tool-call limits) have working defaults; see `backend/config/ai.js` and
`backend/.env.example`. They are mapped into the Compose backend too, so setting
them in the root `.env` changes the deployment.

**Secrets belong in the local/deployment env files only.** The root `.env`,
`backend/.env`, and any real provider key, JWT secret, SMTP password, Cloudinary
key or VAPID private key must never be written into a tracked file — including
the `.example` templates, which stay placeholder-only.

**Docker networking.** Inside a container, `localhost` is the container itself. When
the backend runs under Compose and the OpenAI-compatible provider is host-local,
address it through the `host.docker.internal` alias that the stack already maps to the
host gateway:

```text
PETGPT_OPENAI_BASE_URL=http://host.docker.internal:<port>/v1
```

A `172.x` container IP is never correct — it changes on every recreate. On a host where
the provider is a host-local service reached directly, `localhost` is correct. Never
change tracked configuration or the provider service to suit one machine.

## Development

```bash
# API — install, then run against a reachable mongod
cd backend
npm install
cp .env.example .env                 # standalone config (gitignored), then edit
MONGODB_URI=mongodb://localhost:27017/petDB npm run dev     # nodemon
MONGODB_URI=mongodb://localhost:27017/petDB npm start       # plain node
MONGODB_URI=mongodb://localhost:27017/petDB npm run seed    # seed reference data
MONGODB_URI=mongodb://localhost:27017/petDB npm test        # full suite (see Testing)
npm run lint                                                   # eslint

# React SPA
cd frontend-react
npm install
npm run dev        # Vite dev server (no .env needed: API base defaults to http://localhost:5000/api)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run preview    # serve the production build

# Breed AI service (standalone)
cd ai
set -a; . ./.env.example; set +a   # or copy to ai/.env first
uvicorn main:app --port 8000       # needs pip install -r requirements.txt
```

`VITE_API_URL` selects the API base the bundle uses; the default `/api` is
same-origin through nginx.

## Docker Deployment

```bash
cp .env.example .env                 # fill real values: JWT_SECRET, TUNNEL_TOKEN, ...
docker compose up -d --build         # app at http://localhost:${APP_PORT:-8080}
docker compose down -v               # stop and drop volumes
```

That is the whole deployment: the root `.env` is the only file an operator
edits, and `docker-compose.yml` maps its variables explicitly into each
service. `backend/.env` is **not** part of the deployment — it exists only for
running the API standalone (see [Environment Configuration](#environment-configuration)).

Services: `frontend` (built SPA behind its own nginx, internal only), `backend`
(read-only root filesystem, all capabilities dropped, non-root, memory and CPU
limited), `ai` (Breed AI inference, internal, no published port), `mongodb`
(no published port, health-gated, persistent volume), `nginx` (the single
published entry point) and `cloudflared` (Cloudflare tunnel, outbound
only; needs `TUNNEL_TOKEN`). Only nginx publishes a port. The frontend is
health-gated on nginx, the backend on MongoDB, so the stack starts in order.

`docker-compose.yml` at the repository root is the only Compose file; `docker-final/`
holds the Dockerfiles it builds from.

## PetGPT

PetGPT talks to exactly one **OpenAI-compatible chat-completions endpoint**, and the
deployment supplies it. `PETGPT_OPENAI_BASE_URL`, `PETGPT_OPENAI_API_KEY` and
`PETGPT_OPENAI_MODEL` are the entire provider configuration: there is no per-user
provider, no per-user key, and no in-app provider setting, so a user can never redirect
the assistant. The base URL is the endpoint root; the adapter appends
`/chat/completions`. The API key is never logged, echoed in an error, or returned to a
client. Leave the three variables unset and the rest of the application is unaffected —
PetGPT reports that no provider is configured.

The default deployment provider is FamiPet's own OmniRoute gateway, host-local on
`localhost`. It is a property of the host, not of this repository: its address is never
hardcoded in tracked files, and the service is never modified or reconfigured to make
FamiPet work — reachability is solved on the FamiPet side (see Docker networking).

Generations run as durable background jobs: a request enqueues a job, an in-process
worker polls, runs the provider with tool calls, and persists the assistant message;
the client follows job status. Read tools (`get_my_pets`, `get_pet_details`,
`get_pet_health`, `get_pet_vaccinations`, `get_pet_appointments`, `get_pet_reminders`)
are scoped to the caller. Mutating tools (create/complete a reminder, create an
appointment) require explicit confirmation, are idempotency-keyed and audited, and fail
closed. Provider failures, malformed responses and unconfigured providers surface as
generic errors and never corrupt stored state.

**Current limitation:** the tool-calling suites that exercise a real provider self-skip
unless `PETGPT_RUN_LIVE_E2E=1` is set, because they would otherwise spend a real API
key. Everything else is verified against a local fake endpoint.

## Notifications

The MongoDB `Notification` document is the single source of truth. The inbox, the
unread badge and read/unread state all read that document; nothing about push delivery
can change them.

The inbox is served by `GET /api/notifications` and friends, all behind the `protect`
middleware and scoped to the authenticated user. A single app-level bell in the
application layout reads one `NotificationProvider`, which polls every 60 seconds and
refreshes when the tab regains focus, so a notification created by any backend action
appears without a page reload.

Browser push is **delivery only**, and is off unless configured:

```bash
npx web-push generate-vapid-keys     # once per deployment
```

Put the pair in the root `.env` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, or
`backend/.env` for a standalone backend run) and set `VAPID_SUBJECT` to a
`mailto:` or `https:` contact. With the keys unset — or a
malformed pair — push fails closed: the application is fully usable, the key endpoint
reports `configured: false`, and the Settings toggle says push is not configured.
Nothing throws at startup, and the private key is never logged, echoed in an error, or
returned by any endpoint.

The Settings toggle performs a real subscription: it requests permission from that
explicit user gesture, subscribes with the public key, and posts the subscription to
`POST /api/notifications/push-subscription`; disabling unsubscribes and deletes it. The
subscription endpoints take the user from the Bearer token only, validate the endpoint
and keys, and rate-limit writes. The service worker holds no auth token and never calls
the API; on subscription rotation it re-subscribes and hands the fresh subscription to
an open tab.

Delivery is best effort and can never fail the operation that produced the
notification: a push outage, a misconfigured key or a dead endpoint cannot fail an
appointment booking or an adoption approval. A `404`/`410` "gone" response prunes the
endpoint immediately; other failures count toward a small ceiling. Payloads are
deliberately minimal — title, body, tag, in-app deep link and notification id — because
a push is rendered on a lock screen.

Push and service workers require a **secure context**: `https`, or `localhost`. Plain
`http://` on a LAN address will not work, and the toggle reports that instead of
pretending.

## Testing

Backend (requires a reachable MongoDB; the suite always targets a throwaway database
whose name ends in `_test`, never a real one):

```bash
cd backend
MONGODB_URI=mongodb://localhost:27017/petDB npm test
```

The suite runs sequentially with `node test/<file>.js` and covers database isolation,
pet authorization, auth-email flows (verification/reset links, email-configured vs
not, no-orphan registration), the env validator, the public-PII boundary, pet age
units, Pet ID QR URL/regeneration, appointment effective status, the AI layer,
conversations, PetGPT jobs/tools/mutations/quota/security, and push notifications
(including ownership isolation, payload safety, outage isolation and endpoint pruning).
Suites that need a real provider self-skip unless `PETGPT_RUN_LIVE_E2E=1`. `npm run
lint` runs ESLint.

Frontend:

```bash
cd frontend-react
npm run lint      # oxlint
npm run build     # tsc -b && vite build
```

There is no frontend unit-test runner in the repository today; the React app is verified
by type-check, production build, lint and manual/browser QA. See `docs/migration.md`
for the browser-QA and visual-regression phases.

## Git Workflow

* **`main`** — production releases only. Never develop on it.
* **`dev`** — the integration branch. Every feature branch merges here, and this is
  where the full stack is run and verified together.
* **`feature/*`, `fix/*`, `chore/*`** — short-lived branches off `dev`, one piece of
  work each, merged back into `dev`.

Commit messages follow `<type>: <summary>` (`feat`, `fix`, `refactor`, `docs`, `test`,
`chore`, `perf`). `main` is only updated from `dev` at release time.

## Production Notes

* **Secrets never enter the repository.** Real JWT secrets, provider keys, SMTP and
  Cloudinary credentials and VAPID private keys live only in the gitignored `.env`
  files. No image bakes a secret; configuration is read at runtime.
* **`MONGODB_URI` has no fallback on purpose.** A wrong default inside a container would
  silently point the API at its own loopback instead of failing visibly, so a bad
  configuration fails fast instead of writing to the wrong place.
* **`CLIENT_URL` must list every served origin.** The backend checks the `Origin`
  header against it on every write; a missing origin fails logins and settings while
  reads keep working, which looks like a healthy app.
* **Pet ID QR codes encode `PUBLIC_APP_URL`.** Set it to the public origin
  (`https://famipet.catlium.in`) so scanned codes resolve on the production site; if
  unset, QR generation falls back to `CLIENT_URL` and warns at startup. The stored QR is
  regenerated on demand, so changing the value corrects previously issued codes.
* **Only nginx is published.** The API, the database and the SPA container stay on
  private Compose networks; the backend runs as a non-root user, with a read-only root
  filesystem, all capabilities dropped and `no-new-privileges`.
* **Email and image hosting are deployment concerns.** Verification and reset links
  always point at the SPA routes (`/verify-email/:token`, `/reset-password/:token`).
  Without SMTP (`EMAIL_SERVICE/USER/PASS` all set) the auth email routes return `503`
  with a clear message instead of a raw error, and no user is created nor token
  generated; with SMTP configured they deliver real mail. Without Cloudinary, uploads
  are stored locally.
* **Ownership is enforced server-side.** The user is always taken from the authenticated
  session, never from the body; direct pet reads and QR generation are owner/admin
  only, so one user cannot reach another user's pets, records or notifications. The
  adoption catalogue (`GET /api/pets`, `/api/pets/featured`) is intentionally public
  and returns listing data with a **name-only** owner projection (no email/phone) —
  full owner contacts exist only on authenticated owner/admin endpoints.
* **Tunnels are outbound-only.** `cloudflared` starts with the normal `up` and needs
  `TUNNEL_TOKEN` in the root `.env`; the public hostname mapping is configured in the
  Cloudflare dashboard rather than in tracked files.
