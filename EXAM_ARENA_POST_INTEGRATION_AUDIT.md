# Exam Arena post-integration audit (technical findings)

Generated: 2026-11-04T16:54:04.567Z
Scope: frontend `ZumimikCode-main` (working tree at `D:\Exam-Arena-Frontend`), backend `Speed-Gym-main` (local copy) and staging `https://examarena-staging.duckdns.org` (OpenAPI 122 operations).
Nothing was modified in application code; only these report files were written. No tokens, passwords or personal data appear here.

## 1. Executive summary

- **Overall readiness: PARTIALLY READY.** The read side of the application is genuinely connected to staging (31 operations returned 200 at runtime: reads, login, refresh and content-read session requests, with shapes the frontend expects), but the write side is largely unverified and several core journeys have defects or gaps.
- 47 features audited: 6 fully integrated, 18 partially integrated, 5 frontend only, 10 backend only, 3 mock / local only, 4 blocked, 0 not implemented, 1 not verified.
- Endpoints: 122 operations in OpenAPI, 24 are admin/internal/webhook (not frontend APIs). Of 98 user-facing operations the frontend calls 38; 60 are not consumed.
- **Onboarding persistence: NOT VERIFIED.** The frontend now calls `PATCH /auth/me` and hydrates from `/auth/me`, but no save -> logout -> login round trip was run, and backend semantics are undocumented (BE-1).
- **Web: NOT VERIFIED in a signed-in browser flow (build, a11y scans, and script-level API probes only).** **Android APK: NOT VERIFIED (no Android runtime test).**
- Verified defects: Sprint requests return empty sessions for most skills; practice never updates mastery; offline writes are not queued; staging has no payment provider; mock exams lack typed-answer input.

## 2. Methodology and limitations

- Static: source inspection of the frontend (328 production files, 60 test files), backend routers/schemas/migrations/flags, game-server auth and events, and the Git diff. A scanner compared every literal API path in `src/` with all 122 OpenAPI operations.
- Runtime (read-only, test account): GET probes, token/refresh/rotation checks, CORS preflights, Socket.IO handshake, content-read session probes (session creation does not record attempts). **No writes were executed** (profile save, practice sync, mock exam configure/submit, friend responses, logout, registration, checkout) so those flows are marked unverified.
- Earlier in this engagement a few no-op/invalid-type PATCH probes were run against `/auth/me` (documented in docs/ONBOARDING-PERSISTENCE.md); this audit ran none.
- The local backend copy lacks `PATCH /auth/me`; staging runs newer code. Backend source facts for that route could not be read; its behaviour is taken from OpenAPI and probes.
- Android and real browser end-to-end flows were not run; Playwright suites seed a fake session and test layout/accessibility only.

## 3. Feature status

