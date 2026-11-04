# Exam Arena — Frontend ↔ Speed-Gym Backend Integration Report

Backend: `https://examarena-staging.duckdns.org` (121 operations in its OpenAPI, fetched 2026-11-04).
Evidence level: contracts verified against the staging OpenAPI **and** the Speed-Gym router source. No authenticated
request was made against staging (no credentials supplied), so nothing below is "PASS — verified against live data".

Status key: PASS = verified working · PARTIAL · BLOCKED = backend missing · NOT VERIFIED · FAIL = verified defect.

## 1. Route diff (frontend calls vs backend)

| Frontend calls | Backend | Status |
|---|---|---|
| `/auth/login`, `/register`, `/refresh`, `/logout`, `/me` | exist | see §4 |
| `/auth/google`, `/auth/phone` | exist, return 501 | BLOCKED (backend config) |
| `/practice/session`, `/practice/catalog`, `/practice/mastery` | exist | PARTIAL |
| `/sync`, `/sync/content/feedback` | exist (`content/feedback` is the **only** valid key) | PARTIAL |
| `/dashboard/*` (topics, radar, metrics, stats, streak, events, leaderboard, recent-activity) | exist | PARTIAL |
| `/social/friends`, `/social/achievements` | exist | PARTIAL |
| `/mocks/blueprints`, `/mocks/history` | exist | PARTIAL |
| `/api/topics`, `/api/practice/techniques` | exist, **global, unfiltered** | PARTIAL |
| `/mock-exam/session/{id}` | **absent** | replaced (see §3) |
| `/duel/topics`, `/duel/opponents`, `/duel/result` | **absent** (game is Socket.IO) | BLOCKED |
| `/pairing/sessions`, `/pairing/session/{id}/revoke` | **absent** (only QR scanner-login) | BLOCKED |
| `/planner/days`, `/planner/stats` | **absent** | BLOCKED |
| Billing, entitlements, referral, family, hubs, ads, beta, tournaments | exist; **no frontend service calls them** | NOT INTEGRATED |

## 2. Integrated / changed in this pass

- **Mock exam lifecycle — PARTIAL (implemented, unit-tested, not run against live staging).**
  `getMockPaperSession` now does `POST /mocks/configure {exam, mode:"full", practice:false}` instead of the absent
  `GET /mock-exam/session/{id}`. Each answer → `POST /mocks/submit-answer`; finish → `POST /mocks/submit`
  (bulk answers, so a lost single answer is recovered) then `GET /mocks/results/{mock_id}`. Verdicts come from the
  server review; the client never computes correctness (the backend withholds correct answers). Submit failure shows a
  retry banner; the resume snapshot is cleared only after the server acknowledges. Results page no longer re-syncs a
  server-recorded mock as a sprint.
  *Gaps:* free-text (TITA/numeric) questions have no input in the mock run UI; shared passages/sets (RC, DILR
  `set_key`) are not rendered; mock answers are not queued offline (backend supports a bulk offline submit).
- **Logout — FIXED.** `logout()` cleared local state but never called `POST /auth/logout`, so refresh tokens stayed
  valid. It now clears locally and synchronously, then revokes best-effort (`{refreshToken}`); offline revocation is lost.
- **Profile — FIXED.** `/auth/me` returns `{user:{id,name,email,role,tier}}`; `profile.ts` read `name` off the envelope,
  so every user showed as "Learner".
- **Exam / path / topics (earlier pass).** `target_exam` and `active_path` are modelled separately
  (`src/lib/exam-scope.ts`, `onboarding-store.activePath`). Global topics and dashboard mastery are labelled as such.
  Hard-coded fake learn-page stats removed.
- **Mock data.** `IS_MOCK` is locked `false`; real mode never imports `src/lib/mock/*`. Mock files are retained.

## 3. Contract mismatches found

1. `/mock-exam/session/{paperId}` does not exist → rewritten (above).
2. `/auth/me` envelope → fixed.
3. `logout` never revoked → fixed.
4. `GET /dashboard/topics?domain=` and `/api/topics` have no exam concept.
5. `target_exam` / `active_path` are DB columns with **no API** to read or write them.
6. Frontend `content/feedback` is correct (`templateId, reason, comment, reportedAt`); the audit's "should use
   `/api/v1/feedback`" is wrong — that route is a closed-beta tester feedback API (roster + `closed_beta` flag gated).
7. Backend gates `/mocks/*` behind the `mock_exams` feature flag; a 403 is possible for flag-off users (not yet surfaced
   with a dedicated message).

## 4. Authentication — PARTIAL
Email register/login/refresh (`{refreshToken}`) match the schemas; logout now revokes. Google/phone: UI preserved,
backend returns 501 (needs Firebase/provider config server-side). Session restoration and route protection exist
(persisted store) — **NOT VERIFIED** end-to-end against staging.

## 5. Offline sync — PARTIAL / NOT VERIFIED
Dexie queue posts `/sync/{key}`; only `content/feedback` is accepted (others 404 by design — queued mutations with any
other key would be refused). `/sync` events carry `event_id` idempotency (resends absorbed). Queue-clearing semantics
and Dexie sync were not exercised against staging in this pass.

