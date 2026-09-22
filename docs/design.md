# FamiPet — Frontend Design Reference (Vanilla HTML/CSS/JS)

Source-of-truth documentation of the **existing** frontend. Written to guide a future
React + Tailwind migration. Nothing here is aspirational — every value, class, and
inconsistency below was extracted verbatim from the current code.

Scope: `frontend/` (landing, auth, user app, admin). Backend is out of scope.

---

## 1. Design Tokens

### 1.1 Global tokens — `frontend/css/style.css` (`:root`)

Used by landing (`index.html`) and all auth pages.

| Token | Value |
|---|---|
| `--primary` | `#FF5C8A` (pink) |
| `--primary-dark` | `#F5427B` |
| `--primary-light` | `#FFEAF2` |
| `--secondary` | `#4AA8FF` (blue) |
| `--secondary-light` | `#EAF6FF` |
| `--success` | `#38C976` |
| `--success-light` | `#EAFBF2` |
| `--purple` | `#9B6DFF` |
| `--purple-light` | `#F2ECFF` |
| `--orange` | `#FFB84D` |
| `--orange-light` | `#FFF3DD` |
| `--text-dark` | `#3D2314` (brown-black) |
| `--text-light` | `#777` |
| `--white` | `#fff` |
| `--background` | `#FFF9F6` (warm off-white) |
| `--border` | `#FFE7EE` |
| `--radius` | `22px` |
| `--section-padding` | `100px` |
| `--shadow` | `0 15px 35px rgba(0,0,0,.08)` |
| `--transition` | `.35s ease` |
| `--navbar-height` | `90px` |

Base resets (style.css): `body` font-family `Poppins`, bg `--background`, color
`--text-dark`, `overflow-x:hidden`; `.container{width:min(90%,1350px);margin-inline:auto}`;
`html{scroll-behavior:smooth;scroll-padding-top:90px}`; global `img{width:100%;display:block}`,
`a{text-decoration:none;color:inherit}`, `ul{list-style:none}`, `button{border:none;outline:none;cursor:pointer}`.

### 1.2 Auth token set — `frontend/css/login.css` (own `:root`)

| Token | Value |
|---|---|
| `--primary` | `#FF5C8A` |
| `--primary-light` | `#FFEAF2` |
| `--secondary` | `#4AA8FF` |
| `--secondary-light` | `#EAF6FF` |
| `--text-dark` | `#3F2519` (≠ style.css `#3D2314`) |
| `--text-light` | `#6B7280` (≠ style.css `#777`) |

Body on auth pages: bg `#F6FBFF` (overrides style.css `--background`).

### 1.3 User-app token sets (each page CSS has its OWN `:root`; names collide, values differ)

**`dashboard.css`** — lavender/pink/blue/mint/peach 5-color system + neutrals:

- Brand colors: `--lavender:#8d6bd1` / `--lavender-dark:#7453b8` / `--lavender-light:#eee5ff` / `--lavender-soft:#f7f2ff`; `--pink:#ef78a9`/`--pink-dark:#dc5d91`/`--pink-light:#fde5ef`; `--blue:#79aee8`/`--blue-dark:#568dca`/`--blue-light:#e5f2ff`; `--mint:#76c6a0`/`--mint-dark:#54a982`/`--mint-light:#e5f7ef`; `--peach:#f1a37f`/`--peach-dark:#dc8662`/`--peach-light:#fff0e8`
- Semantics: `--page-bg:#fbfaff`; `--sidebar-bg:#f8f4ff`; `--card-bg:#ffffff`; `--text-main:#17223b`; `--text-dark:#202a44`; `--text-medium:#5f6f8f`; `--text-light:#8793aa`; `--border:#ebe7f3`; `--border-light:#f0edf6`
- Shape/shadow: `--radius-sm:10px` `/ --radius-md:16px` `/ --radius-lg:22px` `/ --radius-xl:28px`; `--shadow-xs/-sm/-md/-lg`; `--sidebar-width:285px`; `--sidebar-collapsed:88px`

**`mypet.css`** — flat, bootstrap-like: `--bg-color:#f7f8fc`; `--sidebar-bg:#fff`; `--text-main:#2d3748`; `--text-sub:#8c98a4`; `--primary-pink:#ff4d6d`; `--light-pink:#fff0f3`; `--border-color:#edf2f7`; status vars `--green-bg:#eefbf3`/`--green-text:#27ae60`, `--purple-bg:#f5f0ff`/`--purple-text:#8e44ad`, `--blue-bg:#ebf5ff`/`--blue-text:#2980b9`

