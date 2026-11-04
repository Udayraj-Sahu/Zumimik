# Backend pending requirements

Everything below is **a proposal for the backend team**, not an existing API, unless it is explicitly marked "exists".
Evidence: staging OpenAPI (122 operations, fetched 2026-11-04), read-only live calls with the test account, and the Speed-Gym source in
`Downloads\Speed-Gym-main` (note: that copy is older than staging and lacks `PATCH /auth/me`).
Priority: **P0** blocks a core user journey, **P1** blocks a visible feature, **P2** improvement.

---

## A. Authentication and onboarding

### A1. Specify and harden `PATCH /api/v1/auth/me` — P0
**Exists on staging** (not in the repo copy). The frontend now calls it; these gaps decide whether saving is reliable.

| Item | Observed / missing | Required |
|---|---|---|
| Storage | `is_onboarded` and `triggers` landed inside `users.behavioral_profile` JSONB (observed by probe) | A dedicated column/JSONB (e.g. `users.onboarding`); keep `behavioral_profile` for computed output only |
| Validation | `{"is_onboarded":"yes"}` returned 200 and set `true`; unknown fields silently accepted | Strict models: `extra="forbid"`, strict bool/int. Invalid input must be 422 |
| Enums | `persona`, `goal`, `target_exam` accept any string. DB CHECKs exist (`persona`: SchoolSupport/BrainTrainer/SpeedDemon; `primary_goal`: speed/accuracy/exam_prep/basics; `target_exam`: CAT/GMAT/GRE/School). UI values differ ("Student", "Prepare for CAT", "cat") | Publish the canonical vocabulary and mapping, validate it, and return the same value that was saved |
| Null / empty semantics | undocumented | Document: does `null`, `""` or `[]` clear or is it ignored? The frontend never sends them until this is defined |
| Response | untyped (`additionalProperties`) for login, `/auth/me` and PATCH | One typed `UserOut` model shared by all three |
| Naming | read camelCase (`targetExam`), write snake_case (`target_exam`) | Document the mapping or align them |
| `name` | `null` when registered without `display_name`; PATCH accepts both `name` and `display_name` | State which wins; return the effective name |

**Acceptance:** save, then `GET /auth/me`, returns exactly the saved values on a different device; partial PATCH leaves other fields untouched; invalid enum is 422.

### A2. Persist multi-exam preparation — P1
`activePreps` is accepted, but per-exam dates (`examDates`) have no field. Existing table `exam_deadlines(user_id, exam_type, exam_date, priority, is_active)` is unused.
Proposal: accept `exam_dates: {<exam>: "YYYY-MM-DD"}` on PATCH and upsert into `exam_deadlines`; return it on `/auth/me`.

### A3. Google and phone sign-in — P1
`POST /auth/google` and `/auth/phone` return 501. Needs provider configuration (Firebase project, credentials) and implementation.

---

## B. Practice and mastery

### B1. Server-side mastery update from answers — P0
`GET /practice/mastery` changes only when a `session_end` or `bkt_state_snapshot` event carries `technique_states` computed by a **client-side BKT engine**
(`packages/psychometrics`). The web frontend has no BKT engine, so practising does not move mastery.
Proposal (either): (a) compute and store mastery server-side from `problem_attempt` events, or (b) publish the psychometrics package as an installable npm module the frontend can use.
**Acceptance:** after a practice session synced through `POST /sync`, `GET /practice/mastery` shows updated `pLearned` for the skills attempted.

### B2. Difficulty parameter — P2
`GET /practice/session` and `POST /practice/session` take no difficulty. The UI's Beginner/Intermediate/Advanced selector is cosmetic. Proposal: optional `difficulty` (1-5) on `Slot`, or remove the selector.

### B3. Exam-specific catalog — P1
No topic, technique or catalog endpoint can be filtered by exam; `/dashboard/topics?domain=` is a no-op; 65 of 100 skills have no `topic`.
Proposal: add an `exam` tag (CAT/GMAT/GRE/School) to skills/topics and an `exam` filter on `/api/topics`, `/api/practice/techniques`, `/practice/catalog`, `/dashboard/topics`.
Frontend dependency: flip `EXAM_TOPIC_CATALOG_SUPPORTED` in `src/lib/exam-scope.ts`.