| ID | Feature | Status | Pri | Data source | Runtime evidence |
|---|---|---|---|---|---|
| AUTH-1 | Session, tokens and refresh | PARTIALLY INTEGRATED | P1 | Real backend | Runtime verified (read): login 200, /me 200, refresh 200 with rotation, tampered/garbage token 401. Logout revocation not run. |
| AUTH-2 | Email registration and login | PARTIALLY INTEGRATED | P1 | Real backend | Login runtime verified (200). Register NOT run (creates an account). |
| AUTH-3 | Google authentication | BLOCKED | P2 | Frontend implemented (Firebase SDK); backend returns 501 | Backend source: @router.post("/google", status_code=501). Not called at runtime. |
| AUTH-4 | Phone / OTP authentication | BLOCKED | P2 | Frontend implemented; backend returns 501 | Backend source: @router.post("/phone", status_code=501). |
| AUTH-5 | User profile (view and edit) | PARTIALLY INTEGRATED | P2 | Real (view). Edit page saves to local store only | Runtime verified (read): /auth/me 200. |
| AUTH-6 | Onboarding save and restore | NOT VERIFIED | P0 | Real backend (code path); local Zustand until saved | Read shape verified live (all fields present, empty for the test account). Write behaviour only probed with no-op/invalid bodies earlier: route returns 200; is_onboarded and triggers landed inside behavioral_profile JSONB; lax coercion ('yes' -> true). |
| DASH-1 | Dashboard (stats, radar, metrics, streak, events, leaderboard, recent activity, topics) | FULLY INTEGRATED | P2 | Real backend; Dexie cache only when offline | Runtime verified: all 8 endpoints 200 and element shapes match the frontend types. |
| DASH-2 | Analytics and reports | PARTIALLY INTEGRATED | P2 | Real backend | Underlying endpoints runtime verified (200). |
| PRAC-1 | Practice catalog | FULLY INTEGRATED | P2 | Real backend | Runtime verified: 200, 89 skills, all servable and mastery-feeding. |
| PRAC-2 | Practice sessions (/learn/practice) | PARTIALLY INTEGRATED | P1 | Real backend | Runtime verified: POST returned items for 4/4 sampled skills (1,1,1,3 items; 3 of 4 underfilled). |
| PRAC-3 | Sprint sessions (/play/sprint) | PARTIALLY INTEGRATED | P1 | Real backend | Runtime verified DEFECT: GET ?topic=<skill> returned 0 items for 3 of 4 catalog skills (it filters corpus topic, not skill); POST slots returned items for all four. |
| PRAC-4 | Practice answers, completion and results | PARTIALLY INTEGRATED | P1 | Real backend; verdicts computed on device from backend-supplied expected_answer | NOT run (writes). Contract matches SyncEvent schema. |
| PRAC-5 | Mastery and progress | PARTIALLY INTEGRATED | P1 | Real backend (read) | Runtime verified: both 200 (empty for the test account). |
| LEARN-1 | Explorer (topics, skills, techniques) | FULLY INTEGRATED | P2 | Real backend (global, not exam-specific) | Runtime verified: all four 200. |
| LEARN-2 | Technique lessons and solve-along templates | MOCK / LOCAL ONLY | P2 | Bundled authored content in src/lib/mock/techniques.ts and templates.ts (also generateFallbackTemplates) | n/a |
| MOCK-1 | Mock exam blueprints and listing | FULLY INTEGRATED | P2 | Real backend | Runtime verified: 200 (flag mock_exams enabled on staging). |
| MOCK-2 | Mock exam configuration and session creation | PARTIALLY INTEGRATED | P1 | Real backend | NOT run (creates an attempt). |
| MOCK-3 | Mock answer submission, completion and results | PARTIALLY INTEGRATED | P1 | Real backend (server-graded) | NOT run (writes). |
| MOCK-4 | Mock exam history | PARTIALLY INTEGRATED | P2 | Real backend; topic filter chips from lib/mock/history in real mode | Runtime verified: 200. |
| DUEL-1 | Duel / multiplayer (UI) | FRONTEND ONLY | P1 | Mock fixtures in explicit mock mode; 'unavailable' panel in real mode | n/a |
| DUEL-2 | Socket.IO connections and events | BACKEND ONLY | P1 | n/a | Runtime: GET /socket.io/?EIO=4&transport=polling on staging returned 200 (endpoint reachable); no authenticated socket session was opened. |
| SOC-1 | Friends list and requests | PARTIALLY INTEGRATED | P2 | Real backend | GET runtime verified (200). respond NOT run. |
| SOC-2 | Achievements | FULLY INTEGRATED | P3 | Real backend | Runtime verified: 200, 28 achievements. |
| SOC-3 | Leaderboard | FULLY INTEGRATED | P3 | Real backend | Runtime verified: 200 (11 rows). |
| SOC-4 | Ghost races and daily challenge | BACKEND ONLY | P3 | n/a | GET /social/daily and /social/ghosts return 200 (flags on); frontend does not call them. |
| SOC-5 | Clubs | FRONTEND ONLY | P2 | Mock fixtures in mock mode; 'unavailable' panel in real mode | n/a |
| SOC-6 | Activity feed | FRONTEND ONLY | P3 | Mock fixtures in mock mode; 'unavailable' in real mode | n/a |
| HUB-1 | Hubs | BACKEND ONLY | P3 | n/a | 404 on staging: flag virtual_hubs is disabled. |
| SOC-7 | Taunts and clips | BACKEND ONLY | P3 | n/a | Not called (clips flag off). |
| PLAN-1 | Planner and daily planning | FRONTEND ONLY | P2 | Mock fixtures in mock mode; 'unavailable' in real mode | n/a |
| OFF-1 | Offline mode (caching) | PARTIALLY INTEGRATED | P1 | Dexie: dashboardCache and feedbackQueue only | Not exercised offline in a browser or device. |
| OFF-2 | Data synchronization | PARTIALLY INTEGRATED | P1 | Real backend | NOT run (writes). 'content/feedback' is the only key the backend accepts (source check). |
| NOTIF-1 | Notifications | PARTIALLY INTEGRATED | P3 | Real backend (derived events, not a notification feed) | Runtime verified: 200 (1 event). |
| QR-1 | QR pairing (scan to log in) | PARTIALLY INTEGRATED | P2 | Real backend | NOT run. |
| DEV-1 | Linked devices | FRONTEND ONLY | P2 | Mock in mock mode; 'unavailable' in real mode | n/a |
| BILL-1 | Subscription and plans | PARTIALLY INTEGRATED | P1 | Real backend | Runtime verified: subscription 200 (tier free). /billing/plans 200 with providers_available: [] (no payment provider configured). |
| BILL-2 | Checkout, cancel, resume, change plan | BLOCKED | P1 | n/a | Not called. |
| ENT-1 | Entitlements and feature access | PARTIALLY INTEGRATED | P1 | Real backend for tier; limits (free mocks/preps) are client constants | Subscription verified; client flag consumption not implemented. |
| REF-1 | Referrals | BLOCKED | P3 | Real backend (code path); placeholder while off | 404 on staging: flag referral_ladder disabled. |
| FAM-1 | Family accounts | BACKEND ONLY | P3 | n/a | GET /family 200; frontend does not call it. |
| ADS-1 | Advertisements | BACKEND ONLY | P3 | n/a | 404: flag ad_engine disabled. |
| BETA-1 | Beta features and tester feedback | BACKEND ONLY | P3 | n/a | GET /beta/status 200; frontend does not call it. |
| TOUR-1 | Tournaments | BACKEND ONLY | P3 | n/a | Flag tournament disabled. |
| CHAT-1 | Chatbot hints | BACKEND ONLY | P3 | n/a | GET /chat/policy 200 (chatbot flag on); frontend does not call it. |
| HELP-1 | Help and support | MOCK / LOCAL ONLY | P3 | Bundled FAQ and hardcoded app info (version 1.0.0, build 2026.06.20) from lib/mock/help | n/a |
| MKT-1 | Onboarding testimonials | MOCK / LOCAL ONLY | P2 | Fabricated student reviews with names and percentage claims in src/lib/mock/reviews.ts, shown to real users | n/a |
| CFG-1 | Feature-flag awareness (GET /api/config) | BACKEND ONLY | P2 | n/a | Runtime verified 200; flags disabled on staging: ad_engine, boss_battle, chatbot_llm, closed_beta, location_gamification, referral_ladder, relay_race, social_clips, tournament, virtual_hubs. |

