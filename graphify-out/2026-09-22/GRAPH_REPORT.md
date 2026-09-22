# Graph Report - FamiPet  (2026-09-22)

## Corpus Check
- 212 files · ~2,925,604 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1476 nodes · 3027 edges · 84 communities (78 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `288c202f`
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
- apiGet
- seedData.js
- health.routes.js
- reminder.routes.js
- vaccination.routes.js
- veterinarian.routes.js
- appointment.controller.js
- dashboard-data.js
- server.js
- breed.routes.js
- AppointmentsPage.tsx
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
- api/auth.ts
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
- MyPetsPage.tsx
- remindersBase.ts
- ai.routes.js
- Migration Execution Protocol
- client.ts
- community.routes.js
- AdoptionPage.tsx
- plugins
- Icon.tsx
- routeConfig.tsx
- dbg.js
- SettingsPage.tsx
- pets.ts
- lostFound.controller.js
- useAuth.ts
- SignupPage.tsx
- apiPost

## God Nodes (most connected - your core abstractions)
1. `Icon()` - 60 edges
2. `react` - 53 edges
3. `apiGet()` - 40 edges
4. `11. Phased Plan` - 31 edges
5. `apiPost()` - 30 edges
6. `apiPut()` - 26 edges
7. `getNotifications()` - 24 edges
8. `FamiPet — Agent Instructions` - 22 edges
9. `apiDelete()` - 21 edges
10. `markAllNotificationsRead()` - 18 edges

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

## Communities (84 total, 6 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, bcryptjs, cloudinary, compression, cors, dotenv, express, express-validator (+38 more)

### Community 1 - "admin.ts"
Cohesion: 0.10
Nodes (38): AdminCommunityPost, AdminDashboardResponse, AdminDashboardStats, AdminLostFoundReport, AdminPet, AdminPetsResponse, AdminPostsResponse, AdminReportsResponse (+30 more)

### Community 2 - "CommunityPage.tsx"
Cohesion: 0.11
Nodes (40): apiDelete(), addCommunityComment(), CommunityComment, CommunityPost, CommunityResponse, createCommunityPost(), deleteCommunityPost(), getCommunityPosts() (+32 more)

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
Cohesion: 0.07
Nodes (15): Breed, mongoose, Pet, QRCode, breedSchema, mongoose, mongoose, petSchema (+7 more)

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

### Community 21 - "apiGet"
Cohesion: 0.07
Nodes (60): Breed, BreedsResponse, getBreed(), getBreeds(), apiGet(), createHealthRecord(), deleteHealthRecord(), getHealthRecords() (+52 more)

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

### Community 31 - "AppointmentsPage.tsx"
Cohesion: 0.09
Nodes (38): AppointmentMutationResponse, AppointmentPayload, AppointmentsResponse, ApptPet, ApptVet, createAppointment(), deleteAppointment(), getAppointments() (+30 more)

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

### Community 42 - "api/auth.ts"
Cohesion: 0.16
Nodes (19): forgotPassword(), login(), MessageResponse, resendVerification(), resetPassword(), verifyEmail(), ApiError, AuthLeftPanel() (+11 more)

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
Nodes (22): Adoption, AdoptionPayload, AdoptionsResponse, AdoptionStatus, getMyAdoptions(), Appointment, Pet, Reminder (+14 more)

### Community 59 - "adoption.controller.js"
Cohesion: 0.17
Nodes (14): Adoption, createAdoption(), deleteAdoption(), getAllAdoptions(), getMyAdoptions(), mongoose, Notification, Pet (+6 more)

### Community 62 - "MyPetsPage.tsx"
Cohesion: 0.17
Nodes (20): deletePet(), getMyPets(), getPetQr(), ThemeToggle(), useTheme(), Filter, MenuState, MyPetsPage() (+12 more)

### Community 67 - "remindersBase.ts"
Cohesion: 0.13
Nodes (28): completeReminder(), createReminder(), deleteReminder(), getReminders(), ReminderMutationResponse, ReminderPayload, ReminderPet, RemindersResponse (+20 more)

### Community 68 - "ai.routes.js"
Cohesion: 0.23
Nodes (10): askPetGPT(), callGemini(), fallbackAnswer(), getPetAdvice(), mongoose, Pet, {
  askPetGPT,
  getPetAdvice,
}, express (+2 more)

### Community 69 - "Migration Execution Protocol"
Cohesion: 0.17
Nodes (12): 10. Rollback safety, 1. One phase at a time, 2. Read before implementing, 3. Preserve the existing application, 4. Implement, 5. Verify, 6. Checkpoint report, 7. Commit (+4 more)

### Community 70 - "client.ts"
Cohesion: 0.07
Nodes (51): FamiPetAPI, apiRequest(), apiUrl(), getToken(), getUser(), isAdmin(), isLoggedIn(), logoutStoredAuth() (+43 more)

### Community 71 - "community.routes.js"
Cohesion: 0.07
Nodes (32): addComment(), CommunityPost, createPost(), deleteComment(), deletePost(), getAllPosts(), getPostById(), toggleLike() (+24 more)

### Community 72 - "AdoptionPage.tsx"
Cohesion: 0.13
Nodes (22): createAdoption(), getAvailablePets(), FavoriteButton(), AdoptionPetView, adoptionType(), CATEGORIES, CategoryValue, FALLBACK_IMAGE (+14 more)

### Community 73 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 74 - "Icon.tsx"
Cohesion: 0.17
Nodes (12): BackToTop(), Footer(), SOCIAL_PATHS, Icon(), IconProps, ICONS, Navbar(), navLinks (+4 more)

### Community 75 - "routeConfig.tsx"
Cohesion: 0.17
Nodes (12): AuthSplash(), useAuth(), AdminLayout(), AdminSidebar(), NAV_ITEMS, AppLayout(), AuthLayout(), NotFound() (+4 more)

### Community 77 - "SettingsPage.tsx"
Cohesion: 0.24
Nodes (15): AuthUser, apiPut(), StoredUser, AvatarResponse, changePassword(), ProfilePayload, ProfileResponse, updateProfile() (+7 more)

### Community 78 - "pets.ts"
Cohesion: 0.23
Nodes (12): createPet(), PetMutationResponse, PetPayload, PetsResponse, updatePet(), BREEDS, buildPetPayload(), parsePetAge() (+4 more)

### Community 79 - "lostFound.controller.js"
Cohesion: 0.18
Nodes (4): LostFound, mongoose, lostFoundSchema, mongoose

### Community 80 - "useAuth.ts"
Cohesion: 0.24
Nodes (8): LoginResponse, AuthContext, AuthContextValue, DEFAULT_PROFILE, getInitials(), NAV_ITEMS, NavItem, Sidebar()

### Community 81 - "SignupPage.tsx"
Cohesion: 0.25
Nodes (7): register(), RoleCard(), RoleCardProps, StrengthBar(), SuccessToast(), SuccessToastProps, SignupPage()

### Community 82 - "apiPost"
Cohesion: 0.48
Nodes (5): getMe(), apiPost(), FavoritesResponse, toggleFavorite(), useFavorites()

## Knowledge Gaps
- **498 isolated node(s):** `mongoose`, `nodemailer`, `{ GoogleGenerativeAI }`, `User`, `Pet` (+493 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Icon.tsx` to `admin.ts`, `CommunityPage.tsx`, `remindersBase.ts`, `client.ts`, `AdoptionPage.tsx`, `plugins`, `api/auth.ts`, `routeConfig.tsx`, `SettingsPage.tsx`, `pets.ts`, `useAuth.ts`, `SignupPage.tsx`, `apiPost`, `apiGet`, `DashboardPage.tsx`, `MyPetsPage.tsx`, `AppointmentsPage.tsx`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Icon()` connect `Icon.tsx` to `admin.ts`, `CommunityPage.tsx`, `remindersBase.ts`, `client.ts`, `AdoptionPage.tsx`, `api/auth.ts`, `routeConfig.tsx`, `SettingsPage.tsx`, `pets.ts`, `useAuth.ts`, `SignupPage.tsx`, `apiGet`, `DashboardPage.tsx`, `MyPetsPage.tsx`, `AppointmentsPage.tsx`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `protect()` connect `auth.js` to `notification.routes.js`, `admin.controller.js`, `ai.routes.js`, `auth.controller.js`, `community.routes.js`, `adoption.controller.js`, `vaccination.routes.js`, `health.routes.js`, `reminder.routes.js`, `favorite.controller.js`, `veterinarian.routes.js`, `appointment.controller.js`, `breed.routes.js`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `mongoose`, `nodemailer`, `{ GoogleGenerativeAI }` to the rest of the system?**
  _498 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09565217391304348 - nodes in this community are weakly interconnected._
- **Should `CommunityPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1072463768115942 - nodes in this community are weakly interconnected._