## 6. Capacitor / Android — NOT VERIFIED
Not tested on a device or emulator. Note the debug manifest/LAN config from an earlier commit; staging is HTTPS so
cleartext is not needed. Back button, safe areas, offline cold start and deep links remain unchecked.

## 7. Mock-data dependencies remaining
Planner, duel, linked devices, clubs, feed, help, notifications, pairing lists have no backend; in real mode they call
absent routes (errors/empty). Not hidden behind mocks. Billing/paywall plan state is local (`plan-store`) — it must not
be treated as an entitlement; backend `GET /billing/subscription` is not wired.

## 8. Missing backend work (exact asks)
- Expose `target_exam` and `active_path` on `/auth/me` and add a write route.
- Add an exam/domain tag to problems/topics; make `/api/topics` and `/dashboard/topics` honour `domain`.
- Linked-devices list + revoke; planner routes (or confirm out of scope); duel REST (or document the Socket.IO
  auth/events for the client).
- Configure Firebase/phone provider for `/auth/google` and `/auth/phone`.
- Mock `configure` response would benefit from an explicit `passage`/`stimulus` field for set-based questions.

## 9. Files modified / added
Modified: `src/lib/platform/config.ts`, `.env.example`, `src/stores/auth-store.ts`, `src/stores/onboarding-store.ts`,
`src/stores/sprint-store.ts`, `src/stores/resume-store.ts`, `src/lib/types/sprint-session.ts`,
`src/services/{mock-exam,backend-adapters,profile}.ts`, `src/app/(app)/learn/{page.tsx,explorer/page.tsx,mock/run/page.tsx}`,
`src/app/(app)/play/sprint/results/page.tsx`, tests: `security.test.ts`, `offline-storage.test.ts`, `state-management.test.ts`.
Added: `src/lib/exam-scope.ts(+test)`, `src/lib/test-support/stub-login-fetch.ts`, `src/services/mock-exam.test.ts`,
`src/stores/auth-logout.test.ts`, this report. `.env.local` untouched by this pass beyond the earlier URL edit.

## 10. Results
- TypeScript (`tsc --noEmit`): PASS.
- ESLint on touched dirs: reported no output (clean).
- Vitest: 450 pass, 12 fail — all 12 pre-existing and unrelated (onboarding intro carousels, ReviewCarousel,
  StallTimer), failing identically before these changes.
- `git diff --check`: clean.
- Production build: **FAIL** — `next/font` error in `src/app/layout.tsx` ("Cannot read properties of null (reading '1')").
  File not modified by me; not confirmed as pre-existing against a clean checkout.
- Playwright: **NOT RUN** (needs the `out/` export from a successful build).
- Browser console / network checks, mobile responsive checks, live staging checks: **NOT RUN**.

## 11. Remaining risks
`.env.local` (with a Firebase key) is staged in git — `git rm --cached .env.local`. The mock-run UI cannot answer TITA
questions or show passages, so a real CAT mock is only partly usable. No end-to-end run against staging has been done.

---

## Addendum — Mock-data audit (real mode)

`IS_MOCK` is now `NEXT_PUBLIC_API_MOCK === "true"` (real backend by default; fixtures only on explicit opt-in).

| Page / feature | Data source before | Backend API | Action taken |
|---|---|---|---|
| Settings — overview stats | hard-coded 47 / 12-Day / #47 / 2,340 | `/dashboard/streak`, `/stats`, `/leaderboard` | real via `useAccountSummary`; `--` when unknown; "Sessions" relabelled "Questions" (no sessions-count API) |
| Settings — badge | hard-coded "CHAMPION" | `/auth/me` `tier` | account tier |
| Settings — subscription | hard-coded Free Plan, $9.99, feature list | `/billing/subscription` | real plan/status/dates; error state; no invented price or feature claims |
| Plan gate / paywall | local `setPro()` granted Pro with no payment | `/billing/subscription` entitlement | `setPro` is mock-only; paywall shows "checkout isn't available"; plan only from entitlement; stale persisted "pro" reset |
| Learn — Your Stats card | hard-coded 87% / 1,247 … | `/dashboard/stats` | real, `--` until measured |
| Learn — Adaptive stats | fixture seed mastery, `8.4 sec/q`, "0h", topic answer-streak labelled "days" | `/practice/mastery`, `/dashboard/stats`, `/dashboard/streak` | real streak/accuracy/speed; unknown shown `--`; seeds start at 0 |
| Dashboard | already 8 real endpoints; error state on failure; offline cache + banner | `/dashboard/*` | no change needed (audited per widget) |
| Clubs, Feed | fixture arrays rendered directly | none | unavailable state |
| Duel, Planner, Linked devices | absent REST routes | none | unavailable state |
| Notifications | `/dashboard/events` mapping | `/dashboard/events` | unchanged (verified route) |
| Help FAQ, technique lessons, solve-along templates | bundled authored content | none | unchanged — static content, not user data (see remaining) |

Remaining: `generateFallbackTemplates` and `SAMPLE_TEMPLATES` can still feed the practice screen in real mode; per-exam adaptive topic
names (`ADAPTIVE_TOPICS_BY_DOMAIN`) are hard-coded and not backend-verified; `topic-node-map` is bundled; no checkout flow is wired
(backend `/billing/checkout` exists; needs provider SDK work); no authenticated staging run; build still fails on `next/font`;
Playwright not run.