## 4. Critical findings (P0 and P1)

### AUTH-6 Onboarding save and restore (P0, NOT VERIFIED)
- Persistence across logout/login is unverified.
- Backend null/empty semantics, enum validation and storage design are undocumented (see backend tasks BE-1).
- persona/goal/target_exam values use UI vocabulary; backend DB CHECK enums differ - unknown where they are stored.
- examDates, reminders, plan lane, drills, focus mode have no backend field and stay local.
- Local backend source copy (Downloads/Speed-Gym-main) lacks PATCH /auth/me; staging runs newer code, so the contract is from OpenAPI + probes only.
- Next: Run save -> logout -> login on a disposable staging account; backend team documents null/empty semantics and enums.
- Evidence: src/services/onboarding.ts; src/components/onboarding/onboarding-modal.tsx (handleFinish); src/components/shell/app-entry.tsx; staging openapi: UpdateProfileRequest

### AUTH-1 Session, tokens and refresh (P1, PARTIALLY INTEGRATED)
- Refresh is single-flight (fixed in this integration); previously parallel 401s reused one rotated refresh token and the backend revoked the session.
- Tokens live in localStorage, not secure storage; Android manifest has allowBackup=true.
- Logout revocation (POST /auth/logout) is unit-tested only; no live call was made.
- Next: Move tokens to secure storage on native; set allowBackup=false or exclude prefs; run a logout->refresh-token-rejected check on staging.
- Evidence: src/services/api.ts; src/stores/auth-store.ts; src/services/api-refresh.test.ts; android/app/src/main/AndroidManifest.xml:5