**`community.css`** — `--pink:#ed6590`; `--blue:#4f83b5`; `--green:#48ad8d`; `--purple:#8d76d5`; `--orange:#f3a035`; `--text-dark:#14233d`; `--text:#334c69`; `--muted:#8293a8`; `--border:#e5ebf1`; `--background:#f8fafc` (each also has a `*-light` variant)

**`lost-found.css`** — `--pink:#ed6b95`; `--blue:#6da8df`; `--green:#55b993`; `--purple:#8d75d2`; `--text-dark:#16243d`; `--text:#536987`; `--muted:#8b99ad`; `--border:#e7eaf0`; `--background:#fbfbfd` (with `*-dark`/`*-light` variants)

**`settings.css`** — `--settings-bg:#faf9fd`; `--text:#17223b`; `--text-light:#66748e`; `--muted:#909bb0`; `--purple:#8b61d8`/`--purple-dark:#774bc9`/`--purple-light:#f0e8ff`; `--pink:#ff5d87`/`--pink-light:#ffeaf1`; `--green:#42b982`; `--border:#ebe6f2`

**`health.css`** — palette surfaced in output: `#5b9bd5`, `#243b53`, tints `#e8f6f2`, `#e3f0fc`; green/teal accent family.

**`appointments.css`** — `#5b9bd5`, `#243b53`, tints `#e8f6f2`, `#e3f0fc`.

**`reminders.css`** — `#ef78a2`, `#f2a43a`, `#9b82df`, `#5b9bd5`, `#4db394` with `#eee9fc`/`#fdeaf2` tints.

**`adoption.css`** — inline palette `#ff4d6d`, `#f43f5e`, `#ef476f`, counters `#475569`/`#64748b`/`#1e293b`.

**`petgpt.css`** — `#8d68d8` (chat-bubble purple), `#65738e` (secondary).

**`signup.css`** — uses `#4AA8FF` gradient system (`linear-gradient(135deg,#4AA8FF,#6CC3FF)` checked cards, `#22C55E` success).

**`admin.css`** — its own admin palette (see §1.5).

### 1.4 Fonts (per page — inconsistent, documented as-is)

| Page/area | Font stack |
|---|---|
| Landing + all auth | `Poppins` 300–800 (Google Fonts) |
| Dashboard | `DM Sans` (body) + `Playfair Display` (headings) |
| Adoption, Appointments, Health | `Plus Jakarta Sans` |
| Community, Lost & Found, Settings, PetGPT | `Poppins` 400–800 |
| My Pet | `'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif` (NO Google Fonts) |
| Admin | system stack `'Segoe UI', system-ui, -apple-system, sans-serif` (NO Google Fonts) |
| Global sidebar | forces `font-family: Poppins !important` via sidebar.css regardless of page |

### 1.5 Admin tokens — `frontend/admin/css/admin.css`

Own, self-contained system. Dark slate `#1e293b`/`#0f172a` nav + light tables; danger
`#dc2626`; derived from a light `#f1f5f9` table surface. Uses only Font Awesome 6.4.0,
no Google Fonts. (Extract exact `:root` values during migration — read `admin.css` fully
then.)

---

## 2. Component Inventory

Conventions: `[file] .class` → role. `css/` = `frontend/css`, `admin/` = `frontend/admin`.

### 2.1 Shared / global components

- `css/navbar.css`: `.header` (sticky, `rgba(255,249,246,.9)` + `backdrop-filter:blur(12px)`, `box-shadow:0 8px 30px rgba(0,0,0,.05)`), `.navbar` (90px, space-between), `.logo img` (130px), `.nav-links` (gap 40px, 15px/500/`#3D2314`, hover+active `#FF5C8A`, `.active::after` 2px underline), `.theme-btn` (48×48, radius 50%), `.menu-toggle` (mobile hamburger).
- `css/footer.css`: bg `#2C1A12`, `border-top:4px solid var(--primary)`, padding `80px 0 30px`, `margin-top:var(--section-padding)`; links `rgba(255,255,255,.75)` → hover `var(--primary)`; newsletter input pill radius 60px, bg `rgba(255,255,255,.08)`.
- `css/sidebar.css` + `js/sidebar.js`: universal app sidebar injected into `#sidebar-container`. Fixed 288px, bg `#fff9fb`, `border-right:1px solid #f1e5eb`, z-index 1000; `body:has(#sidebar-container){display:flex;min-height:100vh;overflow:hidden}`. Collapsed variant (88px) exists in JS/CSS; desktop offset rules commented out in responsive.css. Nav items exposed as `.nav-group`, `.nav-item`, `.nav-link`, `.nav-link.active`.
- Buttons: `.btn`, `.btn-pink` (app pages), `.primary-btn`/`.secondary-btn` (landing: 16px/30px padding, radius 15px, primary hover `translateY(-4px)` + shadow `rgba(255,92,138,.35)`), `.submit-btn` (auth, full-width 58px pill, gradient blue), `.action-btn`, `.filter-btn`, `.icon-action-btn`, `.badge-btn + .badge` (count bubble, e.g. badge `3` on My Pet / dashboard top bar), `.theme-btn`/`.theme-toggle`.

