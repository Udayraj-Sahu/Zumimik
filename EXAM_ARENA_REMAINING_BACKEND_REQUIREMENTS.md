# Remaining backend requirements

Generated: 2026-11-04T16:54:04.567Z

Work the backend team must still do. Items describing new contracts are proposals, not existing APIs. Evidence is in EXAM_ARENA_POST_INTEGRATION_AUDIT.md.

| ID | Priority | Task | Detail | Acceptance |
|---|---|---|---|---|
| BE-1 | P0 | Specify and harden PATCH /api/v1/auth/me | Document null/empty-value semantics; strict validation (no 'yes' -> true, forbid unknown fields); validate/define persona, goal, target_exam vocabularies vs DB CHECKs; typed response model; stop storing onboarding data in users.behavioral_profile; confirm precedence of name vs display_name. | Save then GET /auth/me on another device returns the saved values; partial PATCH leaves others intact; invalid enum returns 422. |
| BE-2 | P1 | Server-side mastery from attempts | GET /practice/mastery only changes from client technique_states snapshots. Either compute mastery from problem_attempt events or publish the BKT package. | After POST /sync with attempts, /practice/mastery shows updated pLearned. |
| BE-3 | P1 | Payment provider configuration | /billing/plans reports providers_available: []; checkout cannot succeed. | providers_available lists a provider and POST /billing/checkout returns a usable intent. |
| BE-4 | P1 | Stimulus/passage for set-based mock questions | POST /mocks/configure returns set_key/set_position/set_size but no passage text; also document typed-answer format. | Questions in a set include shared stimulus; submit-answer format documented. |
| BE-5 | P1 | Document the Socket.IO client protocol | Namespaces, event names, payloads and lifecycle for web/Android clients; confirm production routing of /socket.io. | A client can complete a match using only the published document. |
| BE-6 | P2 | Planner API | No planner routes exist (frontend expects days/tasks/stats). | CRUD for tasks and stats available per user. |
| BE-7 | P2 | Linked-device list and revoke | Only QR login exists. | GET devices and DELETE device revokes that device's refresh tokens. |
| BE-8 | P2 | Exam tag for topics and skills | No endpoint filters by exam; 65/100 skills have no topic. | Topic/technique/catalog endpoints accept an exam filter. |
| BE-9 | P2 | Google and phone authentication | POST /auth/google and /auth/phone return 501. | Provider configured; both return tokens for valid ID tokens. |
| BE-10 | P2 | Clubs/hub fields and feed | Hub responses lack moderator, cover, description, tags, last activity; no feed endpoint. | Fields present or UI mapping agreed. |
| BE-11 | P3 | Notification feed and push registration | Only /dashboard/events exists. | Feed, read-state and push token endpoints. |
| BE-12 | P3 | Enable flags for testing | referral_ladder, virtual_hubs, ad_engine, tournament, location_gamification are off on staging. | Flags on in staging so integrations can be verified. |
| BE-13 | P3 | Sync repository copy with staging | Downloads/Speed-Gym-main lacks PATCH /auth/me present on staging. | Repo contains the deployed code. |

## Added after the pricing check

| ID | Priority | Task | Detail | Acceptance |
|---|---|---|---|---|
| BE-14 | P1 | Decide annual billing | `GET /billing/plans` has monthly prices only (no annual amount or cycle), while the product UI was designed around annual (about 10x monthly). Either add annual pricing and a billing-cycle field to `POST /billing/checkout`, or confirm monthly-only. The frontend now shows monthly only. | Plans response states the supported cycles. |
| BE-15 | P2 | Plan marketing facts | Feature lists (for example "1:1 mentor check-ins", "Priority drill matching") and plan names are bundled copy with no backend source. | A plan response that includes what each tier grants, or confirmation the copy is marketing-only. |