### AUTH-2 Email registration and login (P1, PARTIALLY INTEGRATED)
- Registration has no runtime evidence.
- Password policy (min 8) enforced by backend only.
- Next: Run register against a disposable staging account.
- Evidence: src/stores/auth-store.ts; src/components/auth/auth-modal.tsx

### PRAC-2 Practice sessions (/learn/practice) (P1, PARTIALLY INTEGRATED)
- Items are free-text only (no options); backend ships expected_answer for on-device checking (client_extract).
- Difficulty selector is cosmetic (no backend parameter).
- Several skills have little stock (underfilled sessions).
- Next: Surface 'fewer questions than requested' to the user; remove or wire the difficulty control.
- Evidence: src/services/practice.ts; probe: POST slots 200

### PRAC-3 Sprint sessions (/play/sprint) (P1, PARTIALLY INTEGRATED)
- Sprint will usually show empty sessions for catalog skills.
- Next: Switch Sprint to the POST slot contract used by Practice.
- Evidence: src/services/sprint-session.ts:21; probe: GET topic 0/0/0/3 items

### PRAC-4 Practice answers, completion and results (P1, PARTIALLY INTEGRATED)
- Results are not queued offline: if the request fails the user can retry, but closing the app loses the batch.
- No backend result object is returned; score is local.
- Next: Persist the pending batch to Dexie so it survives a reload.
- Evidence: src/services/telemetry.ts

### PRAC-5 Mastery and progress (P1, PARTIALLY INTEGRATED)
- Practising never moves mastery: the frontend has no BKT engine, so no technique_states snapshot is ever sent.
- Adaptive engine still seeds topic names from lib/mock/adaptive (mastery starts at 0 in real mode).
- Next: Backend computes mastery from attempts, or the BKT package is shipped to the client.
- Evidence: services/api/app/routers/sync.py:618; src/lib/adaptive/engine.ts

### MOCK-2 Mock exam configuration and session creation (P1, PARTIALLY INTEGRATED)
- Only mode 'full' is used: no sectional selection or practice flag UI.
- No input for typed (TITA/numeric) answers and no passage/stimulus rendering for RC/DILR sets.
- Feature-flag/403 responses are shown as a generic error.
- Next: Add typed-answer input and stimulus rendering (needs backend stimulus field).
- Evidence: src/services/mock-exam.ts

### MOCK-3 Mock answer submission, completion and results (P1, PARTIALLY INTEGRATED)
- Results screen is the sprint results page fed a mapped SprintResult (section scores/percentile not shown).
- No offline queue for mock answers.
- Next: Show server score breakdown; queue answers offline.
- Evidence: src/services/backend-adapters.ts (mapMockResults)

### DUEL-1 Duel / multiplayer (UI) (P1, FRONTEND ONLY)
- No Socket.IO client in package.json (no socket.io-client), so real-time play cannot work.
- duel.ts still contains calls to nonexistent REST routes.
- Next: Frontend: add socket.io-client and implement against the game-server protocol.
- Evidence: src/services/duel.ts; package.json

### DUEL-2 Socket.IO connections and events (P1, BACKEND ONLY)
- Client protocol is undocumented; namespaces and payload schemas must be read from source.
- Next: Backend: publish the client protocol; Frontend: implement.
- Evidence: apps/game-server/src/index.ts:128-145; probe: /socket.io 200