### 2.2 Auth components (login.css + signup.css)

- Layout: `.login-page`, `.login-container` (grid `1.1fr/.9fr`, max-width 1250px), `.login-left` (brand, tagline, hero-text, hero-image), `.login-right`, `.login-card` (glass `rgba(255,255,255,.55)` + `blur(20px)`, radius 35px).
- Signup-specific (signup.css): `.brand-logo` (65px), `.paw-icon` (72px), `.input-box` (58px fields, radius 18px, bg `#F7F9FC`, focus `#4AA8FF` ✛ shadow), `.toggle-password/.toggle-confirm-password` eye icons, `.strength-bar` + `#strengthText` (password strength), `.role-selection` (3-col grid) + `.role-card` (hidden radio, `:has(input:checked)` gradient fill, hover lift 6px), `.form-options` (terms checkbox, `accent-color:#4AA8FF`), `.divider`, `.signup-text`, `.error` (inline, `#EF4444`, **defined only in signup.css**), `.success-toast` (slide-in right, `border-left:6px solid #22C55E`).

### 2.3 User-app page components (per page CSS)

- **Dashboard** (`dashboard.css`): `.main-content` (margin-left `var(--sidebar-width)`), `.top-header`, `.hamburger-btn` (42px, hidden desktop), `.welcome-text h1` (`clamp(25px,2.3vw,36px)`, 800, `-1px` tracking), `.header-actions`, `.search-bar` (rounded pill, `:focus-within`), `.notification-btn`, `.notification-panel` (dropdown, `.show`), `.stats-grid` + `.stat-card` (hover lift; 4-col), `.dashboard-grid`, `.dashboard-card`/`.card-header h2/p`, `.pets-list`, `.pet-card`, `.adoption-card`, `.appointment-card`, `.reminder-card`, `.appointment-box`, `.appointment-button`, `.love-card`, `.profile-card`.
- **My Pet** (`mypet.css`): `.page-title-group`, `.search-bar`, `.status-badge` (`.green`/`.purple`/`.blue` pills), `.pet-card`, pet summary stats (4-col), heart/cherry emoji in header.
- **Health** (`health.css` + `.top-bar`, `.page-title-group`, `.title-row`): health records, vaccination card list, `.status-badge`.
- **Adoption** (`adoption.css` + `.top-bar`, `.search-box`, `.filter-btn`): adoption gallery cards, `.pet-counter-badge`, `.card-footer`, filter chips.
- **Appointments** (`appointments.css`): `.appointment-list`, date/time chips, status pills.
- **Reminders** (`reminders.css`): `.reminder-list`, due-date pills, colored reminder-type chips (cat/dog/vaccine/food), `.progress`?
- **Community** (`community.css`): `.community-feed`, post cards, user avatar, reaction buttons.
- **Lost & Found** (`lost-found.css`): photo cards grid, status badges (found/lost), filter chips, upload CTA.
- **PetGPT** (`petgpt.css`): `.chat-layout`, message bubbles `.user`/`.ai`, quick-suggestion chips, typing indicator, input bar.
- **Settings** (`settings.css`): `.settings-layout` (account/profile blocks), `.settings-card`, form rows, danger zone.
- **Breeds / Breed-details / Pet-ID**: `.breed-card`, `.breed-card-list`, breed-detail hero section, adoption CTA. (Inline/extended values — read per page during migration.)

### 2.4 Admin components (admin/… + admin.css; shared skeleton)

All 6 pages: `body[data-page=…]` → `.admin-wrap{display:flex}` → `aside.admin-sidebar#adminSidebar` (logo + nav, injected by `admin.js`) + `main.admin-main` → `header.admin-topbar` (page title + admin badges) + `section.admin-card` containing a table (`.admin-table`). Font Awesome table actions, `.table-actions` buttons, row status pills, empty state / initial "loading…" row (spanning full width), `.pagination`-ish controls.

JS per admin page: `js/api.js` + `js/admin.js` (sidebar/topbar render, logout) + `js/admin-{pets,users,adoptions,community,lost-found}.js` + `js/admin-dashboard.js` (stats fetch).

