# FamiPet — Agent Instructions

## Project

FamiPet is a pet-management application with authenticated users, pets, pet health information, appointments, adoption, notifications, community features, and administrative functionality.

This is an existing production-oriented project.

**Preserve working functionality and existing architecture.**

---

## 1. Inspect Before Changing

Before making changes:

* Inspect the existing implementation.
* Understand the current data flow.
* Find and reuse existing models, APIs, controllers, services, and utilities.
* Check whether the requested functionality already exists.
* Make the smallest correct change.

Do not assume something is missing without checking the current codebase.

---

## 2. Backend Is the Source of Truth

User-specific data must flow through:

```text
Authenticated User
→ Auth Middleware
→ Controller / Service
→ MongoDB
→ API Response
→ Client
```

The backend is responsible for:

* user identity
* ownership
* roles
* permissions
* admin authorization
* private data access

Never trust client-provided values for authorization, including:

* `userId`
* `ownerId`
* `role`
* `admin`
* ownership information

---

## 3. Authentication & Ownership

All protected resources must verify the authenticated user.

Users must only be able to access or modify resources they are authorized to access.

This applies to:

* pets
* health records
* vaccinations
* diet
* appointments
* adoption
* notifications
* settings
* private owner information
* other user-owned resources

Admin-only actions must be enforced by the backend.

Never rely only on hiding UI controls.

---

## 4. Core Features

Preserve and maintain the existing functionality around:

* Authentication
* User accounts
* Pets
* Pet ID / QR
* Appointments
* Reminders
* Notifications
* Push notifications
* Health records
* Vaccinations
* Diet / nutrition
* Adoption
* Lost & found
* Community
* Admin functionality
* PetGPT / AI
* AI tools and recommendations
* Settings

When modifying one feature, check for dependencies with related features.

---

## 5. Real Data Only

User-facing application data must come from the backend/database.

Do not use fake or hardcoded data to make a feature appear functional.

Do not introduce or retain fake values for:

* users
* pets
* notifications
* health records
* vaccinations
* diet
* adoption records
* appointments
* community content

unless the data is intentionally part of the application's legitimate static content.

Never hide a backend/data problem by adding frontend fallback data.

---

## 6. Data Persistence

When a feature is supposed to persist data:

```text
Client
→ API
→ Controller / Service
→ MongoDB
→ API Response
→ Client
```

Verify the complete flow.

Do not consider a feature complete merely because the UI updates temporarily.

Refresh/reload behavior must reflect persisted backend data where applicable.

---

## 7. Notifications

Notifications must:

* belong to the correct authenticated user
* persist in the database
* display the correct message
* maintain unread/read/seen state
* survive refresh
* avoid unintended duplicates

Notification behavior should reuse the existing notification architecture.

---

## 8. Adoption

Adoption functionality must use real database records.

The backend must enforce:

* valid pet references
* ownership rules
* adoption state transitions
* admin approval/rejection
* authorization

Do not create duplicate pet/adoption records when an existing pet is being listed.

Do not allow non-admin users to perform admin approval/rejection actions.

---

## 9. Health & Nutrition

Health and nutrition information must relate to the authenticated user's actual pets.

Where applicable:

* select the correct pet
* load that pet's records
* persist changes to the correct pet
* maintain ownership checks
* show proper empty states when data does not exist

Do not fabricate medical information or present generic information as if it were a verified diagnosis.

Serious health concerns should direct users toward professional veterinary care.

---

## 10. Digital Pet ID / QR

Digital Pet ID functionality must resolve the correct pet securely.

Public QR access may expose only intentionally public information.

Never expose through public pet pages:

* passwords
* JWTs
* sessions
* private database fields
* authentication credentials
* unnecessary private owner information

The public lookup must not depend on the user's authenticated session.

---

## 11. Empty States

When real data does not exist, show an appropriate empty state.

Do not replace missing data with fake/default content.

This applies to:

* pets
* health
* vaccinations
* diet
* adoption
* notifications
* appointments
* other user-specific data

---

## 12. Validation & Error Handling

Validate data on the backend.

Do not rely solely on client-side validation.

Handle:

* invalid IDs
* missing resources
* unauthorized access
* ownership violations
* invalid state transitions
* malformed input
* database errors

Return appropriate API errors rather than silently failing.

Do not suppress errors simply to make the UI appear functional.

---

## 13. API Changes

Reuse existing APIs whenever possible.

Only introduce a new endpoint when the existing API cannot correctly support the required behavior.

Follow the existing backend conventions for:

* routes
* controllers
* services
* models
* validation
* authentication
* errors

Avoid duplicate endpoints that provide the same functionality.

---

## 14. Security

Always consider:

* authentication
* authorization
* ownership
* user isolation
* admin permissions
* input validation
* private/public data boundaries

Test important ownership boundaries using multiple users.

Example:

```text
User A creates resource
→ User A can access it
→ User B cannot access it
```

---

## 15. Existing Functionality Comes First

Do not break unrelated working functionality.

Before modifying shared backend logic:

* identify all callers
* understand dependencies
* preserve existing API behavior unless change is required
* run relevant regression tests

Do not make unrelated cleanup changes during feature work.

---

## 16. Development Workflow

Work according to the current roadmap.

Complete **one phase at a time**.

For each phase:

1. Inspect
2. Implement
3. Test
4. Fix failures
5. Update required documentation
6. Commit
7. Tag when specified
8. Push
9. Verify clean working tree
10. Stop

Do not automatically continue into the next phase.

---

## 17. Testing Rules

Never claim something was tested unless it was actually tested.

Prefer real database/API testing for data-related functionality.

When runtime testing is unavailable, clearly report:

* what was tested
* what could not be tested
* why it could not be tested

Do not hide failed tests or replace them with weaker checks without reporting the difference.

---

## 18. Change Discipline

Do not:

* rewrite working systems unnecessarily
* introduce fake data
* bypass authentication
* trust client authorization
* duplicate existing functionality
* change unrelated features
* remove useful functionality
* redesign behavior without a requirement

Prefer small, understandable, verifiable changes.

---

## 19. Documentation

Keep project documentation aligned with the actual implementation.

Important project documents include:

* `AGENTS.md` — persistent agent rules
* `ROADMAP.md` — implementation phases
* `BASELINE.md` — project/checkpoint baseline
* `design.md` — existing UI/design reference
* `migration.md` — frontend migration plan

Do not duplicate detailed migration or design documentation inside this file.

---

## 20. Final Rule

**Understand the existing system first. Preserve what works. Use real data. Enforce security on the backend. Make minimal changes. Test the complete flow. Never claim unverified results.**
