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
  deltas (design.md §8.1–§8.11) in the Phase 25 visual-regression report.
- Incremental and independently verifiable. Each phase is additive, runs beside the old
  frontend, and can be reverted individually.
- Backend (`backend/`, Express + MongoDB) stays untouched. CORS already accepts any
  `localhost`/`127.0.0.1`/private-range origin (server.js `isDevOrigin`), so Vite (5173)
  and Nginx proxies work without backend changes.
- The old vanilla frontend is **not deleted** until Phase 28, after full verification.

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
| 14    | Reminders                      | [x]    | —            |
| 15    | Notifications                  | [x]    | Phases 10–14 |
| 16    | Community                      | [x]    | —            |
| 17    | Favorites                      | [ ]    | —            |
| 18    | Adoption                       | [ ]    | —            |
| 19    | Lost & Found                   | [ ]    | —            |
| 20    | AI/PetGPT                      | [ ]    | —            |
| 21    | Admin panel                    | [ ]    | —            |
| 22    | API integration layer          | [ ]    | —            |
| 23    | Auth/state management          | [ ]    | —            |
| 24    | Responsive behavior            | [ ]    | —            |
| 25    | Visual regression              | [ ]    | —            |
| 26    | Functional regression          | [ ]    | —            |
| 27    | Docker/Nginx integration       | [ ]    | —            |
| 28    | Removal of old Vanilla frontend | [ ]    | —            |

Status legend: `[ ]` not started · `[~]` in progress · `[x]` completed and pushed ·
`[-]` intentionally skipped · `[!]` blocked/problem.

Renumbering note: the current roadmap executes **Community as Phase 15**, because the
Notifications sprint (plan §15) was delivered incrementally inside Phases 10–14
(shared `NotificationBell`/`NotificationPanel`, `useNotifications`, `api/notifications.ts`
— consumed by Dashboard, Health, Appointments, and now Community). The phase sections
below keep the original plan numbering (Notifications §15, Community §16) for traceability.

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
├─ Dockerfile  nginx.conf                          (Phase 27)
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
(Phase 27).

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
  Phase 25 visual regression.

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
  Vanilla counterpart to port and is tracked as an open question for Phase 22.
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
   re-verify before Phase 25.
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

### Phase 15 — Notifications
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

### Phase 16 — Community
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

### Phase 17 — Favorites
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

### Phase 18 — Adoption
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

### Phase 19 — Lost & Found
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

### Phase 20 — AI / PetGPT
- **Objective:** chat UI (bubbles, typing indicator, quick suggests, find-a-vet modal)
  wired to the real AI backend.
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

### Phase 22 — API integration layer (formalization)
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

### Phase 23 — Authentication / state management (consolidation)
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

### Phase 24 — Responsive behavior
- **Objective:** grid/typography breakpoints parity across every page (Tailwind) —
  1200 (auth), 1100 (app grids→1-col, stats→2-col), 992 (nav/menu + hamburger + sidebar
  collapse), 768 (auth card radius 28px, role grid 1-col), ~480 (pet-card stacks);
  `overflow-x:hidden` and `img max-width:100%` globals.
- **Existing source files:** `css/responsive.css` (universal overrides), `css/sidebar.css`
  collapse, per-page grid rules.
- **Target React structure:** tokenized breakpoints in `tailwind.config`; per-page
  responsive classes.
- **Reusable components:** responsive variants of grid components.
- **API dependencies:** none.
- **UI preservation requirements:** identical layout at 1280/1024/768/480 on key pages;
  hamburger + sidebar collapse on mobile; grids collapse to 1-col parity.
- **Verification:** full-page screenshots at the 4 widths, diff against old site.
- **Completion criteria:** responsive parity across all pages at all breakpoints.
- **Rollback/safety:** additive CSS; wander minimal.

### Phase 25 — Visual regression
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

### Phase 26 — Functional regression
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

### Phase 27 — Docker / Nginx integration
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

### Phase 28 — Removal of the old Vanilla frontend (ONLY after Phases 25+26 green)
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
  assets; full Phase 25+26 runs green after removal.
- **Completion criteria:** vanilla frontend gone from live tree; git history retains it.
- **Rollback/safety:** keep tag/commit boundary; restore `frontend/` from git on any
  regression; never do this phase early.

---

## 12. Dependency / sequencing notes

Phases 1–6 are the foundation chain (strict order). Phases 7–21 are feature pages and
can run in **any order once 4–6 land**; the listed numbering matches the required scope
(not a hard execution order). Phases 22/23 are *enabling infra*: although numbered late,
their content should be bootstrapped starting Phase 4/7 and consolidated as Phase 22/23
close-out (as written). Phase 24 depends on 7–21. Phases 25–26 depend on 24. Phase 27
depends on 25/26. **Phase 28 depends on all — and only runs on explicit sign-off.**

Suggested parallel tracks: Track A (1→2→3→4→5→6), Track B (7, 8, 14, 15), Track C
(9, 10, 11, 12, 13, 17), Track D (16, 18, 19, 20), Track E (21), then 22/23→24→25→26→27→28.

## 13. Invariants during migration (do-not-break list)

1. `frontend/` and `backend/` remain untouched except Phase 28's removal of `frontend/`.
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