### 2.5 Cross-cutting JS components

- `js/theme.js`: toggles `body.dark-theme`, key `famipetTheme` in localStorage, swaps `fa-sun`/`fa-moon` on `#themeBtn`/`#themeToggle`/`.theme-btn`/`.theme-toggle`; exposes `window.FamiPetTheme.{dark,light,toggle}`.
- `js/sidebar.js`: 837 lines — builds universal sidebar into `#sidebar-container`, active-link highlight from current path, collapse toggle, mobile overlay behavior.
- `js/main.js`: only binds `#backToTop` scroll-to-top.
- `js/home.js`: landing animations/initialization.
- `js/api.js`: token/user helpers (`famipetToken`, `famipetUser`), fetch wrapper against `http://localhost:5000/api`, `isLoggedIn()`, `isAdmin()`.
- Page JS: form validation + toasts (auth), CRUD rendering (dashboard data, mypet, health), chat send (petgpt), search/filter (adoption, lost-found, community), reminders scheduling UI (reminders.js), appointment date picker logic (appointments.js).
- Common runtime classes emitted by JS: `.success-toast.show`, `body.dark-theme`, sidebar `.active`, table "loading" rows, empty-state blocks.

---

## 3. Layout Inventory

- **Landing**: full-page sections — `.hero`, services grid, about, why-us, join-us, contact — all inside `.container` (min(90%, 1350px)), navbar sticky top, footer at bottom.
- **Auth**: centered `.login-page` (min-height 100vh) → `.login-container` two-column grid; `.login-left` (brand + hero art) hidden ≤1200px, right column stacks the card. Signup changes grid ratio to `1.15fr/.85fr`/1400px and hides left column at its own breakpoint.
- **User app**: `body:has(#sidebar-container)` flex row. `.main-content` (dashboard.css) offset by `margin-left:var(--sidebar-width)`; sibling pages use `.app`/`.app-container` + `.main-content`. Two header variants exist: `.top-header` (dashboard, mypet) and `.top-bar` containing `.page-title-group` + `.title-row` (health, adoption, appointments, reminders); `.page-header` is the community/lost-found/near-label variant. All share the injected universal sidebar.
- **Admin**: single fixed-width left sidebar + fluid main column; no reuse of the user-app sidebar.

---

## 4. Page Inventory

**Landing**: `index.html` — header/.navbar, hero, services (6), about, why-us, join-us, contact, footer. CSS: style, navbar, home, footer, responsive.

**Auth** (login, signup, forgot-password, reset-password, verify-email) — shared login.css split layout; forgot/reset/verify additionally link style.css + login.css + responsive.css. Signup is the only one with role cards + strength bar. Reservation: auth pages render `.error` blocks but **signup.css is not linked on forgot/reset/verify** even though those pages use `.error`.

**User app pages** (all with universal sidebar): dashboard, mypet, health, adoption, appointments, reminders, breeds, breed-details, pet-id, community, lost-found, petgpt, settings.

**Admin** (6): dashboard, pets, users, adoptions, community, lost-found — every page same skeleton.

**Verified page→asset wiring:** landing/auth use `logos/Famipet.png`; hero art from `assets/images/hero/`; dashboard banner, adoption hero, my-pet portraits, lost-found photos, Pet-gpt robot images as referenced in each HTML.

---

## 5. Static Resource Inventory

`frontend/assets/`:
- `images/hero/` ≈4.1M — landing hero art.
- `images/adoption/` ≈6.1M — incl. `Hero-Page.png`, `Mainn-bg.png`, `Mainn.png`, `Main.png`, `pet1-8.jpg`.
- `images/dashboard/` ≈3.1M — incl. `banner.png`, `cute-pet.svg`, `golden-retriever.png`, `pet-adopt.png`.
- `images/my-pet/` ≈1.4M — pet portraits.
- `images/lost-found/` ≈3.6M — lost/found photos.
- `images/Pet-gpt/` ≈336K — chat/robot imagery.
- `icons/` ≈2.3M — 13 SVGs: `ai.svg, allheart.svg, community.svg, health.svg, lost-found.svg, nutrition.svg, paw.svg, pet-adoption.svg, robot.svg, shield.svg, vaccination.svg, vet-shield.svg, vet.svg`.
- `logos/` ≈444K — `Famipet.png` (primary brand logo).

Dependencies (external CDN):
- Google Fonts (varies per page — see §1.4).
- Font Awesome 6.7.2 (landing/auth), 6.5.1 (health, adoption), 6.5.2 (community, lost-found), 6.4.0 (mypet, admin).
- Lucide (unpkg, script tag) on dashboard, mypet, settings, petgpt, health, community, lost-found — wired but used inconsistently (adoption loads it yet uses only FA icons).