### OFF-1 Offline mode (caching) (P1, PARTIALLY INTEGRATED)
- Only the dashboard cache and content-feedback queue exist; practice, sprint, mock-exam and onboarding writes are not queued.
- Queued feedback is deleted after 3 failed retries (MAX_SYNC_RETRIES) - pending work is discarded.
- Next: Add durable queues for attempts and profile saves; stop deleting after max retries (park instead).
- Evidence: src/services/offline/db.ts:25-27; src/services/offline/sync.ts:6,98-99

### OFF-2 Data synchronization (P1, PARTIALLY INTEGRATED)
- No conflict handling beyond server idempotency.
- Retry of a practice batch reuses event ids (good) but is not persisted.
- Next: Persist batches; add status surface.
- Evidence: src/services/telemetry.ts; services/api/app/routers/sync.py:715

### BILL-1 Subscription and plans (P1, PARTIALLY INTEGRATED)
- Plans endpoint is not consumed; prices are not shown from the backend.
- Staging reports no payment provider, so checkout would fail even if wired.
- Next: Backend: configure Razorpay/Stripe; Frontend: wire checkout + verify.
- Evidence: src/services/billing.ts; probe: providers_available []

### BILL-2 Checkout, cancel, resume, change plan (P1, BLOCKED)
- No payment provider configured on staging; frontend flow not built.
- Next: Provider configuration + SDK integration.
- Evidence: src/components/paywall/paywall-modal.tsx

### ENT-1 Entitlements and feature access (P1, PARTIALLY INTEGRATED)
- Plan limits (FREE_MOCK_LIMIT=2, FREE_EXTRA_PREPS=1) are hardcoded client-side, not server-enforced.
- Client never reads /api/config; disabled features surface as 404/403.
- Next: Server-enforced limits; read flags.
- Evidence: src/stores/plan-store.ts; src/hooks/queries/use-subscription.ts


## 5. API connection map

Connected (38): `GET /api/v1/social/achievements`, `GET /api/v1/practice/mastery`, `POST /api/v1/sync`, `GET /api/v1/dashboard/stats`, `GET /api/v1/dashboard/streak`, `POST /api/v1/auth/refresh`, `GET /api/v1/billing/subscription`, `POST /api/v1/sync/{key}`, `GET /api/v1/dashboard/topics`, `GET /api/v1/dashboard/radar`, `GET /api/v1/dashboard/metrics`, `GET /api/v1/dashboard/events`, `GET /api/v1/dashboard/leaderboard`, `GET /api/v1/dashboard/recent-activity`, `GET /api/topics`, `GET /api/v1/practice/catalog`, `GET /api/practice/techniques`, `GET /api/v1/social/friends`, `POST /api/v1/social/friends/respond`, `GET /api/v1/mocks/history`, `GET /api/v1/mocks/blueprints`, `POST /api/v1/mocks/configure`, `POST /api/v1/mocks/submit-answer`, `POST /api/v1/mocks/submit`, `GET /api/v1/auth/me`, `PATCH /api/v1/auth/me`, `POST /api/v1/auth/scanner-login/generate`, `GET /api/v1/auth/scanner-login/poll`, `POST /api/v1/auth/scanner-login/verify`, `POST /api/v1/practice/session`, `GET /api/v1/referral`, `GET /api/v1/practice/session`, `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/google`, `POST /api/v1/auth/phone`, `GET /api/v1/mocks/results/{mock_id}`.

Frontend calls with no matching backend route (all behind an unavailable page in real mode): `GET /duel/topics`, `GET /duel/opponents`, `GET /duel/result`, `GET /pairing/sessions`, `POST /pairing/session/{id}/revoke`, `GET /planner/days`, `GET /planner/stats`.

