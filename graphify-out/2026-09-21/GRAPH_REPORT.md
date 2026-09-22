# Graph Report - FamiPet  (2026-09-21)

## Corpus Check
- 112 files · ~2,874,924 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 970 nodes · 1401 edges · 67 communities (58 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `118d2989`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- user.routes.js
- routeConfig.tsx
- admin.controller.js
- devDependencies
- community.js
- pet.controller.js
- auth.controller.js
- 11. Phased Plan
- reminders.js
- FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind
- adoption.js
- health.js
- mypet.js
- appointments.js
- compilerOptions
- FamiPet — Agent Instructions
- FamiPet — Frontend Design Reference (Vanilla HTML/CSS/JS)
- lost-found.js
- signup.js
- compilerOptions
- community.routes.js
- seedData.js
- health.routes.js
- reminder.routes.js
- vaccination.routes.js
- appointment.controller.js
- adoption.controller.js
- dashboard-data.js
- server.js
- breed.routes.js
- notification.routes.js
- veterinarian.routes.js
- petgpt.js
- reset-password.js
- auth.js
- breed-details.js
- FAMIPET — STEP 10 FINAL REPORT
- pet-id.js
- login.js
- admin-lost-found.js
- breeds.js
- lostFound.routes.js
- home.js
- admin-adoptions.js
- admin-community.js
- admin-pets.js
- forgot-password.js
- theme.js
- admin-dashboard.js
- admin-users.js
- settings.js
- sidebar.js
- React + TypeScript + Vite
- database.js
- gemini.js
- Appointment.js
- Notification.js
- Veterinarian.js
- tsconfig.json
- api.js

## God Nodes (most connected - your core abstractions)
1. `11. Phased Plan` - 29 edges
2. `FamiPet — Agent Instructions` - 22 edges
3. `compilerOptions` - 18 edges
4. `protect()` - 17 edges
5. `FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind` - 16 edges
6. `compilerOptions` - 15 edges
7. `Migration Execution Protocol` - 12 edges
8. `setupEvents()` - 11 edges
9. `init()` - 11 edges
10. `openPetModal()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `forgotPassword()` --calls--> `sendEmail()`  [EXTRACTED]
  backend/controllers/auth.controller.js → backend/config/email.js
- `register()` --calls--> `sendEmail()`  [EXTRACTED]
  backend/controllers/auth.controller.js → backend/config/email.js
- `resendVerification()` --calls--> `sendEmail()`  [EXTRACTED]
  backend/controllers/auth.controller.js → backend/config/email.js

## Import Cycles
- None detected.

## Communities (67 total, 9 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, bcryptjs, cloudinary, compression, cors, dotenv, express, express-validator (+38 more)

### Community 1 - "user.routes.js"
Cohesion: 0.06
Nodes (32): addFavorite(), Favorite, getFavorites(), mongoose, Pet, removeFavorite(), User, cloudinary (+24 more)

### Community 2 - "routeConfig.tsx"
Cohesion: 0.07
Nodes (26): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, App(), Theme, ThemeContext (+18 more)

### Community 3 - "admin.controller.js"
Cohesion: 0.08
Nodes (27): Adoption, CommunityPost, deleteCommunityPost(), deleteLostFoundReport(), deletePet(), deleteUser(), getAllCommunityPosts(), getAllLostFoundReports() (+19 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (35): dependencies, react, react-dom, react-router-dom, devDependencies, oxlint, tailwindcss, @tailwindcss/vite (+27 more)

### Community 5 - "community.js"
Cohesion: 0.14
Nodes (31): addComment(), run(), applyFilters(), attachAllInteractions(), attachCommentButton(), attachLikeButton(), attachMoreButton(), attachShareButton() (+23 more)

### Community 6 - "pet.controller.js"
Cohesion: 0.07
Nodes (18): askPetGPT(), callGemini(), fallbackAnswer(), getPetAdvice(), mongoose, Pet, Breed, mongoose (+10 more)

### Community 7 - "auth.controller.js"
Cohesion: 0.12
Nodes (24): nodemailer, sendEmail(), transporter, changePassword(), crypto, forgotPassword(), generateToken(), getClientBase() (+16 more)

### Community 8 - "11. Phased Plan"
Cohesion: 0.07
Nodes (29): 11. Phased Plan, Phase 10 — Health, Phase 11 — Vaccinations, Phase 12 — Appointments, Phase 13 — Veterinarians, Phase 14 — Reminders, Phase 15 — Notifications, Phase 16 — Community (+21 more)

### Community 9 - "reminders.js"
Cohesion: 0.16
Nodes (26): bindMoreButtons(), closeReminderMenus(), completeReminder(), convertTimeToInput(), deleteReminder(), escapeHTML(), formatBackendTime(), formatDate() (+18 more)

### Community 10 - "FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind"
Cohesion: 0.07
Nodes (27): 10. Authentication Strategy, 10. Rollback safety, 12. Dependency / sequencing notes, 13. Invariants during migration (do-not-break list), 1. One phase at a time, 1. Purpose & Principles, 2. Proposed React Project Structure, 2. Read before implementing (+19 more)

### Community 11 - "adoption.js"
Cohesion: 0.13
Nodes (23): addPetBtn, adoptionType(), categoryCards, closeDetailModal(), createModal(), close(), defaultPetsData, detailModal (+15 more)

### Community 12 - "health.js"
Cohesion: 0.20
Nodes (25): addNotification(), closeModal(), escapeHtml(), fetchHealthRecords(), fetchNotifications(), fetchPets(), fetchVaccinations(), formatDate() (+17 more)

### Community 13 - "mypet.js"
Cohesion: 0.19
Nodes (24): addNewPet(), buildPetPayload(), capFirst(), createPetCard(), createPetOnBackend(), deletePet(), deletePetOnBackend(), editPet() (+16 more)

### Community 14 - "appointments.js"
Cohesion: 0.18
Nodes (21): addNotification(), closeBookingModal(), closeRescheduleModal(), formatBackendDate(), formatBackendTime(), formatDate(), loadAppointments(), mapStatusFromBackend() (+13 more)

### Community 15 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 16 - "FamiPet — Agent Instructions"
Cohesion: 0.09
Nodes (22): 10. Digital Pet ID / QR, 11. Empty States, 12. Validation & Error Handling, 13. API Changes, 14. Security, 15. Existing Functionality Comes First, 16. Development Workflow, 17. Testing Rules (+14 more)

### Community 17 - "FamiPet — Frontend Design Reference (Vanilla HTML/CSS/JS)"
Cohesion: 0.10
Nodes (20): 1.1 Global tokens — `frontend/css/style.css` (`:root`), 1.2 Auth token set — `frontend/css/login.css` (own `:root`), 1.3 User-app token sets (each page CSS has its OWN `:root`; names collide, values differ), 1.4 Fonts (per page — inconsistent, documented as-is), 1.5 Admin tokens — `frontend/admin/css/admin.css`, 1. Design Tokens, 2.1 Shared / global components, 2.2 Auth components (login.css + signup.css) (+12 more)

### Community 18 - "lost-found.js"
Cohesion: 0.21
Nodes (20): clearFilters(), closeAllOverlays(), closeModal(), closeNotificationOutside(), createPetCard(), escapeHTML(), fileToDataURL(), formatDate() (+12 more)

### Community 19 - "signup.js"
Cohesion: 0.10
Nodes (20): confirmPassword, confirmPasswordError, email, emailError, fullName, nameError, password, passwordError (+12 more)

### Community 20 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 21 - "community.routes.js"
Cohesion: 0.15
Nodes (16): addComment(), CommunityPost, createPost(), deleteComment(), deletePost(), getAllPosts(), getPostById(), toggleLike() (+8 more)

### Community 22 - "seedData.js"
Cohesion: 0.11
Nodes (16): adoptionSchema, mongoose, Adoption, Appointment, bcrypt, Breed, CommunityPost, HealthRecord (+8 more)

### Community 23 - "health.routes.js"
Cohesion: 0.15
Nodes (14): createHealthRecord(), deleteHealthRecord(), getHealthRecordById(), getHealthRecords(), HealthRecord, mongoose, Pet, updateHealthRecord() (+6 more)

### Community 24 - "reminder.routes.js"
Cohesion: 0.15
Nodes (14): completeReminder(), createReminder(), deleteReminder(), getReminders(), mongoose, Pet, Reminder, updateReminder() (+6 more)

### Community 25 - "vaccination.routes.js"
Cohesion: 0.15
Nodes (14): createVaccination(), deleteVaccination(), getUpcomingVaccinations(), getVaccinations(), mongoose, Pet, updateVaccination(), Vaccination (+6 more)

### Community 26 - "appointment.controller.js"
Cohesion: 0.16
Nodes (14): Appointment, createAppointment(), deleteAppointment(), getAppointments(), mongoose, Notification, Pet, Reminder (+6 more)

### Community 27 - "adoption.controller.js"
Cohesion: 0.18
Nodes (13): Adoption, createAdoption(), deleteAdoption(), getAllAdoptions(), getMyAdoptions(), mongoose, Notification, Pet (+5 more)

### Community 28 - "dashboard-data.js"
Cohesion: 0.33
Nodes (14): ageText(), breedName(), esc(), fillGreeting(), fmtDate(), fmtTime(), init(), loadActivity() (+6 more)

### Community 29 - "server.js"
Cohesion: 0.18
Nodes (13): allowedOrigins, app, compression, cors, express, FRONTEND_DIR, helmet, isDevOrigin() (+5 more)

### Community 30 - "breed.routes.js"
Cohesion: 0.22
Nodes (11): Breed, createBreed(), deleteBreed(), getAllBreeds(), getBreedById(), mongoose, updateBreed(), express (+3 more)

### Community 31 - "notification.routes.js"
Cohesion: 0.22
Nodes (11): deleteNotification(), getNotifications(), getUnreadNotifications(), markAllAsRead(), markAsRead(), mongoose, Notification, express (+3 more)

### Community 32 - "veterinarian.routes.js"
Cohesion: 0.22
Nodes (11): createVeterinarian(), deleteVeterinarian(), getAllVeterinarians(), getVeterinarianById(), mongoose, updateVeterinarian(), Veterinarian, express (+3 more)

### Community 33 - "petgpt.js"
Cohesion: 0.42
Nodes (10): addAIMessage(), addUserMessage(), escapeHTML(), getCurrentTime(), getResponse(), getUserAvatarSource(), removeTyping(), scrollToBottom() (+2 more)

### Community 34 - "reset-password.js"
Cohesion: 0.18
Nodes (10): confirmPassword, confirmPasswordError, params, password, passwordError, resetBtn, resetForm, toggleConfirmPassword (+2 more)

### Community 35 - "auth.js"
Cohesion: 0.22
Nodes (8): adminOnly(), jwt, protect(), User, express, petController, { protect }, router

### Community 36 - "breed-details.js"
Cohesion: 0.47
Nodes (9): breedImage(), breedTag(), escapeHTML(), loadBreed(), render(), section(), showProblem(), speciesLabel() (+1 more)

### Community 37 - "FAMIPET — STEP 10 FINAL REPORT"
Cohesion: 0.20
Nodes (9): 1. Frontend — Preserved ✅, 2. MongoDB Persistence — ✅ (every feature writes to `petDB` and reloads), 3. Complete User Test Checklist — ✅, 4. Admin Test — ✅, 5. Security Test — ✅, 6. Error Test — *Failed to Fetch: FIXED* ✅, 7. Test Artifacts (reproducible), FAMIPET — STEP 10 FINAL REPORT (+1 more)

### Community 38 - "pet-id.js"
Cohesion: 0.42
Nodes (7): capFirst(), escapeHTML(), generateQr(), loadPets(), petImage(), refreshPreview(), showIdCard()

### Community 39 - "login.js"
Cohesion: 0.25
Nodes (7): email, emailError, form, loginBtn, password, passwordError, toggle

### Community 40 - "admin-lost-found.js"
Cohesion: 0.52
Nodes (6): escapeHTML(), loadReports(), showToast(), speciesLabel(), statusPill(), typePill()

### Community 41 - "breeds.js"
Cohesion: 0.57
Nodes (6): breedImage(), breedTag(), escapeHTML(), loadBreeds(), renderBreeds(), speciesLabel()

### Community 42 - "lostFound.routes.js"
Cohesion: 0.33
Nodes (5): express, lostFoundController, { protect }, router, upload

### Community 43 - "home.js"
Cohesion: 0.33
Nodes (5): backToTop, services, servicesGrid, whyChoose, whyGrid

### Community 44 - "admin-adoptions.js"
Cohesion: 0.70
Nodes (4): escapeHTML(), loadAdoptions(), showToast(), statusPill()

### Community 45 - "admin-community.js"
Cohesion: 0.70
Nodes (4): escapeHTML(), loadPosts(), showToast(), statusPill()

### Community 46 - "admin-pets.js"
Cohesion: 0.80
Nodes (4): escapeHTML(), loadPets(), showToast(), statusPill()

### Community 47 - "forgot-password.js"
Cohesion: 0.40
Nodes (4): emailError, emailInput, forgotBtn, forgotForm

### Community 48 - "theme.js"
Cohesion: 0.80
Nodes (4): applyTheme(), getThemeButtons(), initTheme(), updateIcons()

### Community 49 - "admin-dashboard.js"
Cohesion: 0.83
Nodes (3): escapeHTML(), loadDashboard(), loadRecentUsers()

### Community 50 - "admin-users.js"
Cohesion: 0.83
Nodes (3): escapeHTML(), loadUsers(), showToast()

### Community 54 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **421 isolated node(s):** `mongoose`, `nodemailer`, `{ GoogleGenerativeAI }`, `User`, `Pet` (+416 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `protect()` connect `auth.js` to `veterinarian.routes.js`, `user.routes.js`, `admin.controller.js`, `pet.controller.js`, `auth.controller.js`, `lostFound.routes.js`, `community.routes.js`, `health.routes.js`, `reminder.routes.js`, `vaccination.routes.js`, `appointment.controller.js`, `adoption.controller.js`, `breed.routes.js`, `notification.routes.js`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `11. Phased Plan` connect `11. Phased Plan` to `FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Why does `FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind` connect `FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind` to `11. Phased Plan`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `mongoose`, `nodemailer`, `{ GoogleGenerativeAI }` to the rest of the system?**
  _421 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `user.routes.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05731707317073171 - nodes in this community are weakly interconnected._
- **Should `routeConfig.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07317073170731707 - nodes in this community are weakly interconnected._