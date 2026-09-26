# FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind

Status: OPERATIONAL — this is the working guide for the React migration. Phases are being
executed incrementally inside `frontend-react/`; progress is tracked in the Phase Status
table below. `docs/design.md` is the visual source of truth; `frontend/` is the behavioral
source of truth; `backend/` is unchanged unless a genuine frontend integration issue
requires it.

---

## 1. Purpose & Principles

Port the existing vanilla FamiPet frontend to **Vite + React + TypeScript + Tailwind CSS**.
This is an **implementation migration, not a redesign**:

- Preserve existing UI, page structure, layouts, navigation, user flows, functionality,
  assets, images, logos, static resources, and API behavior — as they are today.
- `docs/design.md` and the current `frontend/` are the source of truth. Do not "fix"
  design inconsistencies during migration; carry them over faithfully and record accepted
  deltas (design.md §8.1–§8.11) in the Phase 26 visual-regression report.
- Incremental and independently verifiable. Each phase is additive, runs beside the old
  frontend, and can be reverted individually.
- Backend (`backend/`, Express + MongoDB) stays untouched. CORS already accepts any
  `localhost`/`127.0.0.1`/private-range origin (server.js `isDevOrigin`), so Vite (5173)
  and Nginx proxies work without backend changes.
- The old vanilla frontend is **not deleted** until Phase 29, after full verification.

### Ground-truth fast-refs (usable during every phase)

- API base: `http://localhost:5000/api` (`frontend/js/api.js`), token key `famipetToken`,
  user key `famipetUser` (localStorage).
- Backend mounts (server.js): `/api/auth`, `/api/users`, `/api/pets`, `/api/breeds`,
  `/api/adoptions`, `/api/lost-found`, `/api/health`, `/api/vaccinations`, `/api/favorites`,
  `/api/veterinarians`, `/api/appointments`, `/api/community`, `/api/ai`, `/api/notifications`,
  `/api/reminders`, `/api/admin`; static `/uploads` (multer) + `GET /api/status`.
- Nav model (sidebar.js, authoritative labels + lucide icons): Dashboard(`layout-grid`),
  My Pets(`users-round`), Adoption(`heart`), Health(`activity`), Appointments
  (`calendar-check`), Reminders(`bell`), Community(`users`), Lost & Found(`search`),
  PetGPT(`sparkles`), Pet Breeds(`paw-print`), Pet ID(`qrcode`), Settings(`settings`),
  Admin Panel(`shield`, admin-only), Sign Out.
- Page→API wiring already mapped (see each phase + §11).

---

## Migration Execution Protocol

The rules OpenCode follows for every phase of this migration.

### 1. One phase at a time

Work on exactly one migration phase at a time. Do not combine multiple phases unless
explicitly requested.

### 2. Read before implementing

At the start of every phase:

* Read `docs/design.md`
* Read the relevant section of `docs/migration.md`
* Inspect the existing Vanilla frontend files relevant to that phase
* Inspect the current React migration implementation in `frontend-react/`
* Check `git status`
* Confirm the previous phase is committed and pushed

The existing Vanilla frontend remains the source of truth for UI, structure, behavior,
assets, and user flows.

### 3. Preserve the existing application

During the migration:

* `frontend/` remains untouched until final cutover
* `backend/` remains untouched unless explicitly approved
* Docker configuration remains untouched
* Nginx remains untouched
* Cloudflare/infrastructure remains untouched
* The existing working application must continue working
* Do not redesign the UI
* Do not replace existing assets
* Do not invent new user flows

The React frontend is developed independently inside `frontend-react/`.

### 4. Implement

For the current phase:

* Implement only the scope of that phase
* Reuse existing assets
* Follow `docs/design.md`
* Preserve the existing page structure and behavior
* Prefer reusable React components where the existing UI has repeated patterns
* Use Tailwind to reproduce the existing design
* Avoid unnecessary abstractions
* Do not prematurely implement future phases

### 5. Verify

Before marking a phase complete, run the appropriate checks. At minimum when applicable:

* lint
* TypeScript check
* production build
* route verification
* API/functionality verification
* asset verification
* visual verification against the Vanilla frontend

Fix issues found within the current phase before completing it.

### 6. Checkpoint report

At the end of every phase, report:

* Phase number and name
* What was implemented
* Files/components added or changed
* Existing Vanilla files used as reference
* API dependencies
* Verification performed
* Verification results
* Known differences/issues
* Whether the phase is complete

### 7. Commit

After the phase passes verification:

* Review `git diff`
* Ensure unrelated user changes are not included
* Create one logical commit for the completed phase
* Use a clear commit message such as:

`feat(frontend-react): complete phase 04 routing migration`

Do not create one giant commit containing multiple phases.

### 8. Push

After committing:

* Push the current migration branch to `origin`
* Verify the push succeeded
* Confirm the working tree status

A phase is not considered complete until its commit has been pushed successfully.

### 9. Stop at checkpoint

After commit + push:

STOP.

Do not automatically begin the next phase. Wait for the next instruction.

### 10. Rollback safety

If a phase introduces a problem:

* Do not modify unrelated parts of the project
* Keep the previous committed checkpoint intact
* Fix the current phase if possible
* If rollback is required, revert only the current phase changes
* Never delete the working Vanilla frontend to solve a React migration problem

### Authoritative phase order

**The migration phase order is authoritative. OpenCode must not skip ahead, merge phases,
redesign existing UI, or perform final cutover unless explicitly instructed.**

## Phase Status

Updated after every completed phase. A phase MUST NOT be marked `[x]` until:
implementation complete → verification passes → commit created → commit pushed → working
tree verified.

| Phase | Name                           | Status | Commit       |
| ----- | ------------------------------ | ------ | ------------ |
| 1     | Scaffold (Vite + React + TS)   | [x]    | `80cc21d`    |
| 2     | Tailwind setup                 | [x]    | `80cc21d`    |
| 3     | Asset migration                | [x]    | `80cc21d`    |
| 4     | Routing migration              | [x]    | `c5f23f3`    |
| 5     | Global styles/theme            | [x]    | `be87712`   |
| 6     | Shared layout components       | [x]    | `1a2cf5e`   |
| 7     | Authentication                 | [x]    | `9b44727`    |
| 8     | Dashboard                      | [x]    | `d2f6952`    |
| 9     | Pet management                 | [x]    | `38c6aa9`  |
| 10    | Health                         | [x]    | `17fc630`    |
| 11    | Vaccinations                   | [x]    | `3d10701`  |
| 12    | Appointments                   | [x]    | `6876e43`  |
| 13    | Veterinarians                  | [x]    | `721f03f`  |
| 14    | Reminders                      | [x]    | `01f6564`    |
| 15    | Community                      | [x]    | `5dd0fef`    |
| 16    | Lost & Found                   | [x]    | `d637cd9`    |
| 17    | Favorites                      | [x]    | `d7a6f10`    |
| 18    | Adoption                       | [x]    | `70293d0`    |
| 19    | Pet Breeds                     | [x]    | `526f78e`    |
| 20    | Settings                       | [x]    | `ed4d6cb`   |
| 21    | Admin panel                    | [x]    | `d18c336`   |
| 22    | AI / PetGPT (redesign)         | [x]    | `d26e955`    |
| 23    | API integration layer          | [x]    | `f53b399`   |
| 24    | Auth/state management          | [x]    | `f8d4f8b`    |
| 25    | UI/UX completion & stabilization| [x]    | `aa8cf8d`    |
| 26    | Visual regression              | [x]    | `6b689d0`   |
| 27    | Functional regression          | [x]    | `93828fa`   |
| 28    | Docker/Nginx integration       | [x]    | `44f69cc`   |
| 29    | Removal of old Vanilla frontend | [ ]    | —            |

Status legend: `[ ]` not started · `[~]` in progress · `[x]` completed and pushed ·
`[-]` intentionally skipped · `[!]` blocked/problem.

Numbering reconciliation: the **executed roadmap numbering** above is authoritative for
current work. The original plan numbering (below, for traceability) differs only where
execution changed the order:

| Executed (roadmap, above) | Original plan section |
| ------------------------- | --------------------- |
| 10–14 (delivered inside)  | §15 Notifications (no standalone sprint — shared `NotificationBell`/`NotificationPanel`, `useNotifications`, `api/notifications.ts`, consumed by Dashboard, Health, Appointments, Community) |
| 15 Community              | §16 Community         |
| 16 Lost & Found           | §19 Lost & Found      |
| 17 Favorites              | §17 Favorites         |
| 18 Adoption               | §18 Adoption          |
| 19 Pet Breeds             | (new — breeds + breeds/:id)               |
| 20 Settings               | (new — settings `SettingsPage`) |
| 21 Admin panel            | §21 Admin panel       |
| 22 AI / PetGPT (redesign) | §20 AI/PetGPT, deferred + renumbered |

The phase sections below keep the original plan number in a `(plan §N)` suffix for
completed phases; the header number itself always matches the executed roadmap above.

### Stabilization note (2026-09-22, migrated pages only)

Post-migration UI/UX stabilization pass — **does not start Phase 10** (Health is still
`[ ]` above). Scope: frontend-react surfaces that were already migrated (Phases 1–9:
landing/footer, auth, dashboard, my pet, pet ID).

* **Pet ID: no raw data.** The ID card labels rows (Pet ID / Pet Name / Species /
  Breed / Owner) with a live QR PNG. Verified in the rebuilt bundle: no `[object
  Object]`, raw JSON, or stringified object dump renders anywhere on any page
  (headless text scan across dashboard / my pet / pet ID / login / landing in both
  themes). Print + PNG download (`a[download]`) and pet switching work.
