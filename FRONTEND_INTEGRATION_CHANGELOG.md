# Frontend integration changelog

Scope: connecting the Exam Arena frontend to the Speed-Gym backend on staging. Nothing here is deployed. Earlier steps are in commit `f8983fd`
(branch `feature/backend-integration`) and the clean `main` push; the items under "This pass" are uncommitted in the working tree.
No secrets are recorded. `.env.local` was not modified by any of this work.

## This pass (uncommitted)

### Authentication and tokens
- `src/services/api.ts`: **single-flight token refresh.** All 401s share one `POST /auth/refresh`; the backend rotates refresh tokens and revokes the family on reuse, so parallel
  refreshes used to log the user out and wipe local data (including onboarding). A request whose token was already renewed retries with the new one. A refresh that
  fails because of the network or a 5xx no longer signs the user out; only an explicit rejection does. Added `apiPatch`.
- `src/stores/auth-store.ts`: `User` now keeps the onboarding fields login and `/auth/me` return (`isOnboarded, persona, goal, targetExam, firstName, triggers, sex, dob, temporalWindow, activePreps, behavioral_profile`).
- Verified live (read-only): login 200, `/auth/me` 200, refresh 200 with rotation, tampered token 401 `invalid or expired access token` (a generic message for expired, tampered or wrongly-signed tokens; tokens are HS256 with 15-minute life).

### Onboarding persistence (contract-based, write not verified on staging)
- New `src/services/onboarding.ts`: `buildProfilePatch` (snake_case, only meaningful values, never null/""/[]), `saveOnboardingProfile` (`PATCH /auth/me`, resolves only on 2xx),
  `refreshProfileFromServer` (`GET /auth/me`), `hydrateOnboardingFromUser` (authoritative after login; fill-blanks-only on session restore).
- `components/auth/auth-modal.tsx`: after login/register, waits for `/auth/me` and hydrates the onboarding store from it.
- `components/shell/app-entry.tsx`: refreshes the profile once on session restore.
- `components/onboarding/onboarding-modal.tsx`: goal/temporal window are prefilled from the saved profile; `handleFinish` saves first and marks onboarding complete only after a 2xx; shows the server error otherwise.

### Social
- `app/(app)/dashboard/friends/page.tsx`, `services/friends.ts`, `hooks/queries/use-friends.ts`, `lib/types/friends.ts`, `services/backend-adapters.ts`: the **Accept / Reject buttons on friend requests were not wired**.
  They now call `POST /social/friends/respond {friendship_id, action: "accept"|"decline"}` (new `useRespondToFriendRequest`, refreshes `["friends"]`); the friendship id is carried through the adapter.

### Referral
- New `services/referral.ts`, `hooks/queries/use-referral.ts`; `components/dashboard/invite-card.tsx` now shows the **server-issued** code and verified count from `GET /referral`. Real mode no longer generates a random local code. Flag `referral_ladder` is off on staging, so the card shows a placeholder there.

### Explorer, Practice (earlier in this session, listed for completeness)
- Explorer: `services/explorer-tree.ts` builds the global topic/skill tree; `hooks/queries/use-explorer.ts`, `components/explorer/mastery-panel.tsx`, `mind-map.tsx` (technique links to Practice), `explorer/page.tsx`, `lib/exam-scope.ts` (`resolveExplorerScope`, `explorerScopeKey`), `use-sprint.ts`, `use-technique.ts`.
- Practice: `services/practice.ts` (POST slot contract), `services/telemetry.ts` (events built once, idempotent retry), `hooks/queries/use-practice.ts`, `practice/page.tsx` (states, save status, `?skill=` deep link).

### Tests added or updated (this pass)
New: `services/onboarding.test.ts` (14), `services/api-refresh.test.ts` (6), `app/friends-requests.test.tsx` (4), `components/dashboard/invite-card.test.tsx` (3),
plus earlier `app/practice-real-data.test.tsx`, `app/explorer-real-data.test.tsx`, `services/mock-exam.test.ts`, `stores/profile-persistence.test.ts`, `stores/auth-logout.test.ts`, `lib/exam-scope.test.ts`, `lib/real-data.test.tsx` and others.
Updated: `services/backend-adapters.test.ts` (friend mapper carries `friendshipId`), plus timeout hardening in the two heavy page tests.

## Earlier work (commit f8983fd)
Real-mode enforcement (`IS_MOCK` only with `NEXT_PUBLIC_API_MOCK=true`); mock-exam lifecycle (`/mocks/configure -> submit-answer -> submit -> results`); logout token revocation; profile `/auth/me` envelope;
user merge semantics; Settings, "Your stats" and adaptive stats from `/dashboard/*`; billing (`/billing/subscription`, plan only from the backend entitlement, paywall no longer grants Pro); unavailable states for Clubs, Feed, Duel, Planner and Linked devices; exam vs learning-path separation.

## Test and build results (latest run)
- `tsc --noEmit`: clean. ESLint: 0 errors, 4 pre-existing `<img>` warnings. `git diff --check`: clean.
- Vitest: **543 pass, 12 fail**. The 12 are the onboarding carousel, `ReviewCarousel` and `StallTimer` tests that were failing before this work.
- Production build: passes (it failed intermittently earlier on `next/font`; it passed on the latest runs).
- Playwright: accessibility scans pass on the pages checked earlier; the responsive audit fails on a sidebar-margin expectation on nearly every page (pre-existing, not specific to these changes). Not rerun for this pass.
- Android APK: built earlier (debug). **Not rebuilt for this pass and not tested on a device.**

## Remaining issues
- Onboarding **save is unverified against staging**: no profile write was run beyond the earlier read-only probes. Backend semantics are listed in `BACKEND_PENDING_REQUIREMENTS.md` (A1).
- Practice records attempts, but server mastery will not change until the backend or a client BKT engine handles it (B1).
- Mock exams: no input for typed answers and no passage rendering (C1, C2). Not run live (creating attempts is a write).
- Duel (Socket.IO), Planner, Linked devices, Notifications, Clubs/Feed, Ads, Tournaments, Hubs, Family and Chat are not connected.
- `/play/sprint` still requests sessions with `GET ?topic=<skill>` (the Practice fix has not been applied to Sprint).
- Profile edit page still saves locally only; it could call `PATCH /auth/me` for the name once A1 is settled.
