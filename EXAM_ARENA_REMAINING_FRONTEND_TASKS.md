# Remaining frontend tasks

Generated: 2026-11-04T16:54:04.567Z

Frontend work still required after the integration pass. Several depend on the backend items (BE-x) listed in EXAM_ARENA_REMAINING_BACKEND_REQUIREMENTS.md.

| ID | Priority | Task | Detail | Acceptance |
|---|---|---|---|---|
| FE-1 | P0 | Verify onboarding persistence end to end | Run save -> logout -> login on a disposable staging account; confirm every field round-trips; adjust vocabulary mapping per BE-1. | - |
| FE-2 | P1 | Fix Sprint session request | Replace GET /practice/session?topic=<skill> with the POST slot contract used by Practice (returns 0 items for most skills today). | - |
| FE-3 | P1 | Durable offline queues | Persist practice/sprint/mock/profile writes in Dexie; do not delete queued items after max retries; show sync status. | - |
| FE-4 | P1 | Secure token storage on native | Move access/refresh tokens out of localStorage on Android; review allowBackup=true. | - |
| FE-5 | P1 | Mock exam completeness | Typed-answer input, passage/stimulus rendering, sectional mode, server score breakdown on results. | - |
| FE-6 | P1 | Client BKT or mastery plan | Practice never updates mastery; ship the psychometrics package or depend on BE-2. | - |
| FE-7 | P1 | Checkout flow | Wire GET /billing/plans, POST /billing/checkout and verify once BE-3 is done. | - |
| FE-8 | P2 | History filters from real data | Remove getTopicFilters (fixture) from the history page in real mode; use blueprint sections. | - |
| FE-9 | P2 | Read /api/config feature flags | Gate UI by flags and show a clear 'not enabled' state instead of generic errors. | - |
| FE-10 | P2 | Profile edit to PATCH | Send name changes through PATCH /auth/me; keep edits from being local-only. | - |
| FE-11 | P2 | Friends actions | Add friend by email/QR and remove-friend using the existing social routes. | - |
| FE-12 | P2 | Socket.IO client for duels | Add socket.io-client; implement after BE-5; remove nonexistent /duel REST calls. | - |
| FE-13 | P2 | Replace fabricated testimonials | src/lib/mock/reviews.ts content is shown to real users. | - |
| FE-14 | P2 | Move non-mock constants out of lib/mock | SPRINT_CONFIG, MOBILE_NAV, help content are imported from lib/mock in real mode. | - |
| FE-15 | P2 | Repair stale tests | Update responsive spec sidebar expectation (84 vs 250); fix 12 failing component tests. | - |
| FE-16 | P3 | Remove dead exports | 17 service functions are never referenced (e.g. recordAdaptiveSession, getReportSummary, duel result submit). | - |
| FE-17 | P3 | Hardcoded app info | Help page shows version 1.0.0 / build 2026.06.20 literals. | - |
| FE-18 | P1 | Android runtime verification | Install the debug APK on a device/emulator and run the manual plan in the report (login, restore, offline, onboarding, practice). | - |