---

## C. Mock exams

### C1. Passage / stimulus for set-based questions — P1
`POST /mocks/configure` returns questions with `set_key`, `set_position`, `set_size` but no passage or stimulus text, so reading-comprehension and DI sets cannot be rendered.
Proposal: include `stimulus` (text/HTML) once per `set_key`.

### C2. Free-text answer contract — P1
TITA/numeric questions have `options: null`. Document the accepted answer format for `submit-answer` (number vs string, tolerance) so the UI can offer an input.

---

## D. Planner — P1 (feature missing)
Frontend: `/settings/planner` (calendar, daily plan, stats). **No planner routes exist.**
Proposal (not existing):
- `GET /api/v1/planner/days?from=&to=` -> `[{ date, tasks:[{ id, title, topic, minutes, done }] }]`
- `PUT /api/v1/planner/days/{date}` body `{ tasks:[...] }`; `PATCH /api/v1/planner/tasks/{id}` body `{ done }`
- `GET /api/v1/planner/stats` -> `{ planned, completed, streak }`
Auth: bearer. DB: `planner_tasks(user_id, date, title, topic, minutes, done)`.
Acceptance: a task created on one device appears on another after login.

## E. Linked devices — P1 (feature missing)
Frontend: `/settings/linked-devices`. QR login exists (`/auth/scanner-login/*`) but there is no list or revoke.
Proposal: `GET /api/v1/auth/devices` -> `[{ id, name, platform, last_active, current }]`; `DELETE /api/v1/auth/devices/{id}` (revokes that device's refresh tokens).

## F. Notifications — P2 (feature missing)
The app derives a list from `GET /dashboard/events` (a small fixed set). No notification feed, read state or push registration exist.
Proposal: `GET /api/v1/notifications`, `POST /api/v1/notifications/{id}/read`, `POST /api/v1/devices/push-token`.

## G. Clubs and feed — P1
- **Clubs:** the hub API (`/hub/*`) exists but is behind flag `virtual_hubs` (disabled on staging) and lacks fields the Clubs UI shows: moderator (name, xp, streak), cover image, description, tags, last activity, premium flag.
  Decide whether hubs are clubs; if yes add those fields to `hub` responses and enable the flag.
- **Feed:** no endpoint. Proposal: `GET /api/v1/feed` -> `{ hero, categories, stories[], videos[] }` with pagination.

## H. Duel / multiplayer — P1
The Socket.IO game server exists (`apps/game-server`), but the client protocol (auth handshake, event names, payloads, lifecycle) is not documented for web clients, and it was not
verified as reachable on staging. The frontend's REST calls (`/duel/*`) do not exist and are not used. Needed: a client-protocol document and a staging endpoint.

---

## I. Feature flags that are OFF on staging
`/api/config` reports these disabled, so their (existing) APIs return 404 and could not be exercised: `referral_ladder`, `virtual_hubs`, `ad_engine`, `tournament`,
`location_gamification`, `closed_beta`, `social_clips`, `boss_battle`, `relay_race`, `chatbot_llm`. Enable per feature when the frontend integration should be tested.

## J. Billing checkout — P1
`POST /billing/checkout` and verify routes exist (`billing_checkout` is on). The frontend does not start checkout: it needs the provider SDK flow (Razorpay/Stripe) and confirmation of `providers_available` on `GET /billing/plans`.
Until then the paywall tells the user checkout is unavailable; plan state comes only from the backend entitlement.

## K. Help and support — P2
FAQ content and app info are bundled in the app. Proposal: `GET /api/v1/help/faq` if content should be remotely managed.

## L. Content feedback — note
Frontend `/sync/content/feedback` is correct (the only valid sync key). `POST /feedback` is a closed-beta tester API (flag `closed_beta`), not a replacement.