---

## 6. Responsive Behavior

- `css/responsive.css` is the LAST stylesheet on most pages → its universal overrides win: `html,body{width:100%;overflow-x:hidden}`; `img,svg,video,canvas{max-width:100%}`.
- Navbar/footer: at `max-width:992px` the `.nav-menu`, `.nav-right` hide, `.menu-toggle` shows.
- Tablet `@media (max-width:1100px)`: grid-heavy layouts collapse to 1 column — dashboard-grid, health-grid, reminder-main-grid, appointment-main-grid, settings-layout, community-layout, petgpt-layout; `stats-*` grids go 2-col.
- Sidebar: `--sidebar-width` drops to 250px at a breakpoint; `--sidebar-collapsed:88px` exists for collapse mode. **Desktop sidebar off-set rules are commented out** in responsive.css (rely on dashboard.css `margin-left`); hamburger only visible on smaller widths.
- Auth: login-container → 1 column + hide `.login-left` ≤1200px; card radius 28px ≤768px; signup `.role-selection` → 1 column ≤768px.
- Breakpoints in play: 1200px, 1100px, 992px, 768px, phone-widths (e.g. 480px `pet-card` stacks).

---

## 7. Theme Behavior

- Mechanism: `js/theme.js` toggles `body.dark-theme`; persists `localStorage.famipetTheme` (`"dark"`/`"light"`, default light).
- Icon swap: `fa-regular fa-sun` (light) ⇄ `fa-regular fa-moon` (dark) on every theme button; sets `aria-label`/`title`.
- Coverage: **only dashboard.css** (and mypet, and partial sidebar) define `body.dark-theme ...` overrides (`--page-bg:#171523`, `--sidebar-bg:#1c1929`, `--card-bg:#211e30`, light text `#f5f2ff`, per-card dark overrides, scrollbar). Other pages ship the button but little/no dark styling.
- The old class name `dark-mode` is explicitly removed on apply (only `dark-theme` is current).
- Admin has no dark mode (no theme.js).

---

## 8. Known Inconsistencies / Ambiguities (documented as-is)

1. **Fonts diverge per page** — Poppins / DM Sans+Playfair / Plus Jakarta Sans / system-stack, with sidebar force-overriding to Poppins `!important`.
2. **Token names collide across files with different values** — `--primary` (pink vs blue vs none), `--border`, `--background`, `--text-dark/#3D2314` vs `#3F2519` (login) vs `#16243d`/`#14233d`, `--text-light/#777` vs `#6B7280`. Each page CSS is effectively its own design system rooted on the SAME component class names (`.top-bar`, `.search-bar`, `.btn-pink`, `.stat-card`).
3. **`signup.css` defines `.error` — no other auth stylesheet does**; forgot/reset/verify rely on it but never link it (dead styling unless signup loaded). Verdict: single source, move to one shared sheet.
4. **Font Awesome version drift** — 6.7.2 / 6.5.1 / 6.5.2 / 6.4.0 across pages; icons used under `fa-*` classes are consistent, but a bundled FA via npm/Tailwind would be the migration target.
5. **Lucide loaded on many pages, used on few**; adoption loads it unused (all adoption icons are FA).
6. **Sidebar collapse is half-wired** — collapsed width + JS exist; desktop offset rules commented out. Behavior on desktop currently = fixed open sidebar.
7. **Dark theme is dashboard-only** — button present app-wide, styling only really exists in dashboard.css (plus some pages).
8. **Wrapper naming is inconsistent** — `.top-header` vs `.top-bar` vs `.page-header` vs dual `<input>`/hidden-variant headers across pages; `.app`/`.app-container`/`.main-content` used interchangeably.
9. **Auth → validation messages** (`#EF4444`) only styled where signup.css loads.
10. **Admin is a separate design system** — no shared `../css` reuse, no Google fonts, different nav, no dark mode; admin sidebar is re-implemented (not reusing sidebar.js) via admin.js.
11. **Hardcoded colors** abound outside :root (auth `#F7F9FC`, `#E8EDF5`, signup gradients, health/adoption/inline palettes) — Tailwind migration must consolidate or preserve as-is (no redesign).

---

### Migration-notes (for the future task, NOT implemented)

- Single token map = §1.1 global + §1.3 per-page sets (keep names, pick winners per page, unify later).
- Component parity list = §2; verify against this doc before replacing.
- No dependency changes were made in producing this document.