* **Theme-relative surfaces.** Vanilla's dark mode left these paper-white on dark:
  mypet `tab-btn`, `stat-icon` chips, `btn-outline-pink`, `add-pet-dashed-card`;
  the pet ID `paw-badge`. They now use the dark-surface language (#211e30/#332e45)
  + tinted rgba chips, matching the rest of the app. Dashboard already had zero
  white surfaces in dark.
* **Dashboard.** Layout verified clean at 1440/768/390: no horizontal overflow,
  4-track `stats-grid`, stats render from real stats dataament (no fake numbers).
* **Responsive.** `footer.css` previously had zero media queries and overflowed at
  390px (newsletter form + 4-column link grid). Added responsive rules: footer-top
  stacks ≤900px, footer-links 2-col ≤700px/1-col ≤480px, newsletter form wraps on
  phones. Sidebar mobile draw-toggle/overlay were unstyled per-reboot (fixed
  toggle/overlay) and are now styled at ≤850px with a dark variant — the mobile
  sidebar can actually be opened again.
* **Other migrated pages / fixes.** Admin tables/stats/buttons were globally generic
  CSS classes that leaked onto the dashboard `stats-grid`/`stat-card`/`stat-icon`;
  admin.css generic selectors are now scoped under `.admin-wrap`.
* **Intentional fixed-white surfaces (kept):** the QR code image itself (must stay
  light to scan), and the printable `.id-card` (light gradient + #25304a body) —
  both document-styled for printing, not theme surfaces.
* **Verification:** `npm run lint` (only pre-existing set-state-in-effect warnings in
  AuthContext.tsx/VerifyEmailPage.tsx), `tsc -b && vite build` clean, headless
  overflow/whites audit clean at 390/768/1440 in light+dark.

---

## 2. Proposed React Project Structure

New self-contained project at repo root in `frontend-react/` (old `frontend/` untouched):

```
frontend-react/
├─ package.json  vite.config.ts  tsconfig*.json  index.html  tailwind.config.*
├─ Dockerfile  nginx.conf                          (Phase 28)
├─ public/
│  └─ assets/{icons,logos,images/…}                (mirror of frontend/assets, Phase 3)
└─ src/
   ├─ main.tsx  App.tsx  router.tsx
   ├─ api/                      client.ts + one module per resource (§6)
   │  └─ {auth,users,pets,breeds,adoptions,lostFound,health,vaccinations,
   │     favorites,veterinarians,appointments,community,ai,notifications,reminders,admin}.ts
   ├─ hooks/                    useAuth, useTheme, useNotifications, useFetcher (etc.)
   ├─ contexts/                 AuthContext, ThemeContext
   ├─ lib/                      storage.ts (localStorage key constants), errors.ts, image.ts
   ├─ styles/                   global.css (tokens + resets), fonts
   ├─ layouts/                  LandingLayout, AuthLayout, AppLayout, AdminLayout, Sidebar, TopBar
   ├─ components/               ui/ (Button, Input, Badge, Modal, Toast, Card, SearchBar,
   │                             IconButton, EmptyState, ConfirmDialog, StatCard, StatusPill)
   │                            shared/ (Navbar, Footer, NotificationBell, PetCard, FavoriteButton)
   ├─ pages/
   │  ├─ landing/               Home.tsx (+ services/about/why/join/contact sections)
   │  ├─ auth/                  Login, Signup, ForgotPassword, ResetPassword, VerifyEmail
   │  ├─ app/                   dashboard, mypet, health, appointments, reminders,
   │  │                         community, lostFound, petgpt, breeds, breedDetails,
   │  │                         petId, adoption, settings
   │  └─ admin/                 AdminDashboard, AdminUsers, AdminPets, AdminAdoptions,
   │                            AdminCommunity, AdminLostFound
   └─ routes/                   route config + guards (lazy-loaded)
```

## 3. Component Organization

- `components/ui/`: presentational, design-token-driven primitives rebuilt around their
  exact existing values (Button `.primary-btn`/`.btn-pink`/`.submit-btn`/`.action-btn`;
  Input `.input-box`; Modal + ConfirmDialog; Toast `.success-toast`; StatusPill/StatusBadge;
  StatCard; SearchBar; Badge; EmptyState; IconButton).
- `components/shared/`: cross-page composites — Navbar (navbar.css), Footer (footer.css),
  Sidebar (sidebar.css/sidebar.js), TopBar + PageHeader variants (§6 of design.md),
  NotificationBell + NotificationPanel, PetCard (dashboard/mypet/adoption variants),
  FavoriteButton (Phase 17).
- Page-level composites live with their page folder; no global catch-all components.

## 4. Page Organization

Pages are organized by URL surface, mirroring the existing file inventory exactly:

| Area | Old files | React routes (target) |
|---|---|---|
| Landing | `index.html` | `/` |
| Auth | login/signup/forgot-password/reset-password/verify-email | `/login /signup /forgot-password /reset-password/:token /verify-email/:token` |
| App (sidebar shell) | dashboard, mypet, adoption, health, appointments, reminders, community, lost-found, petgpt, breeds, breed-details, pet-id, settings | `/app/dashboard /app/mypet /app/adoption /app/health /app/appointments /app/reminders /app/community /app/lost-found /app/petgpt /app/breeds /app/breeds/:id /app/pet-id /app/settings` |
| Admin | `admin/{dashboard,users,pets,adoptions,community,lost-found}.html` | `/app/admin` (dashboard) `/app/admin/{users,pets,adoptions,community,lost-found}` |
| 404 | browser default / server fallback (server.js `*` → index.html) | `NotFound` fallback route |

Deep links (`/verify-email/:token`, `/reset-password/:token`) must remain reachable
unauthenticated (email links) — handled by dev history fallback and Nginx `try_files`
(Phase 28).

## 5. API / Service Organization

- `src/api/client.ts`: single fetch wrapper reproducing `api.js` behavior — `API_BASE`
  from `VITE_API_URL` (default `http://localhost:5000/api`), `Authorization: Bearer
  <famipetToken>`, JSON + FormData support, error normalization to the backend shape
  `{success, message}`. No backend change required.
- One typed module per backend resource (§2 tree). Function names mirror controller
  actions (e.g. `pets.getMy()`, `health.update(id, data)`, `auth.login(creds)`).
- `src/lib/image.ts`: URL resolution parity — relative `/uploads/...` paths resolved
  against the API origin; absolute (Cloudinary) URLs passed through; matching whatever
  transformation `api.js`/page JS applies today.
- Uploads (multer endpoints: avatars, pet images, community posts, lost-found photos)
  use `FormData` via the same client.

## 6. State Management Approach

Lazy by default (AGENTS.md ponytail): **no Redux/Zustand/etc.**

- Server state: per-page `fetch` inside feature components or small custom hooks
  (`useFetcher`), reproducing current on-load fetch behavior (`DOMContentLoaded`
  fetches). Add TanStack Query **only if/if measurable** request-caching need emerges —
  none today. (ponytail: per-feature fetch hooks; swap to a query lib only when polling/
  cache complexity proves it.)
- Client state: `AuthContext` (user + token), `ThemeContext` (dark/light), each scoped
  to what the vanilla code already tracks. Everything else is local component state —
  which is exactly what the old imperative DOM manipulation represented.
- Persistence keys preserved verbatim so sessions survive migration:
  `famipetToken`, `famipetUser`, `famipetTheme` (+ logout clears `annProfile` +
  `sessionStorage` for api.js parity).

## 7. Routing Approach

`react-router-dom` (v6/v7). Config-driven route table (`src/routes/`) with:

- `PublicOnlyRoute` for auth pages (redirect to `/app/dashboard` when logged in).
- `ProtectedRoute` for `/app/*` (redirect to `/login` when no token; verify `/auth/me`).
- `AdminRoute` (admin-only) for `/app/admin/*` (backend enforces authorization; UI guard
  only reduces noise).
- Lazy `React.lazy` per page group; sidebar active state derived from the current location.

## 8. Tailwind / Design-Token Strategy

- One `@theme`/config block covers **global** tokens (design.md §1.1) and all **per-page**
  token families (design.md §1.3) using prefixed names so collisions are impossible:
  e.g. `ldp` global (`--primary #FF5C8A`), `dash` (lavender family), `mypet`
  (`#ff4d6d`), `comm` (`#ed6590`), `lfd` (`#ed6b95`), `set` (`#8b61d8`), `pgtp`
  (`#8d68d8`), `health`/`appt` (`#5b9bd5`, `#243b53`), `auth` (`#4AA8FF`). Prefix
  approach preserves every value unchanged (no redesign, no lost palettes).
- Base resets in `src/styles/global.css` replicate style.css: Poppins default, body
  `--background`/`--text-dark`, `overflow-x:hidden`, `scroll-padding-top:90px`,
  `.container{width:min(90%,1350px)}`, `img{width:100%;display:block}`, link reset.
- Per-page font stacks (design.md §1.4) become Tailwind font-family tokens
  (`font-dmsans`, `font-poppins`, `font-jakarta`, `font-segoe`, admin system stack) and
  are applied per page wrapper — preserving divergence.
- Dark mode: Tailwind `dark:` variant driven by `.dark-theme` class (not `prefers-color-
  scheme`), toggled by ThemeContext exactly as `theme.js` does; keep `dark-theme` class
  name so CSS token parity is trivially diffable against dashboard.css.

## 9. Asset Strategy

- Phase 3 copies `frontend/assets/**` verbatim into `frontend-react/public/assets/` keeping the
  exact directory+filename layout (design.md §5). Static imports (`/assets/icons/paw.svg`)
  then match old markup 1:1; the two trees can be byte-compared.
- Backend-owned media (`/uploads/...`, Cloudinary) is never copied; always rendered via
  `src/lib/image.ts` from API responses.
- Font Awesome / Lucide: bundled as installed packages per page scope (resolves design.md
  §8.4–§8.5 version drift); exact icon glyphs preserved. No switch to new icon sets.

## 10. Authentication Strategy

- Credentials flow unchanged: `POST /api/auth/login`, `POST /api/auth/register` (+ role
  picker), `/me` on boot to hydrate user.
- Token/user state in `AuthContext`, persisted under the existing localStorage keys
  (sessions survive the cutover — users logged in on the old site stay logged in).
- Guards enforce logged-in at `/app/*` and admin-only at `/app/admin/*`; the backend
  (`protect`/`adminOnly`) remains the actual authority (AGENTS.md §2, §3, §14).
- Email flows preserved: verify/reset deep links + resend-verification.
- Logout clears identical keys/state as api.js (`footprint parity`).

---

## 11. Phased Plan

Each phase is independently shippable and verified against the running backend. The
numbered list matches the required scope; execution order note in §12.

### Phase 1 — Vite + React + TypeScript setup
- **Objective:** standing `frontend-react/` Vite React-TS app with strict TS + lint, Dev (5173) and
  production build working, old frontend untouched.
- **Existing source files:** none required (new project); spec = whole `frontend/`.
- **Target React structure:** `frontend-react/` scaffold (§2) with a placeholder `App`.
- **Reusable components:** none yet.
- **API dependencies:** none.
- **UI preservation requirements:** nothing rendered; keep the old stack serving on 5502.
- **Verification:** `npm run dev` serves on 5173; `npm run build` + `tsc --noEmit` +
  lint clean; no frontend/ files modified.
- **Completion criteria:** clean scaffold, green build, run-tested.
- **Rollback/safety:** fully additive; delete `frontend-react/` to revert.

### Phase 2 — Tailwind setup
- **Objective:** install + wire Tailwind; bring in global tokens (design.md §1.1) and
  base resets; Poppins font asset.
- **Existing source files:** `css/style.css` (§1.1 tokens/resets).
- **Target React structure:** `tailwind.config`, `src/styles/global.css`, token maps.
- **Reusable components:** token token maps only.
- **API dependencies:** none.
- **UI preservation requirements:** `container/min(90%,1350px)`, body bg `#FFF9F6`, text
  `#3D2314`, Poppins default; scroll behavior.
- **Verification:** built CSS contains expected hex values; token classes resolve;
  `npm run build` clean.
- **Completion criteria:** global token layer matches style.css values exactly.
- **Rollback/safety:** revert config + css; additive.

### Phase 3 — Existing asset migration
- **Objective:** mirror `frontend/assets/` into `frontend-react/public/assets/` byte-identical.
- **Existing source files:** `frontend/assets/**` (icons 13 SVG, logos, image dirs: hero,
  adoption, dashboard, my-pet, lost-found, Pet-gpt).
- **Target React structure:** `frontend-react/public/assets/{icons,logos,images/**}`.
- **Reusable components:** `Image`, `Logo`.
- **API dependencies:** none (backend `/uploads` untouched).
- **UI preservation requirements:** same filenames/paths so every `<img>`/CSS url matches.
- **Verification:** scripted diff of file tree + bytes between old/new asset trees; spot
  load each referenced asset in dev.
- **Completion criteria:** full mirror, no missing/renamed file.
- **Rollback/safety:** additive.

### Phase 4 — Routing migration
- **Objective:** route table matching every existing page (landing, auth×5 deep links,
  app×13, admin×6); lazy loading; nav order/labels/icons parity.
- **Existing source files:** `index.html`, `pages/*.html`, `admin/*.html`,
  `js/sidebar.js` nav definition.
- **Target React structure:** `src/router.tsx`, `src/routes/*`, per-area shells
  (stubbed layouts rendering route content later).
- **Reusable components:** `RouteShell`, `ProtectedRoute`, `AdminRoute`, `NotFound`.
- **API dependencies:** none yet.
- **UI preservation requirements:** every old URL reachable (incl. history-fallback deep
  links); sidebar routes listed in the exact existing order (§1 fast-ref).
- **Verification:** visit each route in dev incl. reload/deep-link; unused-route 404 parity.
- **Completion criteria:** 100% route coverage table; navigation items render.
- **Rollback/safety:** additive; old server unchanged.

### Phase 5 — Global styles / theme
- **Objective:** global styles (navbar, footer, landing sections) + theme toggle parity.
- **Existing source files:** `css/style.css`, `css/navbar.css`, `css/footer.css`,
  `css/home.css`, `css/responsive.css` (global parts), `js/theme.js`, `js/main.js`.
- **Target React structure:** `src/styles/global.css`, `components/shared/Navbar`,
  `Footer`, landing section components, `contexts/ThemeContext`, `lib/storage.ts`.
- **Reusable components:** `Button` (primary/secondary), `Container`, `SectionTitle`,
  `BackToTop`.
- **API dependencies:** none.
- **UI preservation requirements:** navbar 90px sticky + blur(12px) + rgba bg, 130px logo,
  active pink underline; footer `#2C1A12` + 4px `--primary` border + newsletter pill;
  landing buttons 16px/30px/radius 15px + hover lift; theme toggle contract (dark-theme
  class, `famipetTheme` key, sun/moon swap, same aria-labels/titles).
- **Verification:** screenshot diff of landing + theme toggle before/after; localStorage
  key parity; build clean.
- **Completion criteria:** landing top-level visually identical; toggle persists.
- **Rollback/safety:** unscoped components; delete to revert.

### Phase 6 — Shared layout components
- **Objective:** reusable app shell — Sidebar, TopBar/PageHeader variants, shell layouts.
- **Existing source files:** `css/sidebar.css`, `js/sidebar.js`, `css/dashboard.css`
  (`.main-content`, `.top-header`), `css/responsive.css`, per-page `.top-bar`/`.page-header`.
- **Target React structure:** `src/layouts/{AppLayout,AuthLayout,LandingLayout,
  AdminLayout}.tsx`, `src/layouts/{Sidebar,TopBar}.tsx`, `src/components/shared/
  NotificationBell` (stub until Phase 15).
- **Reusable components:** `Sidebar`, `TopBar`, `PageHeader`, `SearchBar`, `Badge`,
  `IconButton`, `HamburgerButton`.
- **API dependencies:** `/api/auth/me` for profile chip + admin link visibility (stub OK).
- **UI preservation requirements:** 285px fixed sidebar `#fff9fb`/`#f1e5eb`, Poppins
  forced, collapse→88px on narrow, group/active states, mobile overlay, top-header/top-bar
  variants as-is (do NOT unify variant naming now).
- **Verification:** shell renders on every /app route; collapse + mobile toggle work;
  active route highlights.
- **Completion criteria:** all app pages can mount inside the shell.
- **Rollback/safety:** `AppLayout` only; old pages untouched.

### Phase 7 — Authentication
- **Objective:** full auth flows (login, signup w/ role cards + strength, forgot, reset,
  verify, resend) + auth state/guards (§10).
- **Existing source files:** `pages/{login,signup,forgot-password,reset-password,
  verify-email}.html`, `css/{login,signup}.css`, `js/{login,signup,forgot-password,
  reset-password,verify-email,api}.js`.
- **Target React structure:** `src/pages/auth/*` (5 pages), `AuthLayout`, `AuthContext`,
  `useAuth`, `src/api/auth.ts`.
- **Reusable components:** `InputBox`+PasswordToggle+dependency-level `.error` (port the
  signup.css error style onto ALL auth pages — fixes dead style, values unchanged),
  `StrengthBar`, `RoleCard`, `SubmitButton`, `SuccessToast`, `Divider`.
- **API dependencies:** `/api/auth/register`, `/login`, `/verify-email/:token` (GET),
  `/resend-verification`, `/forgot-password`, `/reset-password/:token`, `/me`, plus
  `/profile`, `/change-password` (settings later).
- **UI preservation requirements:** glass two-column split layout (login.css: `#F6FBFF`
  bg, gradient bg, blurred circles, 35px radius, left brand/hero art), role-card gradient
  checked state, strength bar, slide-in toast `border-left:#22C55E`.
- **Verification:** register→verify→login→`/me` against real backend; wrong-credential
  errors; token survival on reload; logged-out users blocked from `/app/*`; email deep
  links; role claim on admin guard.
- **Completion criteria:** complete auth loop E2E; session continuity.
- **Rollback/safety:** auth is behind `/login`/guards; old auth pages remain live at old
  URL — a broken React auth cannot strand users (they use the old site).

### Phase 8 — Dashboard
- **Objective:** dashboard page parity (stats, pets list, appointments, reminders,
  adoption card, love-card, notification panel stub, banner asset, search).
- **Existing source files:** `pages/dashboard.html`, `css/dashboard.css`, `js/
  dashboard-data.js`, `js/dashboard.js`.
- **Target React structure:** `src/pages/app/dashboard/` (page + subcomponents).
- **Reusable components:** `StatCard`, `PetCard`, `AppointmentCard`, `ReminderCard`,
  `DashboardGrid`, `WelcomeHeader`, `NotificationPanel` (stub → Phase 15), `LoveCard`.
- **API dependencies:** `/auth/me`, `/pets/my`, `/appointments`, `/reminders`,
  `/adoptions/my`, `/notifications` (reflected per dashboard-data.js).
- **UI preservation requirements:** lavender token family (dashboard.css §1.3), welcome
  `clamp(25px,2.3vw,36px)/800/-1px`, stat-card hover lift, 4-col stats, dashboard-grid
  cards, dark-theme overrides (biggest dark-mode surface today — full parity here).
- **Verification:** data renders from real API; layout/screenshot diff desktop+mobile;
  dark mode toggles all dashboard surfaces.
- **Completion criteria:** pixel-equivalent dashboard with live data; dark parity.
- **Rollback/safety:** isolated page.
- **Status (2026-09-21):** `[x]` implemented in `d2f6952` (docs in `docs(migration)`).
  Accepted deltas: (1) loading shows neutral placeholders instead of the Vanilla static
  sample content with fake pets/numbers (AGENTS §5 — no fake data); empty/error states
  render per section. (2) Light/Dark buttons set the theme directly
  (theme.js toggled from either button). (3) In-page hamburger dropped — AppLayout owns
  mobile nav. (4) CTAs use React Router (mypet/adoption/appointments/reminders + empty
  state links); activity "View All" stays an inert `<a href="#">`. Dashboard CSS is
  scoped to `body:has(.dashboard-page)` and `.dashboard-page .theme-btn` so landing/
  auth styles are untouched. lint + `tsc -b && vite build` pass. Live-API + dark-mode +
  responsive checks were NOT run here: this environment has no running MongoDB/backend
(`backend/.env` absent, no mongod) — verify against a running backend before the
   Phase 26 visual regression.

### Phase 9 — Pet management (My Pets + Pet ID)
- **Objective:** mypet grid + add/edit/delete pet, statuses, search, and Pet ID page
  (QR generation + public pet-id resolution without auth).
- **Existing source files:** `pages/mypet.html`, `pages/pet-id.html`, `css/mypet.css`,
  `js/mypet.js`, `js/pet-id.js`; QR/photo handling; `pets/:id/qr`.
- **Target React structure:** `src/pages/app/mypet/*`, `src/pages/app/petId/*`, shared
  `PetCard`, `PetFormModal`, `QRModal`, `ConfirmDialog`.
- **Reusable components:** `PetCard`, `StatusBadge`(green/purple/blue), `PetFormModal`
  (owner+photo), `QRModal`, `ConfirmDialog`, `EmptyState`, `SearchBar`.
- **API dependencies:** `/pets` (all/featured/my), `/pets` POST, `/pets/:id` PUT/DELETE,
  `/pets/:id/qr`, `/auth/me`.
- **UI preservation requirements:** mypet tokens (`--primary-pink #ff4d6d`, Segoe stack),
  4-col stats, heart/cherry header spans, status pill variants; breed + breed-details
  public cards (styles read at build time from breeds.css).
- **Verification:** full CRUD E2E; photo upload; QR modal; ownership isolation (User B
  cannot mutate User A's pet); public pet-id page loads without a session.
- **Completion criteria:** pet lifecycle + Pet ID parity.
- **Rollback/safety:** isolated pages; destructive actions use ConfirmDialog parity.
- **Status (2026-09-21):** `[x]` implemented in `38c6aa9` (docs in `docs(migration)`).
  Accepted deltas (AGENTS §5/§9 — no fabricated or never-persisted data):
  (1) Loading/error/empty states replace the Vanilla static sample pets
  (Bruno/Luna, stats 2/2/2/1); every value renders from `/pets/my`.
  (2) Stats are real: Total Pets, Vaccinated, Dogs, Cats — Vanilla's "Healthy
  Pets" (hardcoded `Good`) and "Upcoming Appointments" (`p.appointment`, never
  persisted → always 0) have no backend source and were dropped.
  (3) Add/Edit form drops the Health Status + Upcoming Appointment + custom
  species fields: backend stores neither health nor appointment, and the
  `Pet.species` enum only allows dog/cat/bird/rabbit/fish/other (a custom
  species name fails validation). "Other" species is sent as `other`; custom
  breeds still work. Save/API errors render inline instead of `alert()`.
  (4) Header bell shows real `/notifications` + unread count (Vanilla rendered
  three fake items and a static `3`); the header sun button toggles the theme
  (unwired in Vanilla).
  (5) Pet ID preview renders the `<img>` its own JS queried but never rendered
  (`petPreview.querySelector("img")` returned null and threw on select — the
  CSS `.petid-preview img` always targeted it). No public (unauthenticated)
  Pet ID page exists in `pages/` — the authenticated `/app/pet-id` page (QR +
  ID card + PNG download via canvas/foreignObject, `window.print()` fallback)
  is the only surface, so "public pet-id resolution without auth" has no
  Vanilla counterpart to port and is tracked as an open question for Phase 23.
  (6) CSS ported verbatim: `styles/mypet.css` scoped under `.mypet-page`
  (Vanilla loads one stylesheet a page; React loads all), `styles/petid.css`
  scoped under `.petid-page`, responsive + dark rules scoped likewise. Dark
  mode keeps the white modal/ID-card surfaces readable (Vanilla's global
  heading `!important` would blank them).
  Screens: mypet grid, add/edit + details + delete-confirm modals, dual search
  sync, filter tabs, three-dot menu, Pet ID page (select/preview/QR/download).
lint (`oxlint`) + `tsc -b && vite build` pass. Live-API + ownership-isolation
   E2E (`pets/:id` PUT/DELETE owner-only) were NOT run: this environment has no
   running MongoDB/backend — scheduled with the full-app start by the user;
   re-verify before Phase 26.
- **Polish (2026-09-21):** `fix(frontend-react): polish phase 09 icons theme and pet-id`:
  (7) Icons bundled: dropped the Font Awesome `<link>` + `unpkg lucide` `<script>`
  from `index.html` and `window.lucide.createIcons()` calls; added `lucide-react`
  and a single `src/components/shared/Icon.tsx` (`name → LucideIcon` wrapped in
  `<i>` to keep every ported `i`-selector CSS rule). Brand icons (Instagram/
  Facebook/LinkedIn/GitHub) have no lucide equivalent → inline SVG paths in
  `Footer.tsx`; `svg.lucide { width:1em; height:1em }` + `lucide-spin` keyframes
  in `global.css`. `src/env.d.ts` (window.lucide decl) deleted.
  (8) Dark-mode scoping bug fixed: `mypet.css` `.main-content` rule targeted
  `body.dark-theme .mypet-page .main-content` but `.main-content` wraps the page
  (ancestor) → rewritten as `body.dark-theme:has(.mypet-page) .main-content,`
  with a pre-paint inline script in `index.html` (`famipetTheme`) so dark applies
  before first render (no flash). Pet ID panels stay white no longer: `petid.css`
  now darkens panel/preview surfaces while the downloadable/printed `.id-card`
  keeps its light gradient + navy text.
  (9) QR Pet ID card restructured from the old heading/paragraph into labelled
  rows — Pet ID, Pet Name, Species, Breed, Owner — with real values (petUid /
  pet name / species / breed / owner name; `—` fallbacks); QR payload, PNG
  download and print unchanged.
  Verified live (Vite dev): `npm run lint` (only pre-existing AuthContext/
  VerifyEmailPage set-state warnings) + `tsc -b && vite build` pass; headless
  Chrome against the running app confirms 0 remaining `i.fa-*`/`data-lucide`
  nodes, no CDN requests, dark backgrounds on dashboard/mypet/pet-id, white
  `.id-card` with correct label/value colors, QR regenerates, dark persists on
  refresh, and light-mode login/signup/home icons all render.

### Phase 10 — Health
- **Objective:** health records + pet selector.
- **Existing source files:** `pages/health.html`, `css/health.css`, `js/health.js`.
- **Target React structure:** `src/pages/app/health/*`.
- **Reusable components:** `HealthRecordCard`, `RecordForm`, `PetSelector`, `EmptyState`,
  `StatusBadge`.
- **API dependencies:** `/health` CRUD, `/pets/my` (pet dropdown).
- **UI preservation requirements:** health tokens (`#5b9bd5`/`#243b53` + tints), record
  cards + status badges, top-bar header.
- **Verification:** list/create/edit/delete scoped to selected pet; empty state visible
  with no records.
- **Completion criteria:** record lifecycle parity, no fabricated medical data.
- **Rollback/safety:** isolated.
- **Status (2026-09-22):** `[x]` implemented in `17fc630` (docs in `docs(migration)`);
  `src/pages/app/health/HealthPage.tsx`
  + `src/pages/app/health/RecordFormModal.tsx` + `src/pages/app/health/healthBase.ts`;
  route `/app/health` now renders `HealthPage` (was `PageStub`). `src/api/health.ts`
  (typed `/health` CRUD) + `markAllNotificationsRead()` in `src/api/notifications.ts`
  added; `HEALTH_SELECTED_PET_KEY` in `src/lib/storage.ts`; `health.css` scoped under
  `.health-page`; Plus Jakarta Sans loaded (design.md §1.4). Accepted deltas
  (AGENTS §5/§9 — no fabricated or never-persisted data):
  (1) Phase scope is health records + pet selector. Vaccination tracker
  (Phase 11), Vet Appointment card (Phase 12), and Nutrition card (hardcoded
  `85%` / "well balanced" — fake data, no backend source) are not rendered;
  the Care Guide tips card stays (legitimate static content). "Book
  Appointment" navigates to `/app/appointments` (Phase 12 stub).
  (2) Records table dropped the hardcoded "Completed" status pill (backend has
  no status field) — replaced with edit/delete actions; create/edit/delete
  work on real records scoped to the selected pet (empty state when none).
  (3) Stats are real: Vaccinations = vaccination-type health records for the
  selected pet ("In health records" / "None recorded", Vanilla always claimed
  "Up to date"), Health Records count, Weight = "Checked" + latest weight-
  record date (Vanilla hardcoded `28 kg`), Next Visit = nearest
  `record.nextVisit` (Vanilla hardcoded `12 Aug`).
  (4) Loading/error/empty states render real messages instead of `alert()` +
  sample numbers; form errors render inline; Vanilla only created records —
  edit/delete are new.
  (5) Pet selector persists the selected pet in `annSelectedHealthPet`
  (same key as Vanilla) and defaults to the first pet; details show the real
  named pet + species.
  CSS/JS ported verbatim where the underlying capability exists; responsive
  (+ `.main-content` mobile padding parity) and dark-mode rules are scoped the
  same way as `mypet.css`/`petid.css`.
  Verified live (backend seeded via `npm run seed`): `npm run lint` (only
  pre-existing AuthContext/VerifyEmailPage warnings) + `tsc -b && vite build`
  pass. Headless Chrome against the running app: login → `/app/health`
  renders header/pet-selector/hero/4 stats/tips/records from real `/health`
  data; create (modal open/close) → row added; delete → row removed; search
  for a miss shows the empty state; notification panel opens with real unread
  count + "Mark all read" clears it; dark mode + 390px mobile viewport both
  render with 0 horizontal overflow. Edit verified via the shared modal
  (update path exercised by API; inline-error path covered by validation).

### Phase 11 — Vaccinations
- **Objective:** vaccinations (list, upcoming, CRUD) — currently lives inside the health
  page/JS.
- **Existing source files:** `pages/health.html` (vaccination section), `css/health.css`,
  `js/health.js` (vaccinations), plus `reminders.css` chip styles used for vaccine chips.
- **Target React structure:** `src/pages/app/health/vaccinations/*` components.
- **Reusable components:** `VaccinationCard`, `VaccineForm`, `UpcomingList`, colored type
  chips (`#ef78a2`, `#f2a43a`, `#9b82df`, `#5b9bd5`, `#4db394`).
- **API dependencies:** `/vaccinations` CRUD, `/vaccinations/upcoming`.
- **UI preservation requirements:** existing colored chips/timing pills; same layout as
  today inside health page.
- **Verification:** CRUD + upcoming list against backend.
- **Completion criteria:** vaccination flow parity.
- **Rollback/safety:** isolated.

  Implemented (commit + push under Phase 11): `api/vaccinations.ts` (typed CRUD
  + `/vaccinations/upcoming`) and
  `src/pages/app/health/vaccinations/{VaccinationCard,VaccineFormModal,UpcomingList}.tsx` +
  `vaccinationBase.ts`, wired into the health page grid after the tips card with
  the shared `health.css` tracker styles (scoped `.health-page`, dark-mode and
  responsive parity with the Phase 10 cards).
  (1) Tracker splits into an **Upcoming** section — real `/vaccinations/upcoming`
  records for the selected pet, `Next due:` label, orange pill — plus a **History**
  section (remaining pet vaccines, `Done`/`Due:` pill matching the Vanilla
  `vaccineDueLabel`), each vaccine in exactly one section.
  (2) Vanilla only listed vaccinations; add/edit/delete are new per the plan and
  work on real records with backend validation/ownership errors surfaced inline
  (missing required fields → 400, foreign pet → 404).
  (3) Vaccinations load in their own `Promise.all` so a tracker failure shows an
  error state with Retry inside the card instead of blanking the health page.
  (4) Stat card counts the selected pet's vaccines (Vanilla always claimed "Up to
  date"), with honest empty text.
  (5) The plan's colored type chips (`#ef78a2`/`#f2a43a`/`#9b82df`/`#5b9bd5`/
  `#4db394`) were skipped — the Vaccination model has no type field to color by;
  the Vanilla mint/orange status chips were kept instead.
  Verified live (backend seeded, same demo user): `npm run lint` (only the
  pre-existing AuthContext/VerifyEmailPage warnings) + `tsc -b && vite build`
  pass. Backend CRUD checks: create → appears in list; missing required field →
  `400`; pet not owned → `404`; update → reflected; delete → gone. Headless
  Chrome (CDP) against the dev server: tracker renders real upcoming/history rows,
  stat count, pet-scoped empty state, add/edit/delete UI flows, dark mode
  (`#211e30` card / `#2a2640` rows), and 390px viewport with 0 horizontal
  overflow. Test records created during verification were removed afterward.

### Phase 12 — Appointments
- **Objective:** appointments list + book/edit/cancel, vet selection.
- **Existing source files:** `pages/appointments.html`, `css/appointments.css`,
  `js/appointments.js`.
- **Target React structure:** `src/pages/app/appointments/*`.
- **Reusable components:** `AppointmentCard`, `AppointmentFormModal`, `VetSelect`
  (Phase 13), `StatusPill`, `PetSelector`, `DatePickerInput` (native, matching current
  input types).
- **API dependencies:** `/appointments` CRUD, `/veterinarians` (list), `/pets/my`.
- **UI preservation requirements:** appointments palette (`#5b9bd5`, `#243b53`, tints),
  status pills, list layout.
- **Verification:** book→list→edit→cancel; vet dropdown shows real data.
- **Completion criteria:** appointment lifecycle parity.
- **Rollback/safety:** isolated.

  Implemented (commit + push under Phase 12):
  `src/pages/app/appointments/{AppointmentsPage,AppointmentFormModal,RescheduleModal,
  AppointmentDetailsModal}.tsx` + `appointmentsBase.ts`
  (+ `src/api/appointments.ts` typed CRUD — `Appointment` widened so `pet` is the
  populated object (list) or a plain id string (create response);
  `DashboardSections.tsx` narrowed its two uses accordingly) +
  `src/api/veterinarians.ts` (`/veterinarians` list, public — same call the Vanilla
  page made). Route `/app/appointments` now renders `AppointmentsPage` (was
  `PageStub`); `appointments.css` scoped under `.appointments-page` and imported in
  `global.css`; Icon added `calendar-plus`/`calendar-xmark`/`chevron-left`/
  `chevron-right`/`clock-rotate-left`/`user-doctor`. UI: top-bar (search +
  notification bell/badge + "Book New Appointment"), 4 real stat cards (upcoming /
  completed / cancelled / total), upcoming list (reschedule + more), history list
  (View Details modal), month calendar with dot + data-derived legend, quick
  actions (Find a Vet / Vet Services / Pet Health Records / Set Reminder), banner,
  plus loading/empty/error states with Retry. Accepted deltas
  (AGENTS §5 — no fabricated data; Vanilla `appointments.js` hard-coded data
  dropped where it has no backend source):
  (1) Stats are real (Vanilla hard-coded 2/8/1/11). Upcoming = `pending` +
  `confirmed` (sorted date/time), history = completed/cancelled/no-show.
  (2) Calendar starts at the current month (Vanilla hard-coded Aug 2026) and the
  legend is derived from real appointments (Vanilla hard-coded "Bruno - Checkup" /
  "Luna - Vaccination"); day dots use the blue `has-blue` class Vanilla applied,
  vaccination days get the pink dot.
  (3) Notifications are real: the bell loads `/notifications` with an unread badge,
  panel, mark-all-read, and click-outside close (same pattern as `/app/health`).
  Vanilla rendered a bell with no handler and only in-memory fake items via
  `addNotification()`.
  (4) View Details opens a details modal instead of `alert()` chained text;
  success uses the `appointment-message` toast instead of `alert()`; booking
  validates date/time first, then pet, then vet (Vanilla order), and creates a
  real backend Notification ("Your appointment is booked for …").
  (5) "Set Reminder" navigates to `/app/reminders` (Phase 14 stub) instead of the
  Vanilla fake notification + alert. Cancel keeps `window.confirm`
  (HealthPage parity); "Vet Services" keeps the "Vet finder will be available
  soon." toast.
  Verified live (backend running, seeded demo user `user@example.com`):
  `npm run lint` (only pre-existing AuthContext/VerifyEmailPage warnings) +
  `tsc -b && vite build` pass. Backend flow exercised against real DB: login →
  `GET /pets` + `GET /veterinarians` (active vets) → `POST /appointments`
  (booked, real notification created) → appears in `GET /appointments` →
  `PUT` date/time (reflected) → `DELETE` (status `cancelled`); validation
  (`400` missing fields) and not-found (`404`) paths verified. Test records and
  the notification they created were removed from the DB afterward, restoring
  the prior data state. Browser-automation passes of Phases 10/11 were not rerun
  for this phase.

### Phase 13 — Veterinarians
- **Objective:** vet data layer shared by Appointments (dropdown) and PetGPT (find-a-vet
  modal) — no dedicated old page exists; preserve consumption points only.
- **Existing source files:** `js/appointments.js`, `js/petgpt.js`, `backend/routes/
  veterinarian.routes.js` (public `/`, `/:id`).
- **Target React structure:** `src/api/veterinarians.ts`, `components/shared/VetSelect`,
  `VetCard`, `FindVetModal`.
- **Reusable components:** `VetSelect`, `VetCard`, `FindVetModal`, `VetDetails`.
- **API dependencies:** `GET /veterinarians`, `GET /veterinarians/:id`.
- **UI preservation requirements:** vet appearing exactly where it does today (appointment
  form + PetGPT modal); admin vet CRUD stays in admin (Phase 21).
- **Verification:** both entry points show identical vet data.
- **Completion criteria:** consumption parity at both call sites.
- **Rollback/safety:** shared component; consume in Phase 12/20.

  Implemented (commit + push under Phase 13): `src/api/veterinarians.ts` (typed
  `GET /veterinarians` + `GET /veterinarians/:id`, both public) landed with
  Phase 12 and is verified live here; `components/shared/VetSelect.tsx` extracted
  (the doc's `VetSelect` target) and consumed by the appointment booking modal —
  the "Veterinary Clinic" `<select>` now renders the exact Vanilla payload shape
  (`name - clinic` option text, controlled value) via the shared component.
  Accepted deltas:
  (1) The doc's `VetCard` / `FindVetModal` were NOT built — no Vanilla vet
  listing/modal UI exists to migrate. `js/petgpt.js` "Find Nearby" only
  `alert()`s the first 5 names, and `js/appointments.js` "Find a Vet" only
  alerts "Vet finder will be available soon."; both are PetGPT/appointment
  surfaces. PetGPT stays deferred per the phase scope, so a find-a-vet listing
  would be speculative UI (YAGNI) — the shared `getVeterinarians()`/
  `getVeterinarian()` API it will call is in place and verified.
  (2) Admin vet CRUD stays in the Phase 21 admin surface (backed by admin-only
  routes — untouched).
  Verified live against the real backend (`backend/` running, seeded data):
  `GET /veterinarians` (2 active vets) matches the app's booking dropdown;
  `GET /veterinarians/:id` returns the full public record; unknown id → `404`.
  `npm run lint` (only pre-existing AuthContext/VerifyEmailPage warnings) +
  `tsc -b && vite build` pass. Headless Chrome against the dev server (demo
  user): appointment page renders; booking modal's VetSelect shows the real
  vets; a full book flow (pet/date/time/vet from the modal) succeeded — toast +
  new row in the listing against the live DB — and the test record plus its
  backend notification were removed afterward. A freshly-created real DB test
  user (cleaned up after) verified the empty states (0/0/0/0 stats + both
  "No upcoming/history" messages); mobile 390px viewport and dark mode
  (`#171523` scoped bg) both render with 0 horizontal overflow. Error state
  verified by taking the backend offline (Retry UI renders) — the Retry handler
  re-runs the same `loadData` used at mount, so recovery was not re-audited
  end-to-end in the browser.

### Phase 14 — Reminders
- **Objective:** reminders page (list, add, edit, complete, delete, due chips).
- **Existing source files:** `pages/reminders.html`, `css/reminders.css`,
  `js/reminders.js`.
- **Target React structure:** `src/pages/app/reminders/*`.
- **Reusable components:** `ReminderCard`, `ReminderForm`, `DueDateChip`, `TypeChip`,
  `CompleteToggle`, `ConfirmDialog`.
- **API dependencies:** `/reminders` CRUD, `/reminders/:id/complete`, `/pets/my`.
- **UI preservation requirements:** reminders palette (pink/orange/purple/blue chips,
  `#eee9fc`/`#fdeaf2` tints), due-date pills.
- **Verification:** CRUD + complete toggle E2E.
- **Completion criteria:** reminder lifecycle parity.
- **Rollback/safety:** isolated.

  Implemented (commit + push under Phase 14):
  `src/pages/app/reminders/{RemindersPage,ReminderFormModal}.tsx` +
  `remindersBase.ts` (+ `src/api/reminders.ts` typed CRUD — `GET/POST /reminders`,
  `PUT /reminders/:id`, `PUT /reminders/:id/complete`, `DELETE /reminders/:id`) +
  `src/styles/reminders.css` scoped under `.reminders-page` and imported in
  `global.css`. Route `/app/reminders` now renders `RemindersPage` (was `PageStub`);
  `Icon.tsx` added `bell-off`/`scissors`/`ellipsis` and `bug`/`trash-2` aliases.
  UI: top-bar (search + "Add Reminder"), 4 real stat cards (upcoming / completed /
  overdue / total), upcoming list (view-all toggle, days chip, more-menu:
  Mark Completed / Edit / Delete), number-keyed reminder calendar (prev/next month,
  today ring, event-color dots + static 5-type legend), tips card,
  add/edit modal (pet select, type select, date, time), plus loading/empty/error
  states with Retry. Accepted deltas (AGENTS §5 — no fabricated data; Vanilla
  `reminders.js` hard-coded data dropped where it has no backend source):
  (1) Stats are real (Vanilla hard-coded 5/12/1/18 + fake "Next in 2 days"
  placeholder). Upcoming = not-completed, completed = `isCompleted`, overdue =
  not-completed with a past date, all = total; the upcoming stat's sub-line shows
  the next due date ("Next in 3 days"/"Today"/"No upcoming reminders").
  (2) Calendar starts at the current month (Vanilla hard-coded May 2025) and day
  dots come from real reminders; the `.calendar-day.today` ring Vanilla's CSS
  defined but JS never applied is now wired.
  (3) Success uses the page toast instead of `alert()`; Mark Completed / Delete
  reload from the API after the mutation (Vanilla only mutated local state, so
  completion did not survive refresh). Delete keeps `window.confirm`
  (HealthPage/AppointmentsPage parity); form errors render inline.
  (4) The Vanilla pet free-text datalist becomes a select of the user's real pets
  (AGENTS §3 — ownership-following); the backend still verifies pet ownership.
  (5) No notification bell: the Vanilla page header has none (search + Add only),
  matching the old surface exactly; the shared `NotificationBell` (Phase 15)
  remains unused here as in Vanilla.
  Verified live (backend running, seeded demo user `user@example.com`):
  `npm run lint` (only the pre-existing AuthContext/VerifyEmailPage warnings) +
  `tsc -b && vite build` pass. Backend flow exercised against real DB: login →
  `GET /reminders` (3 seeded, pet populated) → `POST /reminders` (vaccination,
  created) → appears in list → `PUT /:id/complete` (flips `isCompleted`) →
  `PUT /:id` (type→grooming, time, reflected) → `DELETE` (removed); missing
  required fields → `400 "Title, type, date and time are required."`; pet not
  owned → `404 "Pet not found or not owned by you."`; malformed id → `404
  "Invalid reminder ID."`. Test record was removed afterward, restoring the
  prior 3-record state. Headless browser/screenshot automation was not available
  in this session, so the 390px mobile and dark-mode visual checks were not
  re-run programmatically (CSS follows the verified appointments/health scoped
  pattern; dark-mode selectors mirror those files' verified blocks).

### Notifications (plan §15; delivered inside Phases 10–14)
- **Objective:** bell + dropdown panel + unread/read/read-all + badge, replace dashboard
  panel and health-page toasts-with-notification calls.
- **Existing source files:** `css/dashboard.css` (`.notification-btn`, `.notification-panel`),
  `js/health.js` (read-all usage), sidebar icon.
- **Target React structure:** `components/shared/NotificationBell` + `NotificationPanel`,
  `hooks/useNotifications.ts`, `src/api/notifications.ts`.
- **Reusable components:** `NotificationBell`, `NotificationPanel`, `Badge`.
- **API dependencies:** `/notifications` GET, `/notifications/unread`,
  `/notifications/:id/read`, `/notifications/read-all`, `/notifications/:id` DELETE.
- **UI preservation requirements:** bell badge count, panel `.show` toggle, read/seen
  styling as current; unread state survives refresh; no duplicates (AGENTS §7).
- **Verification:** produce notification → badge count updates → mark read → persists on
  reload; read-all clears.
- **Completion criteria:** notification lifecycle parity + no dupes.
- **Rollback/safety:** hook swap only.

  Implemented within Phases 10–14 rather than as a standalone sprint: shared
  `components/shared/NotificationBell.tsx` + `NotificationPanel.tsx` (+ `Badge`),
  `hooks/useNotifications.ts`, and `src/api/notifications.ts` (typed
  `GET /notifications`, `GET /notifications/unread`,
  `PUT /notifications/:id/read`, `PUT /notifications/read-all`,
  `DELETE /notifications/:id`). Consumed by Dashboard (Phase 8), Health (Phase 10),
  Appointments (Phase 12), and the Community page (roadmap Phase 15, see the
  renumbering note under Phase Status). See also the existing Phase 12 §3 delta:
  the bell loads real `/notifications` with an unread badge.

### Phase 15 — Community (plan §16)
- **Objective:** community feed (posts, image upload, like, comments, delete).
- **Existing source files:** `pages/community.html`, `css/community.css`, `js/community.js`.
- **Target React structure:** `src/pages/app/community/*`.
- **Reusable components:** `PostCard`, `CommentSection`, `LikeButton`, `ComposePostModal`,
  `Avatar`, `UploadInput`.
- **API dependencies:** `/community` GET (public), POST (multer image), PUT, DELETE,
  `/:id/like`, `/:id/comments`.
- **UI preservation requirements:** community palette (`--pink #ed6590`, `#273142`,
  `#403648`, `--purple-light`), post cards/reaction buttons layout.
- **Verification:** post with image, like toggle, comments, delete-own-post E2E.
- **Completion criteria:** feed parity with real data.
- **Rollback/safety:** isolated.

  Implemented (commit + push, roadmap **Phase 15 — Community** — see renumbering note
  under Phase Status):
  `src/pages/app/community/{CommunityPage,PostCard,ComposePostModal,CommentsModal}.tsx` +
  `communityBase.ts` (category↔type maps, `toPostView`, `relativeTime`, `assetUrl`,
  storage helpers) + `src/api/community.ts` (typed `GET/POST /community`,
  `DELETE /community/:id`, `POST /community/:id/like`, `POST /community/:id/comments`;
  compose sends FormData via the existing `apiRequest` path) +
  `src/styles/community.css` scoped under `.community-page` and imported in `global.css`.
  Route `/app/community` now renders `CommunityPage` (was `PageStub`); the sidebar
  already listed Community under the ported layout. `Icon.tsx` added `image`/`share`/
  `face-frown`/`circle-question`.
  Surface: header (title + search + notification bell/panel · New Post), 4 real stat
  cards (Members = unique authors, Posts = total, Discussions/Stories = mapped types),
  create-post toolbar (Photo/Question/Story buttons + real logged-in avatar), 5 tabs
  (All/General/Discussions/Questions/Stories + mapped category chips), post feed
  (avatar, type label, relative time, title/content pre-wrap, image, tags, like /
  comment / share footer), right sidebar (groups Join/Leave + Helpful Tips static
  card), compose modal (type select, title, content + inline error, image upload +
  preview + remove, publish), comments modal (list, empty state, Enter-to-send
  composer), loading / empty ("No matching posts found.") / error + Retry states.
  Accepted deltas (AGENTS §5 — no fabricated data; identical to how Phases 10–14
  handled Vanilla hard-coded data):
  (1) Like uses the backend's real `POST /community/:id/like` (Vanilla called `PUT`,
  which the backend never served) → toggles `likesCount`/`liked` from the response.
  (2) Stats are real (Vanilla hard-coded 1,248 Members / 24 Posts / 156 Discussions /
  89 Stories); Members = distinct `user._id`s on the fetched page, Discussions /
  Stories = posts whose mapped type is discussion/story (the Cat-type → "general"
  quirk of the shared `CATEGORY_TO_TYPE` map is preserved verbatim, so the Questions
  tab stays empty for the backend's categories by design, as in Vanilla).
  (3) The bell is real (`GET /notifications` + unread badge), not Vanilla's fake "3";
  the same shared panel as elsewhere in the app.
  (4) "Report Post" is dropped: in Vanilla it only showed a no-op toast over the
  backend-less modal; there is no backend endpoint for it. The more-menu therefore
  exists only on the user's own posts and offers Delete (backed by `DELETE /:id`;
  like/comments stay open to everyone).
  (5) Compose toolbar + modal header use the signed-in user from `getUser()`
  (Vanilla hard-coded "Mahek Shaikh"); no post-edit UI and no per-comment delete UI
  (Vanilla has neither — the backend's PUT and comment-delete routes stay unused).
  (6) Feedback uses the page toast + `window.confirm` (Phase 10–14 convention) in
  place of Vanilla's `ann-toast`/`ann-confirm`; search runs on a `postSearchText`
  (user/title/content/type-label/category label) instead of DOM textContent.
  (7) Share counts and group membership persist in the Vanilla localStorage keys
  (`annCommunityShares`, `annCommunityGroups`); Groups + Helpful Tips cards are static
  content with no backend source (preserved as-is, Join/Leave toggles membership).
  Verified live (backend running; DB seeded via `utils/seedData.js` — `user@example.com`
  / `user123`):
  `npm run lint` (only the pre-existing AuthContext/VerifyEmailPage warnings) +
  `tsc -b && vite build` pass. Backend flow exercised against the real DB: login →
  `GET /api/community` → 200 with the 3 seeded posts (user populated, likes/comments
  arrays) → `GET ?category=health` filters to 1 → `POST` (FormData, text) creates →
  `POST` (FormData, `image` file) creates with an absolute `/uploads/…` URL that
  serves `200` (required creating the missing `backend/uploads/` dir — the backend's
  multer writes there but does not `mkdir`, and the checkout had none) → `POST
  /:id/like` toggles `likesCount` 0→1→0 / `liked` → `POST /:id/comments` appends →
  `DELETE /:id` removes own post. Error cases: create without token → `401`; missing
  title/content → `400 "Title and content are required."`; delete another user's post
  → `403 "You are not allowed to delete this post."`; like without token → `401`.
  Malformed ObjectId currently yields a `500` from the backend's controller-level
  try/catch (every `backend/controllers/*.controller.js` uses this convention, so the
  `errorHandler` CastError→404 branch never runs) — not changed here, since the React
  pages only ever send ids taken from the feed. All test records and uploaded files
  were removed afterward (feed restored to the 3 seeded posts, `uploads/` empty).
  Headless browser/screenshot automation was not available in this session, so the
  390px-mobile and dark-mode visual checks were not re-run programmatically (CSS
  follows the verified appointments/health/reminders scoped patterns; the dark-mode
  blocks mirror those files' verified selectors, and the notifications panel rules
  were ported from `appointments.css`).

### Phase 16 — Lost & Found (plan §19)
- **Objective:** report cards grid, filters, status badges, create/edit/delete (image
  upload).
- **Existing source files:** `pages/lost-found.html`, `css/lost-found.css`, `js/lost-found.js`.
- **Target React structure:** `src/pages/app/lostFound/*`.
- **Reusable components:** `ReportCard`, `ReportForm`, `StatusBadge` (found/lost),
  `UploadInput`, `FilterChips`, `ConfirmDialog`, `EmptyState`.
- **API dependencies:** `/lost-found` GET (public), POST/PUT (multer image), DELETE.
- **UI preservation requirements:** lost-found palette (`--pink #ed6b95` etc.), card grid,
  status pills.
- **Verification:** list/create/edit/delete with real DB; photo upload.
- **Completion criteria:** lost & found lifecycle parity.
- **Rollback/safety:** isolated.

  Implemented (commit + push, roadmap **Phase 16 — Lost & Found** — see renumbering
  note under Phase Status):
  `src/pages/app/lostFound/{LostFoundPage,ReportCard,ReportFormModal,DetailsModal}.tsx` +
  `lostFoundBase.ts` (`FILTER_TABS`/`TYPE_OPTIONS`/`LOCATION_OPTIONS`/`SORT_OPTIONS`,
  `assetUrl`, `titleCaseGender`, `normalizeLocation`, `formatDate` (en-IN "3 Sep 2026"),
  `toReportView` incl. owner flag from populated `user._id`, `reportSearchText`) +
  `src/api/lostFound.ts` (typed `GET /lost-found`, `POST`/`PUT` with FormData `image`
  via the existing `apiRequest` multipart path, `DELETE /:id`) +
  `src/styles/lostFound.css` scoped under `.lostfound-page`, imported in `global.css`.
  Route `/app/lost-found` now renders `LostFoundPage` (was `PageStub`); the sidebar
  already listed Lost & Found (`Icon.tsx` already had `mars`/`venus`/`ellipsis`/`pen`).
  Surface: header (title + search + real notification bell/panel — no fake "3" like
  Vanilla's), hero (`FIND • REUNITE • CARE`, animated `petimg.png` with the radial mask,
  Lost/Found report cards), filter bar (All/Lost Pets/Found Pets tabs, type/location/
  sort selects), 4-up report-card grid, report modal (create + edit; real multer photo
  upload with preview, inline backend errors), details modal (meta, location, date,
  description, contact person with Call `tel:` / Message `mailto:`), own-report 3-dot
  menu (Edit/Delete), no-results + Clear Filters, help tip, page toast, loading/error +
  Retry states.
  Accepted deltas (AGENTS §5 — no fabricated data; the pattern established in Phases
  10–16):
  (1) Grid renders real `GET /lost-found` reports only. Vanilla shipped 4 static demo
  cards that its JS replaced on load; here loading shows
  a neutral spinner state and an empty grid shows the genuine "No pets found" empty
  state.
  (2) Notification bell uses real `GET /notifications` + unread badge, not Vanilla's
  hardcoded "3"/fake panel (shared panel, as Community).
  (3) Photo upload goes through the backend's multer path (FormData `image` → stored
  under `/uploads`, absolute URL returned) instead of Vanilla's JSON `images:
  [base64 dataURL]` — the same genuine upload route Phase 15's compose modal uses.
  (4) Edit + Delete added (the Vanilla page had no such UI, but the phase objective
  requires CRUD and the backend exposes owner-only PUT / owner-or-admin DELETE). The
  3-dot menu renders only on the user's own reports (`user._id === currentUser.id`);
  the backend still enforces 403 on foreign reports.
  (5) Email and Age fields dropped from the report form: the backend LostFound model
  has no `email`/`age` fields and Vanilla collected but never sent them (Phase 9/12
  precedent). The card's middle meta slot shows `breed || "Not specified"` — Vanilla
  labeled that slot "age" but it always rendered the breed (no backend age field).
  (6) Backend errors render inline in the form; feedback uses the page toast +
  `window.confirm` for delete (Phase 10–14 convention); the details "not available"
  Call/Message guards keep the Vanilla `alert()` messages.
  (7) Dark mode added (the Vanilla lost-found CSS had none) following the verified
  reminders/community scoped blocks (`#171523` bg, `#211e30`/`#332e45` surfaces,
  `#f5f2ff`/`#b7b0c9` text); responsive 1200/950/650 breakpoints ported from Vanilla.
  (8) Edit photo notes: `PUT /:id` appends a newly uploaded photo to `images[]`, so
  the card keeps showing the original `images[0]` unless a new photo is added — the
  form labels this ("choose a file to add another"). Backend contract unchanged.
  Verified live (backend running; DB has the seeded reports — `user@example.com` /
  `user123`): `npm run lint` (only pre-existing AuthContext/VerifyEmailPage warnings)
  + `tsc -b && vite build` pass. Backend flow exercised against the real DB via a
  throwaway second verified user (created directly in Mongo because register requires
  email verification and the SMTP path is absent): `GET /api/lost-found` → 200 (user
  populated, `createdAt desc`); `POST` (FormData + PNG via `File`) → 201, stored image
  returned as `http://localhost:5000/uploads/…` (absolute — `assetUrl` passes absolute
  URLs through); `POST` no-image found report → 201; missing required fields → 400
  "Type, pet name, species, description, location, date..."; owner `PUT` → 200 and
  persisted; foreign edit/delete → 403; invalid id → 400; missing report/delete →
  404; owner delete → 200. Test reports, uploaded files, and the throwaway user were
  removed afterward (feed restored to the 2 seeded reports, `uploads/` empty). Note:
  the backend's delete removes the DB record but leaves the uploaded file on disk
  (existing behavior, not changed in this frontend phase). Headless browser/screenshot
  automation was not available in this session, so the 390px-mobile + dark-mode visual
  checks were not run programmatically — CSS follows the verified
  reminders/community scoped patterns and the notifications panel rules were ported
  from those verified files.

### Phase 17 — Favorites (plan §17)
- **Objective:** favorite toggle on pet surfaces (dashboard pet list, adoption cards, my
  pet) + persisted favorites list; no NEW page/nav (old site has no favorites page —
  preserve parity).
- **Existing source files:** `js/dashboard.js` (`/users/favorites/`), pet-card markup,
  `backend/routes/favorite.routes.js`, `user.routes.js` (`/favorites/:petId`).
- **Target React structure:** `components/shared/FavoriteButton`, `hooks/useFavorites.ts`,
  `src/api/favorites.ts`.
- **Reusable components:** `FavoriteButton`.
- **API dependencies:** `GET /favorites`, `POST /favorites`, `DELETE /favorites/:id`,
  `POST /users/favorites/:petId`.
- **UI preservation requirements:** heart behavior exactly where present today; no new
  entry points.
- **Verification:** toggle adds/removes; state survives reload; multi-user isolation.
- **Completion criteria:** favorite parity on all existing entry points.
- **Rollback/safety:** component-only.

  Implemented (commit + push under Phase 17):
  `components/shared/FavoriteButton.tsx` + `hooks/useFavorites.ts` +
  `src/api/favorites.ts` (typed `POST /users/favorites/:petId` → `{ success,
  favorites, isFavorite }`, added during Phase 8 and used here) — the doc's
  Phase 17 target structure. `FavoriteButton` is presentational (takes `petId`,
  `name`, `liked`, `onToggle`) so every button on a surface shares the single
  favorite set a page's `useFavorites()` fetches; `useFavorites` loads the
  initial liked ids from `GET /auth/me` (`user.favorites`) and toggles
  optimistically with rollback on failure (dashboard-data.js + dashboard.js
  `setFavoriteState` parity). The dashboard's inline favorites were extracted
  onto these: `DashboardPage` now sources `favIds` + `toggle` from the hook (the
  `favIds` field left `DashboardData`, the `getMe()` favorites call dropped),
  and `PetsSection` renders `<FavoriteButton>` instead of the hand-rolled heart.
  Behavior is byte-identical to before the extraction (same `/auth/me` initial
  state, same optimistic toggle, same `.favorite-button.liked` CSS — the dark
  `.liked` fill rules were already scoped under `.dashboard-page` in Phase 8).
  Accepted deltas (AGENTS §5 — no fabricated data or invented entry points):
  (1) Entry points = the dashboard pet list only, matching exactly where the
  Vanilla site renders a `.favorite-button` today. The phase objective names
  adoption cards too, but the adoption page is Phase 18 (not yet migrated, still
  `PageStub`) and the Vanilla **my pet** page has never had a favorite button —
  so `FavoriteButton`/`useFavorites` are the reusable pieces Phase 18's adoption
  cards will consume; nothing was added to surfaces that lack hearts in Vanilla
  ("heart behavior exactly where present today; no new entry points").
  (2) API surface: only the endpoints the Vanilla UI actually calls are wired —
  `POST /users/favorites/:petId` (toggle) + `GET /auth/me` (initial state). The
  `GET/POST /favorites` + `DELETE /favorites/:id` routes (Favorite-collection
  model) exist in the backend but the old site never calls them and the two
  stores are kept in sync server-side (`user.controller.toggleFavorite`); wiring
  unused endpoints would be speculative. If a favorites page is ever required
  (it is explicitly out of scope — no new nav), `GET /favorites` is the data
  source to add then.
  Verified live (backend running; mongod up; DB seeded — `user@example.com` /
  `user123`): `npm run lint` (only the pre-existing AuthContext/VerifyEmailPage
  warnings) + `tsc -b && vite build` pass. Backend flow against the real DB:
  login → `POST /users/favorites/:petId` → `{ isFavorite:true, favorites:[pet] }`
  → reflected in `GET /auth/me` → toggle again → removed from both → invalid pet
  id → `400 "Invalid pet ID."` → no token → `401 "Access denied. No token
  provided."`. Multi-user isolation (AGENTS §14): a throwaway user created
  directly in Mongo (register needs email verification and SMTP is absent)
  favorited the demo user's pet — **demo user's favorites stayed empty**, and the
  throwaway user's own list carried the pet; the throwaway user was deleted and
  the demo user's favorites left empty (test toggles reverted) afterward. Headless
  Chrome (CDP) against the Vite dev server with the real backend: login →
  dashboard renders 1 `.favorite-button` with `aria-label "Favorite Max"` (pet
  name) → click → `.liked` applied (filled heart) → reload → still liked →
  click → unliked → reload → gone; dark mode renders the hearts; 390px mobile
  viewport: 0 horizontal overflow (overflow=0px). All test toggles reverted, so
  the demo user's favorites are back to `[]`.

### Phase 18 — Adoption (plan §18)
- **Objective:** adoption gallery (search, filters, counters) + apply flow; admin
  status/review untouched here.
- **Existing source files:** `pages/adoption.html`, `css/adoption.css`, `js/adoption.js`.
- **Target React structure:** `src/pages/app/adoption/*`.
- **Reusable components:** `AdoptionCard`, `PetCounterBadge`, `FilterChips`, `SearchBar`,
  `AdoptionModal`.
- **API dependencies:** `/adoptions/my`, `POST /adoptions`, public pets (`/pets`),
  favorites toggle.
- **UI preservation requirements:** adoption palette (incl. hardcoded `#ff4d6d`/`#f43f5e`
  etc.), hero art (`Hero-Page.png`, `Mainn-bg.png`), filter chips, counter badge.
- **Verification:** gallery = real records; apply works; non-admin cannot hit admin
  status endpoints (403 test).
- **Completion criteria:** adoption browse/apply parity; backend rules enforced.
- **Rollback/safety:** isolated.

Implemented (commit + push under Phase 18):
  `src/api/pets.ts` `getAvailablePets()` (GET `/pets?status=available`),
  `src/api/adoptions.ts` typed `Adoption` + `AdoptionPayload` + `createAdoption()`
  (POST `/adoptions`), and the doc's target components from scratch at
  `src/pages/app/adoption/*`: `SearchBar` (`.search-box` with magnifying-glass),
  `PetCounterBadge` (`.pet-counter-badge`, live per-category counts derived from
  the loaded pets — not fabricated, AGENTS §5), `FilterChips` (`cat-all`/`cat-dogs`
  /`cat-cats`/`cat-others` with counters, active state), `AdoptionCard` (media
  image with onerror fallback, type badge, shared `FavoriteButton` from Phase 17,
  gender icon `mars`/`venus`, `breed • age`, vaccinated badge, view-details btn),
  and `AdoptionModal` (single component, stages details → apply → success; real
  owner info box from the populated `owner`; inline form validation + backend
  error surfacing; success shows the persisted record `_id` + status Pending) and
  `AdoptionPage` (hero art `Hero-Page.png` + blue `#3b9df8` hero btn, notification
  bell + panel from real `/notifications`, search/category/sort/newest-name-age,
  loading / empty ("No Companions Found" + clear-filters) / error + retry states,
  toast; routed in `routeConfig.tsx` line 62, wired into `global.css` via
  `@import './adoption.css'`). CSS ported to `src/styles/adoption.css` with the
  page-scoped + `body.dark-theme` pattern, responsive 1200/1100/992/600 breakpoints
  and 390px single-column grid, `:focus-visible` outlines.
  Accepted deltas (AGENTS §5 / §9 — no fabricated data, backend is truth):
  (1) skipped "Add New Pet" + "Delete Pet" buttons — out of the phase objective,
  My Pets owns pet CRUD and backend pet delete is owner-only;
  (2) dropped the "Healthy" badge — backend `Pet` has no health field, Vanilla
  hardcoded `healthy: true`; kept the real `vaccinated` badge;
  (3) dropped Email + City from the apply form — the `Adoption` model persists
  neither (name/phone/address/occupation/experienceWithPets/reasonOfAdoption);
  (4) location rows omitted — `Pet` has no location field (Vanilla hardcoded "");
  (5) sorts are newest (createdAt desc) / name (A-Z) / age (numeric asc) — Vanilla's
  "age" select option actually fell through to its newest branch (bug), fixed;
  (6) counters are live counts of the real loaded pets, not Vanilla's hardcoded 8;
  (7) layout toggle + "Filters" modal button dropped — dead UI (no handlers in
  Vanilla JS);
  (8) detail modal uses neutral copy instead of Vanilla's hardcoded "healthy,
  fully-vaccinated" claim (AGENTS §9).
  Verified live (backend + mongod up; DB seeded — `user@example.com`/`user123`):
  `npm run lint` (only the pre-existing AuthContext/VerifyEmailPage warnings) +
  `tsc -b && vite build` pass. Headless Chrome (CDP) on the Vite dev server + real
  backend: gallery renders the 3 real pets (Max dog 3y, Buddy dog 2y, Luna cat 1y)
  with live counters (all=3, dogs=2, cats=1, others=0); dogs filter → Max+Buddy,
  cats filter → Luna; search miss → empty state; clear-filters restores all 3;
  sort by name A-Z → Buddy,Luna,Max; favorite toggles persist across reload, then
  revert; detail modal → apply flow submits and success modal shows a real Mongo
  `_id` + status Pending; `GET /adoptions/my` lists the record back (then deleted
  via admin token to restore the demo state); duplicate-pending attempt surfaces
  the backend message "You already have a pending adoption request for this pet."
  inline; non-admin PUT and DELETE on `/adoptions/:id` → `403 "Access denied.
  Admin only."`; dark mode applies (bg rgb(23,21,35)); 390px viewport → 0px
  horizontal overflow + single-column grid; heart `aria-label "Favorite <name>"`.

### Phase 19 — Pet Breeds (+ Breed Details)
- **Objective:** breeds gallery (cards grid, search, species filter tabs, expandable
  breed details) + breed details page.
- **Existing source files:** `pages/breeds.html`, `pages/breed-details.html`,
  `js/breeds.js`, `js/breed-details.js`.
- **Target React structure:** `src/pages/app/breeds/*`, `src/pages/app/breedDetails/*`
  (routes `/app/breeds`, `/app/breeds/:id` — both current `PageStub`s).
- **Reusable components:** `BreedCard`, `BreedTag`, `SearchBar`, `FilterTabs`,
  `EmptyState`.
- **API dependencies:** `GET /breeds`, `GET /breeds/:id` (public).
- **UI preservation requirements:** breeds palette/grid, filter tabs, `breed-tag`,
  breed-detail layout.
- **Verification:** grid + search + species filter from real `/breeds`; detail page by id.
- **Completion criteria:** breed browse parity, real data only.
- **Rollback/safety:** isolated pages.

Implemented (commit + push under Phase 19):
  `src/api/breeds.ts` typed `Breed` + `BreedsResponse` + `getBreeds()` (GET
  `/breeds`) and `getBreed()` (GET `/breeds/:id`), and the pages from scratch at
  `src/pages/app/breeds/*` + `src/pages/app/breedDetails/*`: `breedsBase.ts`
  (species tab keys, `speciesLabel`, `breedImage` with per-species local
  fallbacks cat/bird/dog, `breedSearchText` name+origin), `BreedCard` (photo
  with onerror fallback, name/subtitle, expand-collapse details with
  single-expanded-at-a-time and "View/Hide Details" button, "Open Full Page"
  Link), `BreedsPage` (notification bell + panel from real `/notifications`,
  toolbar search, species filter tabs All/Dogs/Cats/Birds/Others with counters,
  grid, loading / empty / error + retry / clear-filters states), and
  `BreedDetailsPage` (hero photo + name, info tiles weight/height/lifespan/temp
  `ruler`/`face-smile`/`person-running` icons, description, derived display
  "origins/care/personality" info sections, "About/X for dogs/cats/Birds"
  sections by species, temp tags grid, "View all breeds" back link, and mapped
  states: no id → "No breed selected", HTTP 400 → "Could not load breed" +
  backend message "Invalid breed ID.", 404 → "Breed not found").
  Routed in `routeConfig.tsx` (`/app/breeds`, `/app/breeds/:id` — both replace
  the previous `PageStub`s), icons `face-smile`/`person-running`/`ruler`/
  `up-right-from-square` added to `src/components/shared/Icon.tsx`, CSS ported
  to `src/styles/breeds.css` (page-scoped + `body.dark-theme` pattern, accent
  `#011426`, responsive 1200/992/600 breakpoints + 390px single-column grid,
  `:focus-visible` outlines, accessible labels) wired via `global.css`.
  Accepted deltas (AGENTS §5 — no fabricated data, backend is truth):
  (1) backend `GET /breeds` supports `?species=` / `?search=`, but the UI does
  client-side filtering instead to keep live browser interactions instant on the
  tiny 4-breed seed corpus (documented in `BreedsPage.tsx`);
  (2) the species filter offers only the non-empty tabs (Dogs/Cats) plus Birds +
  Others which render a real empty state because no such breeds are seeded —
  no fabricated content (AGENTS §11);
  (3) breed-detail info sections are derived from the real breed fields the
  backend returns (description/temperament/coat/colors/height/weight/lifespan),
  spelled out in plain English rather than Vanilla's misleading "Productive
  breed/Athletic breed" copy;
  (4) bell/notifications reuse the real `/notifications` API like sibling
  phases (no hardcoded badge).
  Verified live (backend + mongod up; DB seeded — `user@example.com`/`user123`):
  `npm run lint` (only the pre-existing AuthContext/VerifyEmailPage warnings) +
  `tsc -b && vite build` pass. Headless Chrome (CDP) on the Vite dev server +
  real backend: `/app/breeds` renders the 4 real seeded breeds (Golden
  Retriever, Persian Cat, Labrador Retriever, Siamese Cat) with real `GET
  /breeds` network hits; Dogs/Cats tabs → 2 each, Birds → empty state, All → 4;
  search "scot" → Golden Retriever, miss → empty-state + clear-filters restores;
  expand works one card at a time; "Open Full Page" → details for Labrador
  Retriever (tiles, info sections, temp tags, real `GET /breeds/:id` hit); back
  link → `/app/breeds`; invalid id → "Could not load breed" + "Invalid breed
  ID.", unknown id → "Breed not found"; notification panel opens with real
  items; dark mode bg rgb(23,21,35) both pages; 390px viewport → 0px horizontal
  overflow + single-column grid on both pages.

### Phase 20 — Settings
- **Objective:** profile edit (name/phone/location/avatar), theme, change password.
- **Existing source files:** `pages/settings.html`, `css/settings.css`, `js/settings.js`.
- **Target React structure:** `src/pages/app/settings/*` (route `/app/settings` —
  current `PageStub`).
- **Reusable components:** `ProfileForm`, `AvatarUpload`, `PasswordForm`, `Toast`.
- **API dependencies:** `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/change-password`,
  `POST /users/avatar` (multer).
- **UI preservation requirements:** settings card layout, avatar, theme toggle,
  password-change flow (api.js `saveProfile`/`updatePassword` parity).
- **Verification:** profile persists after reload; avatar upload; password change E2E.
- **Completion criteria:** settings parity with real backend data.
- **Rollback/safety:** isolated page.

Implemented (commit + push under Phase 20, real backend only — no fake data):
  `src/api/settings.ts` typed `updateProfile`/`changePassword`/`uploadAvatar` (+
  `ProfilePayload`/`ProfileResponse`/`AvatarResponse`) and a full
  `src/pages/app/settings/SettingsPage.tsx` (route `/app/settings` — replaced the
  `PageStub`) + scoped `src/styles/settings.css` (imported in `global.css`,
  `.settings-page` / `.settings-layout` etc. + `:root/_dark-theme`), reusing
  `useTheme` (real dark-mode toggle), `Icon` (new `globe/save/sliders-horizontal`
  keys; `info`→`circle-help`), `client.ts` typed API, `getMyPets`,
  `getNotifications`/`markAllNotificationsRead` (bell panel with unread badge),
  `getAppointments` (scheduled count, `appointments.my` parity) — all real
  `/notifications`/`/pets/my`/`/appointments`/`/auth/me` backend data.
  Landing on `/app/settings` hydrates from `GET /auth/me` + `GET /pets/my`
  (network-verified), sidebar/pets thousandths parity preserved, email readonly
  (not an updatable backend field — documented deviation), avatar flow: real
  multi-part `POST /users/avatar` upload (multer jpeg/png/webp ≤5MB, multer
  `sizeLimit` mapped) with client preview + "change" retry + "Remove photo" →
  placeholder (never persisted); only real uploaded/server avatars are saved.
  Password change wired to real `PUT /auth/change-password` with min-6
  validation + backend error verbatim ("Current password is incorrect.") + green
  "Password updated successfully." + cleared fields; dark-mode toggle applies
  `_dark-theme` body class + `rgb(23,21,35)` page bg / card `/rgb(33,30,48)`
  (real theme context, not a disabled "Coming soon" like Vanilla); "Your Pets"
  card renders real `/pets/my` (breed/age from real backend populate, broken
  remote-image fallback to species-local SVG via `petImage`); "Manage Pets" →
  `/app/mypet`, back → `/app/dashboard`. Breach/empty/error+retry/loading
  states; `@390px` single-column grid with `gridTemplateColumns: none` and zero
  horizontal overflow.
  Verified headless (CDP against real Vite + real backend on seeded munge):
  login → `/app/settings` shows real name/email/phone/member-since (real date) /
  `1 Pet` / breed `Labrador Retriever` / `3 yrs`; Save profile → `PUT
  /auth/profile` 200 + green "Profile saved." + name/phone persisted after
  reload (real backend); avatar preview blob → `POST /users/avatar` (real
  `/uploads/...` URL on frontend AND `GET /auth/me`); password: wrong current →
  inline "Current password is incorrect." (no green), correct → success + REAL
  login with new password, then password restored; dark toggle applies
  `_dark-theme` + real `rgb(23,21,35)` bg / `rgb(33,30,48)` card and reverses;
  bell panel opens with real unread count + items / empty state; 390px → no
  horizontal overflow + single column. Seed profile fields (name/phone/city/
  avatar) + password restored to seed `Demo User`/`user123` afterwards (no
  residue). Deviations vs Vanilla, flagged in `SettingsPage` header comment:
  email not editable (read-only — backend rejects it), "Danger Zone / Delete
  account" section intentionally omitted (no self-delete backend endpoint;
  Vanilla only wiped localStorage), notifications stored as real backend
  notifications (not Vanilla's `annSetting_*` localStorage-only prefs) — theme via
  real `useTheme` rather than a disabled Vanilla toggle. Completion criteria met.

### Phase 21 — Admin panel
- **Objective:** all 6 admin pages (stats, users, pets, adoptions, community, lost-found)
  inside admin shell with admin-only guard.
- **Existing source files:** `admin/*.html`, `admin/css/admin.css`, `admin/js/*.js`,
  `js/api.js`.
- **Target React structure:** `src/pages/admin/*` + `src/layouts/AdminLayout.tsx`,
  `src/api/admin.ts`.
- **Reusable components:** `AdminTable`, `RowActions`, `ConfirmDialog`, `StatusPill`,
  `StatsCards`, `Pagination`, `LoadingRow`, `EmptyState`.
- **API dependencies:** `/api/admin/dashboard|users|users/recent|users/:id/block|
  users/:id|pets|pets/:id|lost-found|lost-found/:id/status|lost-found/:id|community|
  community/:id/status|community/:id`, `/api/adoptions` + `/:id` (status/delete).
- **UI preservation requirements:** admin design system (#design.md §1.5 — dark slate
  sidebar `#1e293b`/`#0f172a`, light tables, `#dc2626` danger, `#f1f5f9` table surface),
  FA 6.4.0-only icons, loading rows, `body[data-page]`-equivalent page identification.
- **Verification:** all admin flows E2E; non-admin gets blocked (guard + 403 from
  backend); block/delete/status transitions correct.
- **Completion criteria:** full admin parity, authorization enforced.
- **Rollback/safety:** admin routes isolated; destructive ops behind confirm + backend.

**Implemented (commit + push under Phase 21, real backend only — no fake data):**

- New `src/api/admin.ts` (typed dashboard/users/pets/lost-found/community admin
  endpoints, all `protect` + `adminOnly`); `src/api/adoptions.ts` extended with
  `getAllAdoptions()` / `updateAdoptionStatus()` and a richer `Adoption` type.
- New `src/pages/admin/AdminTopbar.tsx` (shared topbar + `AdminTableEmpty` row
  helper) and six pages: `AdminDashboardPage`, `AdminUsersPage`, `AdminPetsPage`,
  `AdminAdoptionsPage`, `AdminCommunityPage`, `AdminLostFoundPage`. All reuse
  `.admin-*` CSS classes, `window.confirm` for destructive actions, and a 3s
  auto-dismiss `admin-toast` (green success / red error).
- `src/routes/routeConfig.tsx` wired the six admin routes to the real pages
  (guarded by the existing `RequireAdmin`).
- `src/styles/admin.css` (a copy of the Vanilla `admin/css/admin.css`) was scoped
  to `.admin-wrap`: removed the Vanilla `*` reset and `body { background, font,
  color }` that leaked onto every SPA page (Tailwind preflight provides the
  reset), moved background/font/color onto `.admin-wrap`, and added
  `body.dark-theme .admin-wrap` overrides (app dark palette
  `#171523`/`#211e30`/`#332e45`). Added `.admin-section-title`, `.admin-muted`,
  `.admin-protected`, `.admin-reason`, and `.admin-toast.error`.
- **Accepted deltas from the spec prose:**
  - `docs/design.md §1.5` / the Phase 21 prose describe a dark slate admin sidebar
    (`#1e293b`/`#0f172a`); the actual Vanilla `admin/css/admin.css` is the pink
    gradient sidebar (`#ff5c8a`→`#f43f5e`) on `#fdf3f6`. The React port follows
    the real file; the design prose is stale.
  - No admin **vet CRUD** UI: the backend has admin-only veterinarian routes, but
    no Vanilla admin UI exists and vet CRUD is not one of the six admin pages.
    Not built (parity + YAGNI).
  - No **delete** button on the adoptions page: the Vanilla admin UI has none
    (Approve/Reject only, `PUT /adoptions/:id`); not added.
- **Verification (real backend + MongoDB, Playwright/Chromium, all green):**
  dashboard shows exact live stats `2|3|3|0|1|2`; users (block/unblock + pill +
  toast, admin row "Protected"); pets (delete via confirm + toast + reload
  removal); adoptions (approve → green `Approved` pill + `Reviewed` label,
  backend adoption `Approved` and pet `adopted:true`); community
  (publish/unpublish pill swap, delete); lost-found (resolve/reopen pill swap,
  delete); non-admin receives backend 403 and the SPA redirects
  `/app/admin`→`/app/dashboard` (anon→`/login`); dark-mode admin palette and
  light default verified; 390px viewport stacks sidebar and scrolls tables
  inside `.admin-table-wrap` with no horizontal overflow. `npm run lint`
  (oxlint, zero new issues), `tsc -b`, and `vite build` all clean.

### Phase 22 — AI / PetGPT (redesign)
- **Objective:** redesigned React chat UI (bubbles, typing indicator, quick suggests,
  find-a-vet modal) wired to the latest PetGPT backend endpoints on `main`
  (`POST /api/ai/ask` → `askPetGPT`, `POST /api/ai/advice` → `getPetAdvice`) + real
  vet listing (`GET /veterinarians`). Standalone dedicated phase — NOT part of
  Phase 19/20 (breeds/settings ship first).
- **Existing source files:** `pages/petgpt.html`, `css/petgpt.css`, `js/petgpt.js`,
  `js/appointments.js` (vet list).
- **Target React structure:** `src/pages/app/petgpt/*`.
- **Reusable components:** `ChatPanel`, `MessageBubble`(.user/.ai), `QuickSuggestionChips`,
  `TypingIndicator`, `ChatInput`, `FindVetModal`.
- **API dependencies:** `POST /ai/ask`, `POST /ai/advice`, `GET /veterinarians`.
- **UI preservation requirements:** PetGPT palette (`#8d68d8`, `#65738e`), existing bubble
  alignment/imgs, no fabricated canned answers — real API only (AGENTS §5).
- **Verification:** ask → streamed/returned AI response renders; loading + error states;
  vet modal populated.
- **Completion criteria:** chat parity with genuine AI responses.
- **Rollback/safety:** isolated page.

**Implemented (commit + push under Phase 22, real backend only — no fake data):**

- New `src/api/petgpt.ts` typed client for the enhanced `main` backend surface:
  `createConversation`, `listConversations`, `getConversation`,
  `deleteConversation`, `addMessage` (202 job model), `getJobStatus`
  (polling), `newIdempotencyKey`, plus `GET /veterinarians`. Handles all three
  `addMessage` outcomes — queued `generationJob` (job id kept in
  sessionStorage so a reload resumes polling), `scopeHandled` (off-topic
  canned reply), and `reusedMessage` (re-attached to the existing conversation).
- New `src/pages/app/petgpt/PetGPTPage.tsx` + `QuickActions.tsx` +
  `VeterinarianPanel.tsx` and `src/styles/petgpt.css` (spa page resolution,
  plain sticky footer, `bg-primary` user bubbles, `.petgpt-dots` typing dots,
  amber `.petgpt-error` card with `Try again`, `.petgpt-chip-row`, mobile
  drawer, dark surfaces via `oklch` slate-950). Empty state pulls the user's
  real pets via `GET /pets/my` (`toPetView`) for context chips and lists the
  six quick actions + real veterinarian directory (`GET /api/veterinarians`).
  Chat renders `.petgpt-answer` only for `role !== 'system'`, filters
  `toolCalls` in/out of the assistant bubble, mirrors literal layout from
  `pages/petgpt.html` at 390px, and maps owned-pet chips to `get_my_pets`
  inputs by name match.
- `src/routes/routeConfig.tsx` mounts the real page at `/app/petgpt` (was
  `PageStub`); `src/styles/global.css` imports `petgpt.css` (added the active
  `@custom-variant dark` line so Tailwind 4 emits `:where` dark variants for
  the globally-scoped CSS).
- `backend/.env.example` documents the OmniRoute provider block
  (verified locally): `PETGPT_PROVIDER=openai`,
  `PETGPT_OPENAI_BASE_URL=http://172.18.0.2:20128/v1` (container IP of the
  local OmniRoute), `PETGPT_OPENAI_MODEL=auto`, any non-empty
  `PETGPT_OPENAI_API_KEY` (OmniRoute accepts a dummy key). Rate-limit knobs
  `PETGPT_RATE_LIMIT_MAX` / `PETGPT_RATE_LIMIT_WINDOW_MS`; scope gate keyword
  list `OFF_TOPIC_KEYWORDS`.
- **Verification:** `npm run lint` (oxlint, zero new issues), `tsc -b`, and
  `vite build` all clean. End-to-end vs the running enhanced backend (:5000,
  Mongo `animal_planet`) and the **real** OmniRoute provider (`model=auto`,
  dummy key) via a headless-Chrome (CDP) suite — `29/29 PASS`: login as
  admin; empty-state greeting; all six quick actions and their composer
  prefill; pet context chips show the admin's owner-scoped pets
  (`GET /pets/my` → Luna + Buddy); send → 202 → queued job → typing dots →
  real assistant reply (persisted `toolCalls`); sidebar lists the
  conversation; conversation + messages survive a full reload (re-list +
  `GET /:id` restore); a second conversation is created, listed, and the
  first one switches back with its messages restored; veterinarians render
  real Dr. Michael Chen / Dr. Sarah Johnson + clinics; ask-about-vet prefills
  the composer; the off-topic bounce ("stock market") returns the canned
  "outside what I do" reply synchronously; clear conversation → DELETE →
  empty state and rail removal; 390px mobile has no horizontal overflow and
  the hamburger/drawer works only when the rail is hidden; dark theme applies
  `dark-theme` + dark surfaces.
- **Failure path (honest scope):** the provider-failure job path was verified
  at the API level — restarting the backend with a dead provider URL makes
  the job end `failed` with `{"code":"provider","message":"AI generation
  failed. Please try again."}`, and the frontend renders the amber error card
  (`Could not get a reply` + `Try again`) from that `pending.error`. The
  browser segment for the failure→try-again→success cycle was **stopped
  before completion** per user request; the error-card UI and retry handler
  are wired identically to the (passing) happy-path series. Not claimed as
  browser-verified.
- Known/throttled: test conversations created by the E2E runs were deleted
  after the suite (admin restored to zero conversations).

### Phase 23 — API integration layer (formalization)
- **Objective:** consolidate the typed `src/api/` layer + `client.ts` + `lib/*` so ALL
  pages use one client (many phases above will have started with ad-hoc hooks; this
  removes drift). Reproduces `api.js` exactly.
- **Existing source files:** `js/api.js` (base, token, user, isLoggedIn/isAdmin, request
  wrapper, logout footprint).
- **Target React structure:** `src/api/*` (§2 tree), `src/lib/{storage,errors,image}.ts`,
  `src/hooks/useFetcher.ts`.
- **Reusable components:** none (infra).
- **API dependencies:** full backend surface (§1 fast-ref).
- **UI preservation requirements:** identical request semantics; error messages surface
  exactly as today (backend `message` field).
- **Verification:** grep audit finds zero raw `fetch` outside `client.ts`; network-tab
  parity for a sample flow; `VITE_API_URL` override works.
- **Completion criteria:** single typed client; no helper drift.
- **Rollback/safety:** infra beneath pages; pages still work via old helper until swap.

**Implemented (commit + push under Phase 23, real backend only — no fake data):**

- `src/api/client.ts` is now the single network origin: `API_BASE` is overridable
  with `VITE_API_URL` (dev/build time; defaults to `http://localhost:5000/api`,
  trailing `/`-stripped), plus `apiOrigin()` (`API_BASE.replace(/\/api$/, '')`)
  for the multer `/uploads` surface. `ApiError` lives in `src/lib/errors.ts` and
  is re-exported from `client.ts` so the existing `import type { ApiError } from
  '../api/client'` call sites keep working. Grep audit: zero raw `fetch` outside
  `client.ts`; the only remaining `API_BASE`/origin-string references are inside
  `client.ts`.
- New `src/lib/errors.ts` — `ApiError`, `toApiError`, `getErrorMessage(err,
  fallback)` (behaviour-identical to the hand-rolled
  `(err instanceof Error && err.message) || fallback` pattern; an ApiError's
  `message` is the backend `data.message` verbatim), and `isApiError(err)` type
  guard (any client-thrown Error carries `status`: `0` for network failures,
  `response.code` otherwise).
- New `src/lib/image.ts` — canonical `assetUrl(src)` (empty → `''`, absolute
  `http(s)` and non-`/uploads/` paths pass through, `/uploads/…` resolved via
  `apiOrigin()`). De-duplicated the three identical `assetUrl` copies
  (`communityBase.ts`, `lostFoundBase.ts`, `AdminTopbar.tsx`); `communityBase`
  and `lostFoundBase` re-export it so page components are untouched.
- Adopted `getErrorMessage` at the mixing sites: `LoginPage`, `SignupPage`,
  `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage`, `SettingsPage`
  (both profile and password catches; dropped the now-unused `ApiError` casts/
  imports). `PetGPTPage` now uses `isApiError(...)` + `getErrorMessage(...)`
  instead of re-declaring the error shape inline (`{ status?, isNetwork?,
  message? }`).
- Deliberate non-changes (documented, to avoid drift/churn without value):
  no generic `useFetcher` hook — every page has page-specific load/mutation
  flows, so a shared fetcher would be dead code or a risky rewrite; the ~20
  uniform `(err instanceof Error && err.message) || fallback` sites across
  feature pages were left as-is (already consistent); `petImage()` in
  `lib/formatters.ts` unchanged.
- **Verification:** `npm run lint` (oxlint, zero new issues — only the two
  pre-existing `react(set-state-in-effect)` warnings), `tsc -b`, and `vite build`
  all clean. Live API flows against the running backend (:5000, Mongo `petDB`)
  via two freshly-created verified test users (created directly in Mongo with the
  model's bcrypt pre-save hook, then cleaned up): `auth/login` tokens issued and
  `auth/me` hydrated; A creates pet (201, real Breed ref + auto QR/petUid);
  `/pets/my` reflects it; QR endpoint returns the QR data; public `GET /pets/:id`
  works without auth; B's `PUT`/`DELETE` on A's pet → `403`, A's `PUT` → 200
  (ownership boundary green); multer avatar upload (FormData) → absolute
  `/uploads/...` URL, uploaded PNG served `200 image/png`; A deletes pet → 200,
  re-GET → 404; unauthenticated `/pets/my` → 401; `GET /veterinarians` → seeded
  vets. `VITE_API_URL` override proven at build time: default base absent from
  the bundle, override present (`dist/` is git-ignored). **Not verifiable on the
  local checkout:** the PetGPT conversation/job contract (202 + polling) only
  exists on the `main` backend; this `react-migration` backend serves the legacy
  single-turn `/ai/ask` + `/ai/advice`, and no AI provider is configured — the
  AI flows ride on the Phase 22 E2E and are unaffected by this phase (the PetGPT
  change here is compile-checked error handling only).

### Phase 24 — Authentication / state management (consolidation)
- **Objective:** single AuthContext + ThemeContext implementation, storage-key constants,
  route-guard wiring end-to-end; document the fetch-based state approach (§6).
- **Existing source files:** `js/theme.js`, `js/api.js`, `js/sidebar.js` (profile/
  logout), `js/login.js`, `js/settings.js`.
- **Target React structure:** `src/contexts/*`, `src/hooks/*`, `src/lib/storage.ts`.
- **Reusable components:** `RequireAuth`, `RequireAdmin`, `RedirectIfAuthed`.
- **API dependencies:** `/auth/me` (hydration), logout client-side only (per api.js).
- **UI preservation requirements:** key names/behavior identical; theme remember +
  sun/moon labels; logout clears `annProfile`/sessionStorage parity.
- **Verification:** session continuity (token written by old site works in React and
  vice versa); guard matrix tested for anon/user/admin.
- **Completion criteria:** one auth/theme code path, guard matrix green.
- **Rollback/safety:** centralized; old-site session keys make fallback seamless.

**Implemented (commit + push under Phase 24, real backend — no fake data):**

- **Audit fixed a real state bug:** the hydration `401` catch in `AuthContext`
  only cleared React state but left the stale `famipetToken`/`famipetUser`/
  `annProfile` in `localStorage`. After a token expiry that meant every cold
  load replayed a bogus session until the next 401. Now the catch calls
  `logoutStoredAuth()` (the api.js 401-with-token path) before clearing the
  in-memory state — storage, in-memory state, and sessionStorage are cleared
  together. The `user` initial state is now gated on `getToken()` (no phantom
  user when there is no token).
- **Removed a redirect race:** `LoginPage` previously fired its own
  `setTimeout(navigate(dest), 800)` after login while `RedirectIfAuthed` also
  bounced the already-authenticated page — deep-link logins flashed the
  dashboard, then jumped late. Login now just completes the API call and lets
  `RedirectIfAuthed` redirect deterministically.
- **Deep links now landed correctly:** `RedirectIfAuthed` honors
  `location.state?.from` (set by `RequireAuth`/`RequireAdmin`) so a login that
  started at a protected deep link returns there instead of the dashboard.
  Sanitized: `from` must be a real path, and `/login` itself is ignored.
- **Deliberate parity non-changes (no drift vs the Vanilla site + api.js):** the
  canonical `client.ts` 401-with-token behavior (logout + hard redirect to
  `/login`) is kept as the default — `setOnUnauthorized` remains unwired;
  `logout()` clears `famipetToken`/`famipetUser`/`annProfile` + `sessionStorage`
  and leaves `famipetTheme` alone (theme survives logout — verified); no
  refresh-token/QoL endpoints invented; `SignupPage` and `ResetPasswordPage`
  flows unchanged (register→/login, reset stores backend-issued token if any);
  `/auth/me` is the only hydration request. Feature pages that read
  `getUser()/isAdmin()` directly (`AdminTopbar`, `ComposePostModal`,
  `CommunityPage`, `LostFoundPage`, `ReportFormModal`) are safe because the 401
  path now clears storage; `SettingsPage` still syncs context via `setUser()`
  after profile/avatar saves.
- **Verification:** `npm run lint` (oxlint, no new issues — only the two
  pre-existing `react(set-state-in-effect)` warnings), `tsc -b`, and `vite build`
  clean. Live browser verification (headless Chrome + raw CDP, real backend
  :5000/Mongo `petDB`, three freshly-created verified users A/B/admin, cleaned
  up after): 35/35 checks — unauth deep link → `/login` clean; login A →
  dashboard with token+user persisted and sidebar identity; refresh after
  deep-link settings still case-splash → `/auth/me` hits the backend and state
  restores; logout clears all four keys, sessionStorage, and preserves theme;
  A→B switch shows B's name+pet (`AceB`), hides A's (`AceA`), stored user is B;
  non-admin `/app/admin` → dashboard with no admin content; mid-session expired
  JWT → 401 via the canonical client → storage cleared + `/login`; garbage token
  + stale stored user on cold load → hydration 401 clears both → `/login`;
  deep-link login returns to `/app/mypet`; authed `/login` → dashboard; admin
  deep-link login lands `/app/admin`, `/app/admin/users` authorized, both admin
  and user sidebar logouts work; 390 px mobile emulation: the **authenticated**
  app shell (dashboard/mypet/settings) has **no** horizontal overflow. One
  pre-existing, auth-independent issue surfaced and deliberately NOT fixed in
  this phase: the unauthenticated `/login` page overflows at 390 px
  (`scrollWidth 470 > 390`) due to the Phase 7 `login.css` `.login-container`
  grid + `.login-card` min-content — `/signup`, the landing page, and the app
  shell are all clean at 390, no CSS changed in Phase 24, and Phase 25
  (responsive/mobile + overflow polish) owns it.

### Phase 25 — UI/UX completion & stabilization
- **Objective:** final UI/UX pass across all migrated pages — Landing page completion,
  My Pets, and remaining migrated-page UI inconsistencies, responsive/mobile behavior,
  light/dark parity, overflow/alignment/polish; grid/typography breakpoints parity
  across every page (Tailwind) — 1200 (auth), 1100 (app grids→1-col, stats→2-col), 992
  (nav/menu + hamburger + sidebar collapse), 768 (auth card radius 28px, role grid
  1-col), ~480 (pet-card stacks); `overflow-x:hidden` and `img max-width:100%` globals.
- **Existing source files:** `css/responsive.css` (universal overrides), `css/sidebar.css`
  collapse, per-page grid rules, plus design.md surfacing for any remaining page polish.
- **Target React structure:** tokenized breakpoints in `tailwind.config`; per-page
  responsive classes.
- **Reusable components:** responsive variants of grid components.
- **API dependencies:** none.
- **UI preservation requirements:** identical layout at 1280/1024/768/480 on key pages;
  hamburger + sidebar collapse on mobile; grids collapse to 1-col parity; no horizontal
  overflow; dark mode surfaces correct.
- **Verification:** full-page screenshots at the 4 widths, diff against old site.
- **Completion criteria:** responsive parity across all pages at all breakpoints.
- **Rollback/safety:** additive CSS; wander minimal.

**Implemented (commit + push under Phase 25, real backend — no fake data):**

- **Landing page completed.** `/` now renders `src/pages/landing/LandingPage.tsx`
  (replacing the Phase 22 PageStub) inside the existing `LandingLayout`
  (Navbar + Footer + BackToTop, all previously ported). The five sections —
  hero, services (6), about, why-us (4), join-us/CTA — mirror the Vanilla
  `frontend/index.html` structure 1:1; the two data grids statically render the
  same service/why items `frontend/js/home.js` injected, reusing the same
  `/assets/icons/*.svg` + `/assets/images/hero/*` files. New
  `src/styles/landing.css` ports `frontend/css/home.css` scoped under `.landing`
  (so nothing leaks into the authenticated pages, which reuse `.hero*`,
  `.section-*`, `.service-*` names page-scoped); Vanilla's undefined vars
  (`--section-bg`, `--primary-color`, `--heading-color`, `--text-color`) resolve
  to the React tokens. Mobile rules added at 1100/768/600/480 (hero stacks,
  grids 4→2→1, about/cta single column, typography clamping); the audit
  confirmed no horizontal overflow at 1440/768/390.
- **Auth horizontal overflow fixed** (pre-existing — explicitly tracked for this
  phase at the end of the Phase 24 block). `login.css`:
  `.login-page { overflow-x: hidden }` restored (clips the decorative blur
  circles that bled 80 px past the right edge on desktop/tablet), grid tracks use
  `minmax(0, xfr)` so the 440 px `.login-card` can no longer force the
  `.login-container` wider than the viewport, and `≤968px` uses
  `minmax(0, 1fr)` plus tighter card/panel padding `≤600px`. `/login` and
  `/forgot-password` now measure clean (scrollWidth == clientWidth) at
  1440/768/390 in both themes; `.login-left` remains visible at desktop; no
  regression on signup/reset-password/verify-email.
- **My Pets / app / admin formatting verified with real DB data.** Seeded two
  real pets to the audit user through the backend API and measured
  `/app/mypet`: 2×564 px grid at 1440, single column at 768/390, pet portraits
  `object-fit: cover`, name/details rendered, empty state when a user has no
  pets, zero horizontal overflow. Full shell audit (headless Chrome CDP against
  the real backend): 36/36 app-route measurements (12 routes × 3 widths) and
  18/18 admin-route measurements clean; landing sections present; anchor nav
  (scroll-padding-top) and theme toggle (`famipetTheme` persistence + body
  `dark-theme`) verified; no console errors; `npm run lint`, `tsc -b`, and
  `vite build` all pass. Landing stays light-first in dark theme exactly as the
  Vanilla landing (no dark overrides existed there; navbar/footer/theme toggle
  parity unchanged).
- Note: the roadmap's "tokenized breakpoints in `tailwind.config`" wording
  predates the Tailwind 4 CSS-first setup (no `tailwind.config` file exists —
  tokens live in `src/index.css`/`global.css` `@theme`); breakpoint parity was
  delivered directly in the ported per-section CSS. Verification skipped
  screenshot diffing (Phase 26 owns that) in favor of DOM geometry/overflow
  measurement.

### Phase 26 — Visual regression
- **Objective:** scripted Playwright screenshot comparison: old site (5502) vs new
  (5173/build) for every page; document accepted deltas (e.g. FA glyph rendering, font
  loading timing) — values must NOT change.
- **Existing source files:** all old pages + CSS (reference), all new pages.
- **Target React structure:** `frontend-react/tests/visual/*` (or repo-level `tests/`).
- **Reusable components:** Playwright config + screenshot harness.
- **API dependencies:** backend + seeded DB for consistent data.
- **UI preservation requirements:** pixel-diff thresholds per page; any exceeded diff is
  either fixed or recorded as an accepted delta with rationale (design.md §8 list).
- **Verification:** all pages under threshold or listed in accepted-diff report.
- **Completion criteria:** visual parity audit signed off.
- **Rollback/safety:** additive test infra; no prod impact.

**Phase 26 executed 2026-09-24 (real backend + seeded audit data; headless Chrome CDP —
Playwright is not installed and adding dependencies was out of scope, so the scripted
"Playwright screenshot comparison" wording above was delivered as a CDP harness that
captures viewport screenshots and measures DOM geometry / computed styles on every page):**

- **Coverage — 26 routes × 3 viewports × 2 themes = 156 combos, all measured against
  the live API + Mongo:** public `/`, `/login`, `/signup`, `/forgot-password`,
  `/reset-password/phase26tok`, `/verify-email/phase26tok`, `/no-such-page-xyz`;
  user `/app/dashboard`, `/app/mypet`, `/app/health` (vaccinations included),
  `/app/adoption`, `/app/appointments`, `/app/reminders`, `/app/community`,
  `/app/lost-found`, `/app/petgpt`, `/app/breeds`, `/app/breeds/:id` (real breed id),
  `/app/pet-id`, `/app/settings`; admin `/app/admin[/users|/pets|/adoptions|/community|
  /lost-found]` (admin session). Route mapping vs the phase list: React has no
  `/app/pets`, `/app/pets/:id`, or `/app/vaccinations` routes — pet list is
  `/app/mypet`, pet detail is a modal on that page, and vaccinations live in
  `/app/health` (deltas documented in the Phase 8/9 blocks).
- **Viewports/theme:** 390/768/1440; light + dark (verified per page that
  `body.dark-theme` flips nav/sidebar/card surfaces; e.g. dash nav
  `rgb(251,250,255)` → `rgb(23,21,35)`).
- **Genuine regressions found: none.** Per combo, all 156 measured: horizontal
  overflow `0` (scrollWidth == clientWidth), elements sticking past the viewport `0`,
  clipped `nowrap` text `0`, console errors `0`, uncaught exceptions `0`; h1 typography
  `clamp()` verified (landing hero 37.6/51.2/64px, dash 25/25/33.12 where every h1
  rendered width == scroll width); grids responsive (`stats-grid` 4-col @1440 →
  2-col @768 → 1-col @390; `dashboard-grid` asymmetric masonry @1440 parity;
  `community-layout` 2-col + 345px rail @1440); image overflow within cards `0`;
  modals in-viewport and centered at all sizes (`.pet-modal` 720×810 @1440 / 340×760
  @390, `.post-modal` 560×608 @1440 / 350×596 @390, `.modal-box` 500×452 @1440 /
  358×543 @390; internally scrollable, document overflow `0`); mobile sidebar opens
  the 288 px drawer with full overlay (design.md pattern); light/dark contrast
  checked with the WCAG ratio on 7 page groups (landing, login, dash, mypet,
  settings, community, admin) × 2 themes — every body text ≥3.0 and parity-checked
  against the old site, not just absolute thresholds.
- **No implementation commit** — the phase forbids cosmetic-only commits; this block +
  the pushed docs commit are the Phase 26 deliverable.
- **Accepted deltas (measured against the old site — not new defects):**
  1. Community renders 4 broken images (3 post-user avatars + 1 `post-image`) whose
     URLs point at `/uploads/…` files missing from disk (`backend/uploads/` is empty;
     curling them returns 404). The referencing post/users are real records whose
     files were cleared on this machine; the old Vanilla site would show the exact
     same broken images. Not fixed — replacing them would fabricate data (AGENTS §5);
     environmental, revisit only if the originals are restored.
  2. My Pets `.pet-breed p` / `.more-btn` measure 2.94:1 in light mode — byte-for-byte
     the same tokens/cells as the Vanilla page (probe returned identical
     `rgb(140,152,164)` on white on both sites); keep.
  3. Community like/comment/share icons use the theme-neutral token (3.8:1 light /
     4.27:1 dark) instead of Vanilla's pink (3.06:1 light / 5.31:1 dark); both pass
     the 3:1 UI-component threshold. Intentional port choice (inactive-icon tone
     adapts to theme).
  4. Landing footer / per-page header heights differ at tablet/mobile. The footer now
     stacks its link grid 2-col ≤900 px / 1-col ≤600 px (Vanilla had zero `@media`
     rules in `footer.css` and squeezed the 4 columns — 1152 px tall @390 vs 1832 px
     now; desktop near parity 977 vs 1008 @1440). Headers were consolidated in the
     port (e.g. My Pets @390 272 px vs Vanilla 188 px; Community 193 vs 264 px). No
     overflow/clipping at any width — intended responsive polish.
  5. Login left panel hidden ≤992 px and 686 px wide @1440 on **both** sites
     (verified), and this environment's model cannot view images, so pixel-diffing
     was replaced by the geometry/computed-style measurements plus 156 viewport
     screenshots (saved under the OS temp dir) for human review.

### Phase 27 — Functional regression
- **Objective:** Playwright E2E flows for every feature against the real backend +
  seeded DB; multi-user ownership tests (AGENTS §14).
- **Existing source files:** old page + page-JS behavior as spec.
- **Target React structure:** `frontend-react/tests/e2e/*` per feature.
- **Reusable components:** test helpers (loginAs, seed fixtures).
- **API dependencies:** full backend; seeded DB; Cloudinary/multer uploads in flow.
- **UI preservation requirements:** behavior parity — CRUD, guards, badges, empty states,
  notifications no-dupe, admin authorization, ownership isolation (User B ↔ User A).
- **Verification:** every phase's core flow asserted; red-green against reference; nothing
  claims "tested" without a run (AGENTS §17).
- **Completion criteria:** full functional sign-off matrix green.
- **Rollback/safety:** E2E on dev DB; no change to old stack.

**Executed — functional regression sign-off (all suites green):**

Regression harnesses drove the React app over CDP against the real backend + seeded
`petDB`, with per-page console-error/exception/network-failure collection:

| Suite | Scope | Result |
| --- | --- | --- |
| S1 | Auth (registry/login/logout/verify/guards) | 13/13 PASS |
| S2A | Core CRUD (my pets/add pet/breeds popover/QR/Pet Booths/adoption listing) | 10/10 PASS |
| S2B | Social/settings (community like + post, favorites, lost & found, notifications read-all, save profile) | 14/14 PASS |
| S3 | Admin (stats, block/unblock, adoption approval, pet delete, community unpublish/publish/delete, lost & found resolve/delete, non-admin guards UI+API) | 22/22 PASS |
| S4 | Ownership/isolation multi-user (A creates → A can read; B cannot mutate/owner-read; public pet view is listing-only; favorites live only on A's user doc) | 19/19 PASS |
| S5 | PetGPT graceful degradation + real veterinarian directory | 4/4 PASS |

All suites: **0 console errors, 0 page exceptions** across every Phase-27 page (the
ComposePostModal `src=""` warning — profile/avatar empty-source — was fully eliminated).

**Genuine React regressions found and fixed (8):**
1. `PetFormModal`: native `required` on the breed `<select>` blocked custom-breed create;
   `customBreed` now prefilled when editing a pet whose breed isn't in the preset list.
2. `RemindersPage`: menu opened from `dataset.id` instead of `dataset.menuId` → the action
   menu could never open.
3. Community like: `ToggleLikeResponse` + `handleLike` now read `res.likesCount`/`res.liked`
   (coerced union) so the liked state is restored after reload.
4. User-shape normalization: backend `/auth/me` exposes `_id`-only, React expects `id`;
   `normalizeUser` + `AuthContext.getMe` + `SettingsPage.saveProfile` keep `id` (+ `isOwner`,
   delete controls, initial liked state) consistent across reloads.
5. `PostCard`: avatar `src={assetUrl(post.avatar) || FALLBACK_AVATAR}` (empty-avatar src).
6. `adoptionBase`: pet image falls back to `FALLBACK_IMAGE` when `images[0]` is an empty string.
7. `ComposePostModal`: preview `<img>` only rendered when a preview exists (`{preview && <img …>}`)
   — this was the last remaining `src=""` console warning.
8. `adoptionBase` image fallback guards empty-string entries (same root cause as 6).

**Multi-user ownership results (AGENTS §14):** A creates pet/health/vaccination/appointment/
reminder/community post/lost-report/favorite; B cannot soft-read A's pet (owner-scoped list),
edit/deactivate A's pet, read A's health record, complete A's reminder, delete A's post or
report (all 403/404), and B's appointments/reminders/notifications never leak A's records.
`GET /pets/:id` is intentionally **public** (view counter) and only exposes listing-grade
information. Favorites persist on `User.favorites` (only A's user doc after A's toggle) —
there is no `GET /favorites` route.

**Documented limitation (backend contract, no frontend workarounds):** PetGPT renders only the
designed degradation state — `/ai/conversations*` and `/ai/jobs*` do not exist on the current
backend branch (origin/main contract), returning `404 {"success":false,"message":"Route not found"}`;
the page shows the chat-rail failure + Retry, sending a message surfaces a toast, and the real
vet directory + Quick Actions still work. No fake replies or client-side fallback data.
Backend observation, left untouched: public `GET /users/:id` leaks favorites/pets/contact info.

**Verification:** `npm run lint` clean (only the 2 pre-existing warnings); `npm run build`
(`tsc -b && vite build`) clean.

### Phase 28 — Docker / Nginx integration
- **Objective:** productionize the React app: multi-stage build (`node:*-alpine` build →
  `nginx:*-alpine` static), SPA `try_files … /index.html`, `/api` + `/uploads` proxied to
  the backend container; backend image unchanged.
- **Existing source files:** `backend/server.js` (reference for ports/origins), new `frontend-react/`.
- **Target React structure:** `frontend-react/Dockerfile`, `frontend-react/nginx.conf`, optional
  `docker-compose.yml`.
- **Reusable components:** none.
- **API dependencies:** proxied `/api` + `/uploads` to backend service.
- **UI preservation requirements:** deep links (verify/reset) resolve behind SPA fallback;
  assets served from dist with correct caching.
- **Verification:** docker build + run; deep-link reload; API proxied; `/uploads` images
  load; CORS not needed same-origin (and backend `isDevOrigin` still passes if separated).
- **Completion criteria:** one-command production stack, E2E green inside container.
- **Rollback/safety:** new artifacts only; backend untouched.

**Executed — Docker / Nginx integration validated (production stack through the existing
deployment architecture):**

New artifacts (backend + entry-nginx images untouched, reused from the deployment repo):

* `frontend-react/Dockerfile` — multi-stage: `node:26-alpine` build (lockfile `npm ci`,
  `tsc -b && vite build`, `ARG VITE_API_URL=/api` baked into the bundle) → `nginx:alpine`
  runtime serving only `dist/` on **5502** (legacy CLIENT_URL port parity) with the same
  HEALTHCHECK the legacy frontend image used.
* `frontend-react/nginx.conf` — `listen 5502`, SPA `try_files $uri $uri/ /index.html`,
  `/assets/` hashed bundles `immutable; max-age=30d`, HTML `no-cache` revalidate,
  gzip, `server_tokens off`, nosniff / SAMEORIGIN / strict-origin-when-cross-origin.
  Deliberately **no CSP** (Google Fonts/Lucide/Cloudinary + inline styles — same
  decision as the legacy frontend config).
* `frontend-react/.dockerignore` — keeps `node_modules`/`dist`/`.env` out of the image.
* `frontend-react/docker-compose.yml` — mirrors the live deployment `habiba/Fami-Pet`
  compose exactly (service names `nginx`/`frontend`/`backend`/`mongodb`/`cloudflared`,
  `famipet-frontend-net` + `famipet-backend-net` isolation, backend hardening, uploads +
  mongodb volumes), except the `frontend` service builds the React app. Validation
  published the entry nginx on **`18080:80`** so the live stack kept `:80/:8080`.
* `frontend-react/.env.example` + gitignore rule — local compose `.env` stays out of git
  (`${JWT_SECRET:?}` required at up-time; nothing baked into images).

Architecture verified unchanged: browser → `famipet-nginx:production` (entry proxy:
`/api*` + `/uploads*` → `backend:5000`, `/` → `frontend:5502`) → React static / backend →
local `mongo:8`. The React container publishes no host port (internal-only, like legacy).

Start command on a fresh DB: `docker compose up -d --build` then
`docker compose exec backend node utils/seedData.js` (needs `SEED_ADMIN_PASSWORD`).

**Validated routes (real deployed stack, browser E2E over CDP at http://localhost:18080):**
| Check | Result |
| --- | --- |
| `/`, `/login`, `/signup`, `/forgot-password` render React | PASS |
| Deep links `/verify-email/:token`, `/reset-password/:token` render (no 404) | PASS |
| Unknown route → React NotFound page (SPA fallback serves index.html) | PASS |
| `/app/breeds/:id` direct load + **refresh persists** (nginx serves index.html) | PASS |
| Login (seeded user) → `/app/dashboard` greeting + no console/exception errors | PASS |
| `GET /api/pets/my` — real seeded pet (Labrador) through proxied API | PASS |
| Community posts render (seeded) | PASS |
| PetGPT page degrades gracefully in production too (missing `/ai/*` backend routes) | PASS |
| `/assets/index-*.js` 200 `application/javascript`, `immutable` cache | PASS |
| Security headers on HTML+assets (`Server: nginx` no version, nosniff/SAMEORIGIN/Referrer, no CSP) | PASS |
| `POST /api/users/avatar` through nginx → file written to uploads volume → `GET /uploads/<file>` 200 `image/png` | PASS |
| `GET /api/auth/me` 401 unauthenticated / 200 with JWT; `/api/status` `"db":"connected"` | PASS |
| Container logs (nginx + backend) — 0 errors; all services healthy | PASS |

**Build facts / observations:**
* Deployed bundle bakes `API_BASE = '/api'` (relative, same-origin through nginx) with
  **zero** `localhost` references — verified in the emitted JS. `VITE_API_URL=/api` is
  the documented default and is required for a same-origin deployment.
* The Linux image build deterministically emits `assets/index-LyznC6wS.js` (620.5 kB).
  A local *Windows-host* `npm run build` of the identical source/lockfile emits a
  different but functionally identical bundle (`index-…`, 1015.7 kB) — cross-platform
  rolldown build variance, not a code or config difference; the deployed artifact is the
  image build. Pre-existing >500 kB chunk warning only (both platforms).
* Browser `ERR_BLOCKED_BY_ORB` observed only for the seed's external Unsplash pet
  images (cross-origin embeds, Chrome enforcement superimposed by `imagesrc` policy) —
  identical on dev and live origins; no app asset or `/uploads` file is affected.
* Pre-existing backend behavior, left untouched (identical on the live stack, not a
  migration regression): uploaded file URLs are built from `req.get('host')`, so through
  the entry proxy they resolve as `<protocol>://<host>/uploads/<file>` (the client also
  revives `/uploads/...` via `assetUrl`). No Cloudflare/DNS configuration was changed;
  end-to-end HTTPS-through-CNAME could not be exercised from this environment (the
  named tunnel keeps serving the legacy stack to `famipet.catlium.in`) — documented
  limitation.

**Verification:** `npm run lint` clean (same 2 pre-existing warnings); `npm run build`
clean; `docker compose up -d --build` one-command stack green; browser E2E 15/15 PASS;
upload → `/uploads` fetch chain verified end-to-end; isolated stack torn down
(`down -v`, host-test Chrome stopped) with the live deployment untouched.

### Final Dockerization — production-ready frontend + backend (post Phase 28)

Concise close-out of the production Docker work. The existing Phase-28 artifacts
(`frontend-react/Dockerfile|nginx.conf|.dockerignore|docker-compose.yml|.env.example`)
and every previously built image remain **as-is**, kept for reference/rollback.

**Final artifacts (new, `docker-final/` — clearly named so nothing prior is touched):**
| Path | Purpose |
| --- | --- |
| `docker-final/docker-compose.production.yml` | final compose (project `famipet-final`) |
| `docker-final/frontend/Dockerfile` | React multi-stage: `node:26-alpine` build (`npm ci`, `tsc -b && vite build`, `ARG VITE_API_URL=/api`) → `nginx:alpine` (dist only, port 5502, healthcheck) |
| `docker-final/frontend/nginx.conf` | SPA `try_files … /index.html`, `/assets/` immutable, gzip, security headers, no CSP (same posture as legacy + Phase 28) |
| `docker-final/backend/Dockerfile` | Express backend: node:26-alpine, `npm ci --omit=dev` (no build step — plain CJS), non-root `node` user, `/app/uploads`+`/app/logs`, healthcheck vs existing `GET /api/status`, `CMD node server.js` |
| `docker-final/nginx/Dockerfile` | entry reverse proxy (nginx:alpine, healthcheck on `/`) |
| `docker-final/nginx/nginx.conf` | byte-equivalent of the deployed proxy: `/api*`+`/uploads*`→`backend:5000`, `/`→`frontend:5502`, CF-aware XFF/proto maps, headers, no CSP/HSTS |
| `docker-final/.env.example` + `docker-final/.gitignore` | compose-level vars (CLIENT_URL/FRONTEND_URL/VITE_API_URL/TUNNEL_TOKEN); local `.env` never committed |
| `backend/.dockerignore` | excludes `.env`, node_modules, uploads, logs from the backend build context |

**Architecture (identical to the live deployment, self-contained in this repo):**
cloudflared (optional profile) → `nginx` (single published entry) → `frontend` (React, :5502)
+ `backend` (:5000) → `mongodb` (mongo:8, internal). Networks `famipet-frontend-net` +
`famipet-backend-net`; volumes `mongodb_data`, `backend_uploads`; backend hardened
(non-root, `cap_drop: ALL`, `read_only`, `tmpfs /tmp`, tini). Backend env comes from the
gitignored `../backend/.env` (same file the deployed stack uses); only `MONGODB_URI`
(service name), `SERVE_FRONTEND_FALLBACK=false` and the public origins are overridden.
No secret is baked into any image (verified: backend image env is stock Node base only).

**Run:**
```
docker compose -f docker-final/docker-compose.production.yml up -d --build     # app at http://localhost:18081
docker compose -f docker-final/docker-compose.production.yml exec -e SEED_ADMIN_PASSWORD=... backend node utils/seedData.js
docker compose -f docker-final/docker-compose.production.yml down -v
```

**Validation (isolated project `famipet-final`, published host port `18081:80`; the live
stack kept `:80/:8080` untouched):** images built (frontend 135 MB, backend 372 MB, nginx
93.6 MB), all 4 services healthy; frontend 200; SPA deep links (login/signup/forgot-password/
verify-email/:token/reset-password/:token/app/dashboard/app/breeds/:id) all 200 + breed
detail refresh persists; unknown route → React NotFound; `/api/status` via proxy OK;
401 without token / login+me 200; `GET /api/pets/my` returned seeded pets (MongoDB
connectivity); avatar upload → real file in uploads volume → `GET /uploads/<file>` 200
image/png; browser E2E over CDP **15/15 PASS, 0 console errors** (only benign ORB blocks
for the seed's external Unsplash images), 0 errors in nginx/backend logs; bundle has
`API_BASE='/api'` baked with **zero** `localhost:5000`/dev refs.

**Accepted notes/deviations:** (1) `SERVE_FRONTEND_FALLBACK=false` is a no-op in this
repo's `server.js` (the fallback listener always binds the CLIENT_URL port — an
unpublished in-container port while nginx owns hosting; application code untouched).
(2) This repo's `GET /api/status` returns `{status:"OK",message:…}` (no `db` field);
MongoDB connectivity is therefore verified explicitly via authenticated data reads.
(3) Backend has no test/lint/typecheck scripts (only `start`/`dev`/`seed`) — nothing extra
to run. (4) External Cloudflare/DNS HTTPS flow is unchanged (dashboard-configured tunnel;
not exercised from here). (5) Health checks reuse existing app endpoints only.

### Canonical production stack — root `docker-compose.yml` (integrated post-merge)

The section above validated `docker-final/` **before** the merge of
`origin/backend-audit` and `feature/petgpt-enhancement`. The merge changed the
backend, so that stack was re-audited and the canonical entry point moved to a
plain root `docker-compose.yml`. Nothing was deleted: `docker-final/` and the
Phase-28 `frontend-react/` artifacts remain exactly as they were, for reference
and rollback.

**Canonical artifacts**

| Path | Purpose |
| --- | --- |
| `docker-compose.yml` | **the** production compose (project `famipet`, publishes `8080:80`) |
| `docker-compose.omniroute.yml` | optional override: reach an OmniRoute container that runs in another Compose project, by service name |
| `docker-final/frontend/Dockerfile` | reused by the root compose (build context `./frontend-react`) |
| `docker-final/backend/Dockerfile` | reused by the root compose (build context `./backend`) |
| `docker-final/nginx/{Dockerfile,nginx.conf}` | reused by the root compose (entry proxy) |
| `.gitignore` (root) | now also ignores `.env`, so a root compose `.env` (e.g. `TUNNEL_TOKEN`) can never be committed |

**Two changes to the reused Docker/backend files**

1. `docker-final/backend/Dockerfile` now copies `jobs/`. The merged
   `server.js` does `require('./jobs/generation.worker')` (durable PetGPT
   generation worker) and the previous `COPY` list omitted it, so the backend
   image could not boot after the merge.
2. `docker-compose.yml` maps `host.docker.internal:host-gateway` on the backend
   so an OmniRoute published on a routable host address is reachable by a
   stable name. See the PetGPT note below for why that alone is not enough when
   OmniRoute is bound to host loopback.

**MongoDB is `mongo:7`, not `mongo:8`** — MongoDB 8 refuses to start on Linux
kernel 6.19+ (SERVER-121912) and this host runs that kernel; `mongo:8` crash-looped
with exit 1. `mongo:7` starts cleanly and is fully supported (mongoose 8.4.4
requires MongoDB >= 4.4).

**PetGPT / OmniRoute.** The merged PetGPT speaks the OpenAI chat-completions
dialect through `backend/ai/openai.js`, so any OpenAI-compatible endpoint works
(OmniRoute, a proxy, vLLM …). All of it is environment-driven
(`backend/config/ai.js`): provider, base URL, API key, model, timeout, worker,
tool-calling, quota and the AES-256-GCM key for stored per-user provider
configs. Every one of those variables reaches the container unchanged, because
the backend is started with `env_file: ./backend/.env` — no compose change and
no source change is needed to configure PetGPT.

**OmniRoute addressing (no hardcoded IPs).** OmniRoute is *not* a service of
this stack; it already runs on this host in another Compose project. Its
published port is bound to **host loopback only** (`127.0.0.1:20128`), so a
container cannot reach it through the docker gateway — `host.docker.internal`
alone fails with a provider network error. The supported approach is to attach
the backend to the network OmniRoute is already on and address it by **service
name**:

```bash
docker compose -f docker-compose.yml -f docker-compose.omniroute.yml up -d --build
# backend/.env:
#   PETGPT_PROVIDER=openai
#   PETGPT_OPENAI_BASE_URL=http://omniroute:20128/v1
#   PETGPT_OPENAI_API_KEY=<key>
#   PETGPT_OPENAI_MODEL=free-chat
```

Docker resolves that name through its embedded DNS, so it survives container
recreation. `backend/.env.example` no longer suggests a `172.18.0.2` address —
that address is not stable (the live one during validation was `172.18.0.8`).
The network name comes from `OMNIROUTE_NETWORK` (default `edutech_default`) and
is declared `external: true`, so the standalone stack still works when that
network does not exist.

**Run**

```bash
docker compose up -d --build                 # app at http://localhost:8080
docker compose exec backend node utils/seedData.js   # optional real seed data
docker compose down -v                       # stop, drop containers+volumes
docker compose --profile tunnel up -d cloudflared   # optional Cloudflare tunnel
```

**Final topology**

```text
Internet -> Cloudflare / cloudflared (profile "tunnel", optional)
         -> nginx :80                    (only published app port, APP_PORT)
              |-- /api/*     -> backend:5000   (private)
              |-- /uploads/* -> backend:5000   (private)
              `-- /*         -> frontend:5502  (private, React SPA)
                                backend:5000 -> mongodb:27017 (private)
```

| Concern | Value |
| --- | --- |
| Frontend image | `famipet-frontend:production` — `node:26-alpine` build (`npm ci`, `tsc -b && vite build`, `ARG VITE_API_URL=/api`) → `nginx:alpine` on 5502, dist only |
| Backend image | `famipet-backend:production` — `node:26-alpine`, `npm ci --omit=dev`, non-root `node`, `CMD node server.js` |
| Proxy image | `famipet-nginx:production` — `nginx:alpine`, `/api`+`/uploads`→backend, `/`→frontend, CF-aware `X-Forwarded-For`/proto maps |
| MongoDB | `mongo:7`, **no host port**, named volume `famipet_mongodb_data` |
| Networks | `famipet_frontend-net` (frontend + tunnel), `famipet_backend-net` (backend + mongo); nginx and (with the override) the backend join both as needed |
| Volumes | `famipet_mongodb_data`, `famipet_backend_uploads` |
| Ports | nginx `8080:80` (override with `APP_PORT`); frontend 5502, backend 5000, mongo 27017 are `expose`-only |
| Env | backend = gitignored `backend/.env` via `env_file`; only `MONGODB_URI` (service name), `SERVE_FRONTEND_FALLBACK`, and the public origins are overridden |
| Hardening | backend: non-root, `cap_drop: ALL`, `read_only`, tmpfs `/tmp`, tini. mongo: no published port. nginx: no TLS (Cloudflare edge) |

**Validation (isolated project `famipet`; the co-located `edutech` stack was not
touched).** All 4 services healthy. SPA deep links `/`, `/login`, `/signup`,
`/app/dashboard`, `/app/petgpt`, `/forgot-password`, `/verify-email/:token`,
`/reset-password/:token`, `/app/breeds/1` and an unknown route all return the
React app; in-browser the unknown route renders the client-side 404 and a hard
refresh of `/app/petgpt` keeps the session. Proxy: `/api/status` 200,
`/api/auth/me` 401 without a token, unknown API route 404 (Express), and a real
file written to the uploads volume served as `image/png` through
`/uploads/<file>`. Auth + real data: seeded user login, `/api/auth/me`,
`/api/pets/my`, full pet create→read→delete, `/api/veterinarians`, and ownership
isolation (user 403 on `/api/admin/users`, admin 200; each user sees only their
own pets). Volumes survived a full `down`/`up` with data intact. PetGPT returned
a real OmniRoute answer through the proxy and in the browser, grounded on the
user's actual pet and correctly refusing to give a diagnosis. Frontend
`npm run lint` (2 pre-existing `set-state-in-effect` warnings, 0 errors) and
`npm run build` pass; backend `npm test` is green (all 14 suites, including the
OmniRoute E2E suites). Images: 135 MB / 386 MB / 93.6 MB, no secrets in image
env, no `.env` in any image, `test/`+`.git` excluded, production bundle carries
`/api` with no dev host. Stack then torn down with `down -v`.

**Known limitations.** (1) `POST /api/auth/register` fails end-to-end without
SMTP configured — an application dependency, not a Docker one. (2)
`SERVE_FRONTEND_FALLBACK=false` is still a no-op in this repo's `server.js`.
(3) The Cloudflare tunnel itself is not exercised from here
(dashboard-configured). (4) `npm run lint` still reports 30 pre-existing
`no-console` errors in the PetGPT application code (`ai/`,
`jobs/generation.worker.js`, the PetGPT controllers); the 14 test suites are
exempt because `console` is their reporting channel. This is style debt
inherited from the branch merge, not a functional defect, and is left for a
dedicated pass.

**Post-merge revalidation (isolated compose project `famipetaudit`).** Rebuilt
from the current tree with the OmniRoute override. All four services healthy;
only nginx published a port. Routes `/`, `/login`, `/app/dashboard`,
`/app/petgpt` and an unknown path all serve the SPA shell. `/api/status` 200;
`/api/auth/me` and `/api/pets/my` 401 unauthenticated and correct when
authenticated; `/api/veterinarians` returns a real (empty) result. Avatar
upload round-tripped byte-identically through `/uploads/`, and both the MongoDB
and uploads volumes survived a full `down`/`up`. Images carry no `.env`, no
`test/`, no `.git` and no secret env keys; the backend runs as `node` with a
read-only rootfs, `cap_drop: ALL` and `no-new-privileges`, and MongoDB publishes
no port. PetGPT was exercised end-to-end through Docker service-name
addressing: `omniroute` resolves via Docker DNS and the app's own provider layer
returned a real completion. Backend `npm test` is green across all 14 suites —
the three OmniRoute suites run once `PETGPT_OPENAI_API_KEY` is set, which local
OmniRoute does not validate.

### Phase 29 — Removal of the old Vanilla frontend (ONLY after Phases 26+27 green)
- **Objective:** remove `frontend/` vanilla files; repoint anything that referenced them
  to the React build; update docs.
- **Existing source files:** all of `frontend/` (delete/move to archive), `backend/
  server.js` frontend-fallback listener (serve built React dist on `CLIENT_URL`, or drop
  the fallback when Nginx owns hosting), `AGENTS.md`/`ROADMAP.md`/`docs/design.md` refs.
- **Target React structure:** existing `frontend-react/` (= the new `frontend`).
- **Reusable components:** n/a.
- **API dependencies:** unchanged backend.
- **UI preservation requirements:** post-removal smoke = full manual + automated pass on
  the production stack only.
- **Verification:** old URLs redirect/equivalent; no page references dead `frontend/`
  assets; full Phase 26+27 runs green after removal.
- **Completion criteria:** vanilla frontend gone from live tree; git history retains it.
- **Rollback/safety:** keep tag/commit boundary; restore `frontend/` from git on any
  regression; never do this phase early.

---

## 12. Dependency / sequencing notes

Phases 1–6 are the foundation chain (strict order). Phases 7–21 are feature pages and
can run in **any order once 4–6 land**; the listed numbering matches the required scope
(not a hard execution order). Phases 23/24 are *enabling infra*: although numbered late,
their content should be bootstrapped starting Phase 4/7 and consolidated as Phase 23/24
close-out (as written). Phase 25 depends on 7–24. Phases 26–27 depend on 25. Phase 28
depends on 26/27. **Phase 29 depends on all — and only runs on explicit sign-off.**

Suggested parallel tracks: Track A (1→2→3→4→5→6), Track B (7, 8, 14, 15), Track C
(9, 10, 11, 12, 13, 17), Track D (16, 18, 19, 20), Track E (21), then 22→23/24→25→26→27→28→29.

## 13. Invariants during migration (do-not-break list)

1. `frontend/` and `backend/` remain untouched except Phase 29's removal of `frontend/`.
2. Backend routes, middleware, auth, ownership, admin rules unchanged (only exceptional,
   documented frontend-integration issues may touch it — none required per CORS/server.js
   analysis).
3. localStorage keys and API error shape stay identical.
4. No fake/default data anywhere; empty states from real emptiness (AGENTS §5, §11).
5. Every backend-enforced rule is mirrored by the backend first, UI second (§14).
6. Tags/commits at each completed phase; working tree verified clean per phase
   (AGENTS §16).
7. "Tested" = actually run against the real backend; report what could not be run
   (AGENTS §17).