User-facing operations not consumed by the frontend (60): `GET /health`, `GET /ready`, `GET /api/v1/billing/plans`, `POST /api/v1/billing/checkout`, `POST /api/v1/billing/checkout/verify`, `POST /api/v1/billing/cancel`, `POST /api/v1/billing/resume`, `POST /api/v1/billing/change`, `GET /api/v1/social/policy`, `POST /api/v1/social/friends/request`, `POST /api/v1/social/friends/remove`, `POST /api/v1/social/friends/qr/generate`, `POST /api/v1/social/friends/qr/redeem`, `GET /api/v1/social/ghosts`, `POST /api/v1/social/ghosts`, `POST /api/v1/social/ghosts/{ghost_id}/race`, `GET /api/v1/social/daily`, `POST /api/v1/social/daily/submit`, `GET /api/v1/social/daily/leaderboard`, `GET /api/v1/social/taunts/{match_id}`, `POST /api/v1/social/clips`, `POST /api/v1/social/clips/{clip_id}/consent`, `POST /api/v1/social/clips/{clip_id}/revoke`, `GET /api/v1/social/clips/{clip_id}`, `POST /api/v1/referral/redeem`, `POST /api/v1/referral/claim`, `GET /api/v1/ads/decision`, `GET /api/v1/ads/units`, `POST /api/v1/ads/impressions`, `GET /api/v1/chat/policy`, `POST /api/v1/chat/query`, `GET /api/v1/family`, `POST /api/v1/family/sub-account/create`, `POST /api/v1/family/sub-account/override`, `POST /api/v1/family/sub-account/remove`, `GET /api/v1/family/friends/{child_user_id}`, `POST /api/v1/family/friends/request`, `POST /api/v1/family/friends/respond`, `POST /api/v1/family/friends/revoke`, `POST /api/v1/tournament/create`, `POST /api/v1/tournament/{tournament_id}/register`, `POST /api/v1/tournament/{tournament_id}/close-registration`, `POST /api/v1/tournament/{tournament_id}/round`, `GET /api/v1/tournament/{tournament_id}`, `GET /api/v1/tournament/{tournament_id}/standings`, `GET /api/v1/tournament/{tournament_id}/bracket`, `POST /api/v1/hub/create`, `GET /api/v1/hub/search`, `GET /api/v1/hub/mine`, `GET /api/v1/hub/{hub_id}`, `POST /api/v1/hub/{hub_id}/join`, `POST /api/v1/hub/{hub_id}/leave`, `GET /api/v1/hub/{hub_id}/leaderboard`, `POST /api/v1/location/checkin`, `POST /api/v1/beta/redeem`, `GET /api/v1/beta/status`, `POST /api/v1/feedback`, `GET /api/config`, `GET /api/subtopics/reference`, `GET /api/subtopics/{subtopic_id}/reference`.

## 6. Mock, static and local data classification

| Class | Findings |
|---|---|
| 1. Production feature using mock data | History topic filter chips (src/app/(app)/settings/history/page.tsx:89 uses lib/mock/history in real mode); onboarding testimonials (src/lib/mock/reviews.ts); bundled solve-along templates and fallback generator in real-mode Practice "Templates" |
| 2. Intentional static content | Technique lessons (lib/mock/techniques), help FAQ and hardcoded app info, MOBILE_NAV, SPRINT_CONFIG presentation defaults (all imported from lib/mock, which is misleading) |
| 3. Test fixtures | src/lib/test-support/, `*.test.*` |
| 4. Development-only mock | Every `IS_MOCK` branch in services (45 files reference IS_MOCK); clubs, feed, duel, planner, linked-devices fixtures |
| 5. Local cache/offline data | Dexie dashboardCache and feedbackQueue |
| 6. Real backend data | Dashboard, catalog, explorer, mock exams, friends, achievements, leaderboard, billing, profile |
| 7. Dead code | 17 never-referenced service functions (see FE-16) |

Production mode does not silently fall back to fixtures when an API fails: services throw and pages show error states (verified by tests and code); the exceptions are the items in class 1.

## 7. Authentication and onboarding deep audit

Flow: Register -> Login -> Token storage -> Authenticated API -> Profile -> Onboarding -> Save -> Logout -> Login -> Restore.

