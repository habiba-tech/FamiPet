# Graph Report - FamiPet  (2026-09-22)

## Corpus Check
- 221 files · ~2,994,560 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1721 nodes · 3328 edges · 104 communities (97 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `704277ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- admin.ts
- CommunityPage.tsx
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
- HealthPage.tsx
- seedData.js
- health.routes.js
- reminder.routes.js
- vaccination.routes.js
- veterinarian.routes.js
- appointment.controller.js
- dashboard-data.js
- server.js
- breed.routes.js
- appointmentsBase.ts
- notification.routes.js
- petgpt.js
- reset-password.js
- auth.js
- breed-details.js
- FAMIPET — STEP 10 FINAL REPORT
- pet-id.js
- login.js
- admin-lost-found.js
- breeds.js
- Icon.tsx
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
- favorite.controller.js
- DashboardPage.tsx
- adoption.controller.js
- tsconfig.json
- pets.ts
- remindersBase.ts
- ai.routes.js
- Migration Execution Protocol
- LostFoundPage.tsx
- user.routes.js
- AdoptionPage.tsx
- plugins
- LandingLayout.tsx
- routeConfig.tsx
- dbg.js
- apiPost
- project-blackbook/SKILL.md
- lostFound.controller.js
- PetGPTPage.tsx
- project-diagrams/SKILL.md
- client.ts
- Project Proposal Skill
- vaccinations.ts
- apiGet
- BreedsPage.tsx
- community.routes.js
- PetGPT — Enhancement Working Reference
- react
- User.js
- 16. Phase 2 — Persistent Conversations + Messages + Chat Lifecycle
- 22. Frontend Integration Guide
- 19. Phase 5 — Pet-Aware Context + Backend Tool Calling
- 17. Phase 3 — Provider / API-Key / Model Configuration
- 20. Phase 6 — Mutation Tools, Per-User Limits & Reliability
- 18. Phase 4 — Durable AI Generation + Background Jobs
- 12. Architecture Roadmap (design intent)
- 21. Phase 7 — Production Readiness & Security Hardening
- AdminAdoptionsPage.tsx
- 15. Phase 0/1 Implementation Status & Verification
- 2. Complete Request/Response Flow
- Adoption.js

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 63 edges
2. `react` - 55 edges
3. `apiGet()` - 44 edges
4. `apiPost()` - 33 edges
5. `11. Phased Plan` - 31 edges
6. `apiPut()` - 26 edges
7. `getNotifications()` - 24 edges
8. `PetGPT — Enhancement Working Reference` - 24 edges
9. `apiDelete()` - 23 edges
10. `FamiPet — Agent Instructions` - 22 edges

## Surprising Connections (you probably didn't know these)
- `FamiPetAPI` --indirect_call--> `apiUrl()`  [INFERRED]
  frontend/js/api.js → frontend-react/src/api/client.ts
- `FamiPetAPI` --indirect_call--> `getToken()`  [INFERRED]
  frontend/js/api.js → frontend-react/src/api/client.ts
- `FamiPetAPI` --indirect_call--> `setToken()`  [INFERRED]
  frontend/js/api.js → frontend-react/src/api/client.ts
- `FamiPetAPI` --indirect_call--> `getUser()`  [INFERRED]
  frontend/js/api.js → frontend-react/src/api/client.ts
- `FamiPetAPI` --indirect_call--> `setUser()`  [INFERRED]
  frontend/js/api.js → frontend-react/src/api/client.ts

## Import Cycles
- None detected.

## Communities (104 total, 7 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, bcryptjs, cloudinary, compression, cors, dotenv, express, express-validator (+38 more)

### Community 1 - "admin.ts"
Cohesion: 0.11
Nodes (35): AdminCommunityPost, AdminDashboardResponse, AdminDashboardStats, AdminLostFoundReport, AdminPet, AdminPetsResponse, AdminPostsResponse, AdminReportsResponse (+27 more)

### Community 2 - "CommunityPage.tsx"
Cohesion: 0.11
Nodes (39): addCommunityComment(), CommunityComment, CommunityPost, CommunityResponse, createCommunityPost(), deleteCommunityPost(), getCommunityPosts(), toggleCommunityLike() (+31 more)

### Community 3 - "admin.controller.js"
Cohesion: 0.12
Nodes (23): Adoption, CommunityPost, deleteCommunityPost(), deleteLostFoundReport(), deletePet(), deleteUser(), getAllCommunityPosts(), getAllLostFoundReports() (+15 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, lucide-react, react, react-dom, react-router-dom, devDependencies, oxlint, tailwindcss (+29 more)

### Community 5 - "community.js"
Cohesion: 0.14
Nodes (31): addComment(), run(), applyFilters(), attachAllInteractions(), attachCommentButton(), attachLikeButton(), attachMoreButton(), attachShareButton() (+23 more)

### Community 6 - "pet.controller.js"
Cohesion: 0.12
Nodes (6): Breed, mongoose, Pet, QRCode, mongoose, petSchema

### Community 7 - "auth.controller.js"
Cohesion: 0.12
Nodes (24): nodemailer, sendEmail(), transporter, changePassword(), crypto, forgotPassword(), generateToken(), getClientBase() (+16 more)

### Community 8 - "11. Phased Plan"
Cohesion: 0.06
Nodes (31): 11. Phased Plan, Notifications (plan §15; delivered inside Phases 10–14), Phase 10 — Health, Phase 11 — Vaccinations, Phase 12 — Appointments, Phase 13 — Veterinarians, Phase 14 — Reminders, Phase 15 — Community (plan §16) (+23 more)

### Community 9 - "reminders.js"
Cohesion: 0.16
Nodes (26): bindMoreButtons(), closeReminderMenus(), completeReminder(), convertTimeToInput(), deleteReminder(), escapeHTML(), formatBackendTime(), formatDate() (+18 more)

### Community 10 - "FamiPet — Migration Plan: Vanilla → Vite + React + TypeScript + Tailwind"
Cohesion: 0.12
Nodes (16): 10. Authentication Strategy, 12. Dependency / sequencing notes, 13. Invariants during migration (do-not-break list), 1. Purpose & Principles, 2. Proposed React Project Structure, 3. Component Organization, 4. Page Organization, 5. API / Service Organization (+8 more)

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

### Community 21 - "HealthPage.tsx"
Cohesion: 0.18
Nodes (21): apiPut(), createHealthRecord(), deleteHealthRecord(), getHealthRecords(), HealthRecord, HealthRecordMutationResponse, HealthRecordPayload, HealthRecordsResponse (+13 more)

### Community 22 - "seedData.js"
Cohesion: 0.11
Nodes (16): communityPostSchema, mongoose, Adoption, Appointment, bcrypt, Breed, CommunityPost, HealthRecord (+8 more)

### Community 23 - "health.routes.js"
Cohesion: 0.15
Nodes (14): createHealthRecord(), deleteHealthRecord(), getHealthRecordById(), getHealthRecords(), HealthRecord, mongoose, Pet, updateHealthRecord() (+6 more)

### Community 24 - "reminder.routes.js"
Cohesion: 0.15
Nodes (14): completeReminder(), createReminder(), deleteReminder(), getReminders(), mongoose, Pet, Reminder, updateReminder() (+6 more)

### Community 25 - "vaccination.routes.js"
Cohesion: 0.15
Nodes (14): createVaccination(), deleteVaccination(), getUpcomingVaccinations(), getVaccinations(), mongoose, Pet, updateVaccination(), Vaccination (+6 more)

### Community 26 - "veterinarian.routes.js"
Cohesion: 0.17
Nodes (13): createVeterinarian(), deleteVeterinarian(), getAllVeterinarians(), getVeterinarianById(), mongoose, updateVeterinarian(), Veterinarian, mongoose (+5 more)

### Community 27 - "appointment.controller.js"
Cohesion: 0.13
Nodes (16): Appointment, createAppointment(), deleteAppointment(), getAppointments(), mongoose, Notification, Pet, Reminder (+8 more)

### Community 28 - "dashboard-data.js"
Cohesion: 0.33
Nodes (14): ageText(), breedName(), esc(), fillGreeting(), fmtDate(), fmtTime(), init(), loadActivity() (+6 more)

### Community 29 - "server.js"
Cohesion: 0.18
Nodes (13): allowedOrigins, app, compression, cors, express, FRONTEND_DIR, helmet, isDevOrigin() (+5 more)

### Community 30 - "breed.routes.js"
Cohesion: 0.22
Nodes (11): Breed, createBreed(), deleteBreed(), getAllBreeds(), getBreedById(), mongoose, updateBreed(), express (+3 more)

### Community 31 - "appointmentsBase.ts"
Cohesion: 0.09
Nodes (32): createAppointment(), updateAppointment(), getVeterinarian(), getVeterinarians(), Veterinarian, VeterinariansResponse, Props, VetSelect() (+24 more)

### Community 32 - "notification.routes.js"
Cohesion: 0.17
Nodes (13): deleteNotification(), getNotifications(), getUnreadNotifications(), markAllAsRead(), markAsRead(), mongoose, Notification, mongoose (+5 more)

### Community 33 - "petgpt.js"
Cohesion: 0.42
Nodes (10): addAIMessage(), addUserMessage(), escapeHTML(), getCurrentTime(), getResponse(), getUserAvatarSource(), removeTyping(), scrollToBottom() (+2 more)

### Community 34 - "reset-password.js"
Cohesion: 0.18
Nodes (10): confirmPassword, confirmPasswordError, params, password, passwordError, resetBtn, resetForm, toggleConfirmPassword (+2 more)

### Community 35 - "auth.js"
Cohesion: 0.15
Nodes (12): jwt, protect(), User, express, lostFoundController, { protect }, router, upload (+4 more)

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

### Community 42 - "Icon.tsx"
Cohesion: 0.13
Nodes (25): forgotPassword(), register(), resetPassword(), verifyEmail(), ApiError, AuthLeftPanel(), AuthLeftPanelProps, Divider() (+17 more)

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

### Community 57 - "favorite.controller.js"
Cohesion: 0.15
Nodes (13): addFavorite(), Favorite, getFavorites(), mongoose, Pet, removeFavorite(), User, favoriteSchema (+5 more)

### Community 58 - "DashboardPage.tsx"
Cohesion: 0.14
Nodes (22): Adoption, Appointment, AppNotification, Pet, Reminder, ReminderMutationResponse, ReminderPayload, ReminderPet (+14 more)

### Community 59 - "adoption.controller.js"
Cohesion: 0.17
Nodes (14): Adoption, createAdoption(), deleteAdoption(), getAllAdoptions(), getMyAdoptions(), mongoose, Notification, Pet (+6 more)

### Community 62 - "pets.ts"
Cohesion: 0.14
Nodes (29): createPet(), deletePet(), getMyPets(), getPetQr(), PetMutationResponse, PetPayload, PetsResponse, updatePet() (+21 more)

### Community 67 - "remindersBase.ts"
Cohesion: 0.15
Nodes (25): completeReminder(), createReminder(), deleteReminder(), updateReminder(), Props, ReminderFormModal(), todayISO(), convertTimeToInput() (+17 more)

### Community 68 - "ai.routes.js"
Cohesion: 0.23
Nodes (10): askPetGPT(), callGemini(), fallbackAnswer(), getPetAdvice(), mongoose, Pet, {
  askPetGPT,
  getPetAdvice,
}, express (+2 more)

### Community 69 - "Migration Execution Protocol"
Cohesion: 0.17
Nodes (12): 10. Rollback safety, 1. One phase at a time, 2. Read before implementing, 3. Preserve the existing application, 4. Implement, 5. Verify, 6. Checkpoint report, 7. Commit (+4 more)

### Community 70 - "LostFoundPage.tsx"
Cohesion: 0.14
Nodes (27): createReport(), deleteReport(), getReports(), LostFoundReport, LostFoundResponse, updateReport(), buildMailto(), DetailsModal() (+19 more)

### Community 71 - "user.routes.js"
Cohesion: 0.11
Nodes (16): cloudinary, getAllUsers(), getUserById(), mongoose, toggleFavorite(), uploadAvatar(), User, multer (+8 more)

### Community 72 - "AdoptionPage.tsx"
Cohesion: 0.13
Nodes (22): createAdoption(), getAvailablePets(), FavoriteButton(), AdoptionPetView, adoptionType(), CATEGORIES, CategoryValue, FALLBACK_IMAGE (+14 more)

### Community 73 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 74 - "LandingLayout.tsx"
Cohesion: 0.21
Nodes (7): BackToTop(), Footer(), SOCIAL_PATHS, Navbar(), navLinks, ThemeToggle(), LandingLayout()

### Community 75 - "routeConfig.tsx"
Cohesion: 0.12
Nodes (19): resendVerification(), AuthSplash(), useAuth(), AdminLayout(), AdminSidebar(), NAV_ITEMS, AppLayout(), AuthLayout() (+11 more)

### Community 77 - "apiPost"
Cohesion: 0.14
Nodes (24): AuthUser, getMe(), login(), LoginResponse, MessageResponse, apiPost(), StoredUser, FavoritesResponse (+16 more)

### Community 78 - "project-blackbook/SKILL.md"
Cohesion: 0.04
Nodes (44): 10. DIAGRAM SELECTION, 11. DIAGRAM INTEGRATION, 12. TABLES, 13. SCREENSHOTS, 14. FEATURE EXPLANATION, 15. ARCHITECTURE, 16. DATABASE AND DATA, 17. WORKFLOWS AND SEQUENCES (+36 more)

### Community 79 - "lostFound.controller.js"
Cohesion: 0.18
Nodes (4): LostFound, mongoose, lostFoundSchema, mongoose

### Community 80 - "PetGPTPage.tsx"
Cohesion: 0.08
Nodes (35): AcceptedMessageResult, addMessage(), AddMessageResult, createConversation(), CreateConversationResult, deleteConversation(), getConversation(), GetConversationResult (+27 more)

### Community 81 - "project-diagrams/SKILL.md"
Cohesion: 0.07
Nodes (28): 10. Architecture Accuracy, 11. Existing Diagrams, 12. Diagram Style, 13. Black-and-White Compatibility, 14. Diagram Source, 15. Mermaid, 16. Rendering, 17. Validation (+20 more)

### Community 82 - "client.ts"
Cohesion: 0.17
Nodes (20): FamiPetAPI, apiDelete(), apiRequest(), apiUrl(), getToken(), getUser(), isAdmin(), isLoggedIn() (+12 more)

### Community 83 - "Project Proposal Skill"
Cohesion: 0.08
Nodes (24): 1. Understand the Project, 2. Understand Academic Requirements, 3. Use Existing Proposal, 4. Academic Information, Academic, Core Principle, Document Format, Expected Outcomes (+16 more)

### Community 84 - "vaccinations.ts"
Cohesion: 0.19
Nodes (19): createVaccination(), deleteVaccination(), UpcomingVaccinationsResponse, updateVaccination(), Vaccination, VaccinationMutationResponse, VaccinationPayload, VaccinationsResponse (+11 more)

### Community 85 - "apiGet"
Cohesion: 0.16
Nodes (18): AdoptionPayload, AdoptionsResponse, AdoptionStatus, getMyAdoptions(), AppointmentMutationResponse, AppointmentPayload, AppointmentsResponse, ApptPet (+10 more)

### Community 86 - "BreedsPage.tsx"
Cohesion: 0.24
Nodes (15): Breed, BreedsResponse, getBreed(), getBreeds(), BreedDetailsPage(), BreedCard(), BreedCardProps, BREED_DEFAULT_IMAGE (+7 more)

### Community 87 - "community.routes.js"
Cohesion: 0.19
Nodes (14): addComment(), CommunityPost, createPost(), deleteComment(), deletePost(), getAllPosts(), getPostById(), toggleLike() (+6 more)

### Community 88 - "PetGPT — Enhancement Working Reference"
Cohesion: 0.13
Nodes (14): 10. Current Limitations, 11. Bugs/Issues Status, 13. Important Architectural Constraints, 14. Phased Roadmap, 1. Current Architecture, 3. Relevant Files and Modules, 4. Current Capabilities, 5. Tools (+6 more)

### Community 89 - "react"
Cohesion: 0.22
Nodes (9): App(), Theme, ThemeContext, ThemeContextValue, ThemeProvider(), AppRouter(), router, routes (+1 more)

### Community 91 - "User.js"
Cohesion: 0.15
Nodes (9): breedSchema, mongoose, bcrypt, mongoose, userSchema, Breed, mongoose, Pet (+1 more)

### Community 92 - "16. Phase 2 — Persistent Conversations + Messages + Chat Lifecycle"
Cohesion: 0.15
Nodes (13): 16. Phase 2 — Persistent Conversations + Messages + Chat Lifecycle, API contracts (all behind `protect`; mounted `/api/ai/conversations`), Clear-chat behavior, Context/history handling, Conversation/Messages architecture, Database schema decisions (`backend/models/`), Error handling covered, Goal (+5 more)

### Community 93 - "22. Frontend Integration Guide"
Cohesion: 0.15
Nodes (13): 22.10 Security rules, 22.11 Current limitations, 22.12 Frontend implementation checklist, 22.1 Authentication, 22.2 Conversation lifecycle, 22.3 Durable generation flow (202 + job polling), 22.4 Job states, 22.5 Tool-call behavior (+5 more)

### Community 94 - "19. Phase 5 — Pet-Aware Context + Backend Tool Calling"
Cohesion: 0.18
Nodes (11): 19. Phase 5 — Pet-Aware Context + Backend Tool Calling, Bounded calling loop (`backend/ai/tool-calling.js`), Capability gating (`backend/ai/openai.js` + `gemini.js`), Config (`backend/config/ai.js` — set env before require), Goal, Persisted metadata, Pet-aware context (`backend/ai/pet-context.js`), Phase 5 merges the original roadmap's Phase 5 ("Rich pet context") and Phase 6 ("Tool/function calling") (+3 more)

### Community 95 - "17. Phase 3 — Provider / API-Key / Model Configuration"
Cohesion: 0.20
Nodes (10): 17. Phase 3 — Provider / API-Key / Model Configuration, Active-provider resolution / precedence, API contracts (all behind `protect`; mounted `/api/ai/providers`), Encryption strategy, Goal, OmniRoute testing setup, Ownership / scope rules, PetGPT integration (+2 more)

### Community 96 - "20. Phase 6 — Mutation Tools, Per-User Limits & Reliability"
Cohesion: 0.20
Nodes (10): 20. Phase 6 — Mutation Tools, Per-User Limits & Reliability, Config & env (`backend/config/ai.js`, `backend/.env.example`), Design rules (from the Phase 5 notes), Mutation idempotency ledger (`backend/models/MutationEffect.js`), Mutation tools (`backend/ai/tools/mutation-tools.js`), Per-user generation quota (`backend/ai/quota.js` + controller), Registry idempotency (`backend/ai/tools/registry.js`), Structured observability (`backend/ai/logging.js`) (+2 more)

### Community 97 - "18. Phase 4 — Durable AI Generation + Background Jobs"
Cohesion: 0.22
Nodes (9): 18. Phase 4 — Durable AI Generation + Background Jobs, API changes, Durability & recovery, Goal, Idempotency, Job lifecycle / state machine, Job model (`backend/models/GenerationJob.js`), Verification (2026-09-22) (+1 more)

### Community 98 - "12. Architecture Roadmap (design intent)"
Cohesion: 0.29
Nodes (7): 12. Architecture Roadmap (design intent), A. Provider abstraction, B. Conversation architecture ✅ implemented (Phase 2), C. Durable generation architecture (design → implement as Phase 4) ✅ implemented (see §18), D. Tool architecture ✅ implemented (Phase 5, see §19), E. Provider capabilities ✅ implemented (Phase 5), F. Observability and limits

### Community 99 - "21. Phase 7 — Production Readiness & Security Hardening"
Cohesion: 0.33
Nodes (6): 21. Phase 7 — Production Readiness & Security Hardening, Audit — gaps found and fixed, Audit — sound by design (unchanged), Config & env, Remaining limitations (documented, not fixed this phase), Verification (2026-09-22)

### Community 100 - "AdminAdoptionsPage.tsx"
Cohesion: 0.83
Nodes (3): getAllAdoptions(), updateAdoptionStatus(), AdminAdoptionsPage()

### Community 101 - "15. Phase 0/1 Implementation Status & Verification"
Cohesion: 0.50
Nodes (4): 15. Phase 0/1 Implementation Status & Verification, Audit verification log (2026-09-22, pre-Phase-0 baseline), Phase 0, Phase 1 — Provider abstraction + OpenAI-compatible provider

### Community 102 - "2. Complete Request/Response Flow"
Cohesion: 0.50
Nodes (4): 2. Complete Request/Response Flow, Persistent conversations (Phase 2) — `/api/ai/conversations` (auth required), `POST /api/ai/advice` (auth required) — `getPetAdvice`, `POST /api/ai/ask` (auth required) — `askPetGPT`

## Knowledge Gaps
- **692 isolated node(s):** `mongoose`, `nodemailer`, `{ GoogleGenerativeAI }`, `User`, `Pet` (+687 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `admin.ts`, `CommunityPage.tsx`, `HealthPage.tsx`, `appointmentsBase.ts`, `Icon.tsx`, `DashboardPage.tsx`, `pets.ts`, `remindersBase.ts`, `LostFoundPage.tsx`, `AdoptionPage.tsx`, `plugins`, `LandingLayout.tsx`, `routeConfig.tsx`, `apiPost`, `PetGPTPage.tsx`, `client.ts`, `vaccinations.ts`, `apiGet`, `BreedsPage.tsx`, `AdminAdoptionsPage.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `Icon()` connect `Icon.tsx` to `admin.ts`, `CommunityPage.tsx`, `remindersBase.ts`, `AdminAdoptionsPage.tsx`, `LostFoundPage.tsx`, `AdoptionPage.tsx`, `LandingLayout.tsx`, `routeConfig.tsx`, `apiPost`, `PetGPTPage.tsx`, `vaccinations.ts`, `apiGet`, `BreedsPage.tsx`, `HealthPage.tsx`, `DashboardPage.tsx`, `pets.ts`, `appointmentsBase.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `protect()` connect `auth.js` to `notification.routes.js`, `admin.controller.js`, `ai.routes.js`, `auth.controller.js`, `user.routes.js`, `adoption.controller.js`, `health.routes.js`, `vaccination.routes.js`, `community.routes.js`, `reminder.routes.js`, `favorite.controller.js`, `veterinarian.routes.js`, `appointment.controller.js`, `breed.routes.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `mongoose`, `nodemailer`, `{ GoogleGenerativeAI }` to the rest of the system?**
  _692 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10569105691056911 - nodes in this community are weakly interconnected._
- **Should `CommunityPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1101010101010101 - nodes in this community are weakly interconnected._