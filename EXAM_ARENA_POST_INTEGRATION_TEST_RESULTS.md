# Post-integration test results

Generated: 2026-11-04T16:54:04.567Z. Every row below is a command or probe that was actually executed in this audit, except those marked NOT RUN / BLOCKED. No source was changed to make anything pass.

| Command / probe | Scope | Result | Detail |
|---|---|---|---|
| `npm run typecheck (tsc --noEmit)` | frontend | **PASSED** | exit 0, 19s |
| `npm run lint (next lint)` | frontend | **PASSED** | exit 0, 0 errors, 4 warnings (<img> in clubs/feed pages, pre-existing fixture pages) |
| `npm run test (vitest run)` | frontend | **FAILED** | 555 tests: 543 passed, 12 failed (59 files: 56 passed, 3 failed). Failures: intro-carousel (5), review-carousel (1), stall-timer (6). Pre-existing: those component folders have no diff against pre-session commit 94b5bbd. |
| `npm run build (next build + fix-asset-paths)` | frontend | **PASSED** | exit 0, 77s. An earlier run in this engagement failed once with a next/font error and later passed; treat as intermittent (network). |
| `npm run test:a11y (playwright, chromium)` | frontend e2e | **PASSED** | 20 passed (28.7s). Covers 3 public + 17 app routes. NOTE: the suite seeds a fake session ('mock-jwt-token') into localStorage (tests/e2e/helpers/responsive.ts) and serves the static export; it checks accessibility/layout only and does not exercise live backend flows. |
| `npx playwright test tests/e2e/responsive.spec.ts --project=chromium` | frontend e2e | **FAILED** | Fails on every app-shell route (e.g. /dashboard, /learn, /settings): 'sidebar-hidden ... main-margin-left=84 expected 250' at 1280/1920px; /auth and /onboarding pass. Pre-existing: spec dated 2026-09-28; app-shell.tsx changed by 2 unrelated lines; sidebar default expanded=false. |
| `pytest --collect-only (services/api)` | backend | **BLOCKED** | 1,317 tests collected (97s). Execution not run: the suite needs Postgres and Neo4j (ports 5432 and 7687 not listening; conftest builds a throwaway database). |
| `Game-server tests (apps/game-server vitest)` | backend | **NOT RUN** | Not executed in this audit. |
| `Live GET probes against staging` | api contract | **PASSED** | 27 endpoints 200 with expected shapes; 4 returned 404 because feature flags are off. |
| `Live auth probes (login, /me, refresh rotation, tampered token)` | api contract | **PASSED** | login 200; /me 200; refresh 200; old refresh token 401 (rotation); invalid token 401 'invalid or expired access token'. |
| `Live practice session probe (GET vs POST slots, 4 skills)` | api contract | **FAILED (defect found)** | POST slots OK; GET ?topic=<skill> returned 0 items for 3/4 skills (Sprint uses GET). |
| `CORS preflight for Android/web origins` | api contract | **PASSED** | https://localhost, capacitor://localhost, http://localhost allowed; https://evil.example refused (400). |
| `Android build / device run` | android | **NOT RUN** | No device or emulator used; APK not rebuilt in this audit. |

## Frontend unit test failures (12)
`ArenaIntro` (2), `PitchIntro` (3), `ReviewCarousel` (1), `StallTimer` (6). Source folders `src/components/onboarding/slides` and `intros` have no diff since pre-session commit 94b5bbd, so these failures are not introduced by the integration.

## Live API verification summary
- 200: GET /api/v1/social/achievements, GET /api/v1/practice/mastery, GET /api/v1/dashboard/stats, GET /api/v1/dashboard/streak, POST /api/v1/auth/refresh, GET /api/v1/billing/subscription, GET /api/v1/dashboard/topics, GET /api/v1/dashboard/radar, GET /api/v1/dashboard/metrics, GET /api/v1/dashboard/events, GET /api/v1/dashboard/leaderboard, GET /api/v1/dashboard/recent-activity, GET /api/topics, GET /api/v1/practice/catalog, GET /api/practice/techniques, GET /api/v1/social/friends, GET /api/v1/mocks/history, GET /api/v1/mocks/blueprints, GET /api/v1/auth/me, POST /api/v1/practice/session, GET /api/v1/practice/session, POST /api/v1/auth/login, GET /health, GET /api/v1/billing/plans, GET /api/v1/social/policy, GET /api/v1/social/ghosts, GET /api/v1/social/daily, GET /api/v1/chat/policy, GET /api/v1/family, GET /api/v1/beta/status, GET /api/config
- 404 (feature flag off): GET /api/v1/referral, GET /api/v1/ads/units, GET /api/v1/hub/search, GET /api/v1/hub/mine
- Not run (writes or not consumed): all other operations.

## What is NOT verified
Android runtime, real browser flows against a signed-in session, every write operation, onboarding persistence across logout/login, backend test execution, Socket.IO authenticated session.