| Step | Status | Evidence |
|---|---|---|
| Register | NOT VERIFIED (not run) | POST /auth/register wired in src/stores/auth-store.ts |
| Login | Verified at runtime | POST /auth/login 200; response includes onboarding fields |
| Token storage | Works; weak | Persisted Zustand (localStorage key zuzumik-auth); no secure storage; Android allowBackup=true |
| Authorization header | Verified in code and tests | src/services/api.ts |
| Refresh | Verified at runtime | refresh 200; old refresh token then 401 (rotation with reuse detection); single-flight client |
| Session expiry | Verified in tests | api-refresh.test.ts; backend message "invalid or expired access token" for expired/tampered tokens |
| Logout + revocation | Unit-tested only | auth-store logout posts {refreshToken}; not run live |
| /auth/me mapping | Verified | {user:{...}} envelope unwrapped; onboarding fields kept in User type |
| Onboarding form submission | Code path exists | PATCH only on the final step (handleFinish); completion only after 2xx |
| Backend persistence | NOT VERIFIED | write semantics undocumented; answers stored in behavioral_profile JSONB (observed) |
| Profile restoration after login | NOT VERIFIED | hydrateOnboardingFromUser (authoritative) called after login; unit-tested only |
| Survives logout/login? | **NOT VERIFIED** | requires BE-1 and a live round trip |

Fields with no backend home: examDates, reminder time, focus mode, daily minutes, plan lane, drills, vedic use case, habit data. Google: backend 501 (frontend implemented). Phone/OTP: backend 501 (frontend implemented). Neither is working.

## 8. Web vs Android

| Area | Web | Android APK |
|---|---|---|
| API base URL | NEXT_PUBLIC_API_URL read at build (static export); not hardcoded in components | Same bundle; URL baked into the APK at build time |
| CORS | Staging allows localhost, capacitor://localhost, https://localhost; unlisted origin refused (verified) | Android WebView origin https://localhost is allowed (verified by preflight; not by device) |
| HTTPS | Staging is HTTPS | Debug manifest sets usesCleartextTraffic=true (debug only) |
| Token storage | localStorage | WebView localStorage; no secure storage plugin; allowBackup=true |
| IndexedDB/Dexie | Used (dashboardCache, feedbackQueue) | NOT VERIFIED on device |
| Socket.IO | No client library installed | none |
| Deep links | n/a | No intent-filter for a custom scheme or host (no deep links) |
| Back button | n/a | App.addListener("backButton") exists in capacitor-init.tsx; NOT VERIFIED on device |
| Build | npm run build passes | APK not rebuilt in this audit; NOT VERIFIED |

Required Android test plan:
1. Build: npm run build && npx cap sync android && cd android && gradlew assembleDebug (note the staging URL is baked in at build time from .env.local).
2. Install on a device/emulator; confirm launch and that the API host is reachable (HTTPS).
3. Register or log in; kill and reopen the app: session must restore (tokens persist in WebView localStorage).
4. Complete onboarding; log out; log in again: all fields must be repopulated (also verifies AUTH-6).
5. Airplane mode: open dashboard (cached), run a practice session, finish it: confirm what happens to the batch; re-enable network and confirm sync.
6. Press the Android back button on each main route; rotate the device; open the keyboard on the login form.
7. Install a second device, log in as the same user, confirm saved onboarding data and QR pairing.
8. Confirm no cleartext traffic in the release build (debug manifest allows cleartext).

## 9. Regression assessment

- No new test failures are attributable to the integration: the 12 failing unit tests are in onboarding intro/review/stall-timer components with no diff against the pre-session commit; the responsive spec failure (sidebar 84px vs 250px) predates the work (spec dated 2026-09-28; app-shell.tsx changed by 2 lines that do not affect layout).
- Behaviour changes introduced deliberately: real mode no longer shows fixtures; Pro cannot be granted locally; onboarding completion now waits for a server save (a backend outage blocks completing onboarding while online).
- Risk: the onboarding save is the first write to `PATCH /auth/me`; if the backend rejects the UI vocabulary, users cannot finish onboarding (they see the error and can retry).

## 10. Readiness assessment

**PARTIALLY READY.** Safe: dashboard, explorer, catalog, achievements, leaderboard, subscription display. Not ready: onboarding persistence (unverified), Sprint, mastery updates, offline queues, mock-exam completeness, checkout, multiplayer, planner, linked devices.
