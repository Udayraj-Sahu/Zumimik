# Exam Arena: backend / frontend integration audit

- Date: 2026-11-06
- Backend inspected: `C:\Users\udayr\Downloads\Speed-Gym-main\Speed-Gym-main` (no git history in the download; source read directly)
- Frontend inspected: `D:\Exam-Arena-Frontend`, branch `feature/backend-integration`, HEAD `e178167`, plus uncommitted work from this session (listed in section 12)
- Live system: `https://examarena-staging.duckdns.org` (REST + Socket.IO), exercised with throwaway accounts only

## How to read this report

- **Evidence rule.** A status is `VERIFIED WORKING` only when I observed it against staging (or ran the test) in this session. Everything else says what I did and did not check.
- **What I read in full:** the whole game server's duel path (`duel-room.ts`, `duel.ts` rules and anti-cheat, `matchmaking.ts`, `queue.ts`, `index.ts`, `events.ts`), the social friends routes and migrations, `internal.py` `user_context`, the token/limiter/flag modules' headers, and the route inventory of every router.
- **What I did NOT read line by line** (listed so nobody assumes otherwise): `billing.py`, `ads/`, `chat/`, `admin.py`, `mocks/`, `hubs/`, `tournaments/`, `family.py` bodies, `referral/`, the Neo4j loaders, `factory/`, `data/`, and the SQL migrations beyond `100_gaming.sql` and `130_social.sql`. Their status below comes from route inventory, live GET calls, and the existing docs, and is labelled that way.
- **Not run:** the Python API tests (no Python on this machine, 60 test files). The game-server tests were run in a scratch copy (section 3).

---

## 1. Executive summary

**Overall:** the app is integrated with the real backend for its core loop (auth, practice, sync, mastery, explorer, friends, quick-match duels). The main gap is not a bug but a missing capability: **the backend has no way to invite a friend to a duel.** The duel service only pairs strangers from a queue, so the Friends-page Duel button cannot be made to work without backend work.

**The Duel button is therefore NOT enabled.** It was an active-looking button with no click handler (it did nothing). It is now disabled with an explanation and a link to quick match. The rule you set is that it is enabled only when the flow works from invitation to results, and the invitation step does not exist.

What was confirmed on staging this session:

| Area | Result |
|---|---|
| Friend lifecycle (request, duplicate, reverse, self, unknown, accept, list on both sides) | Works |
| Quick-match duel, lobby to results, two accounts | Works, including rating changes, turn timeout, forfeit, and the server's refusal codes |
| Friend-targeted duel invitation | **Does not exist** (no REST route, no socket event, nothing in source or docs) |
| Practice session, sync, mastery, θ round trip | Works, with the caveats in section 6 |
| REST CORS, security headers, login rate limit | Correct |

Bugs found in the **frontend** duel client (all fixed, tested, and re-verified on staging):

1. **No heartbeat.** The server treats 10 s of silence as a dropped connection and forfeits after another 15 s. A player thinking about a question sends nothing else, so they would have been forfeited mid-match. Fixed: heartbeat every 4 s.
2. **Refusals read as answers.** The server refuses with `{code: "NOT_YOUR_TURN"}` etc. in the ack; the client read those as "wrong answer", and `{code: "NOT_A_PLAYER"}` as "joined". Fixed.
3. **`client_timestamp_ms` risk.** Sending the phone's clock would make every answer fail as "too fast" on a phone whose clock is behind the server's. Deliberately not sent.

Major backend findings:

- No friend-duel invitations (blocker for the requested feature).
- θ persistence stores whatever the last `session_end` sent: no validation, no merge across devices, other subjects dropped.
- A mastery snapshot with a future `lastPracticedAt` wins every conflict.
- `/practice/session` backfill is off by default for multi-slot requests (8 of 10 questions returned), and on for single-skill requests (filled with unrelated Arithmetic basics).
- A player who reconnects mid-round sees nothing until the next round (the backend docs list this as known-open).
- Duel state is in process memory: a restart ends every match and empties the queue.
- Google and phone sign-in answer HTTP 501 although the frontend calls them.
- The friend-request endpoint reveals whether an email has an account.

**Frontend suite:** `tsc` clean; **976 of 988 tests pass** (108 files, 3 with failures). The 12 failures are all in onboarding intro components (`intro-carousel`, `stall-timer`, `review-carousel`) that this work did not touch: a button name and a marquee duration have drifted from what the tests expect.

---

## 2. Backend architecture

### Shape

| Part | Technology | Location | Size / notes |
|---|---|---|---|
| API | FastAPI (Python), uvicorn | `services/api/app` | 71 files, ~17k lines, 25 routers, **135 routes registered on staging** |
| Game server | Node, Socket.IO 4, TypeScript (`tsx`) | `apps/game-server/src` | Namespaces `/lobby`, `/game`, `/spectate`; modes: accuracy duel, boss battle, relay race |
| Ledger DB | PostgreSQL + pgvector | `db/postgres` | 37 migration files |
| Graph DB | Neo4j (`:Skill` live label) | `db/neo4j` | constraints, loaders, reference queries |
| Cache / limits | Redis | via `db.get_redis()` | flags snapshot (5 s TTL), login limiter |
| Edge | Caddy | `deploy/caddy` | TLS, routes `/socket.io` to the game server |
| Content factory | Python batch jobs | `factory/`, `data/` | offline; "zero runtime consumers" per project notes |
| Shared packages | TypeScript | `packages/psychometrics`, `shared-types`, `vedic-math` | BKT/IRT engine used client side |

### How a duel reaches the database

The game server never writes Postgres. It authenticates with the shared JWT secret (no call to the API), reads each player's context from `POST /internal/user/context`, fetches questions from `POST /internal/game/problem-batch`, and writes the result through `POST /internal/match/complete` (protected by an internal key and a loopback check). All duel state (queue, matches, expected answers, timers) lives **in process memory**.

### Registered route count by router (staging OpenAPI)

`social` 19, `admin` 17, `hub` 16, `auth` 12, `dashboard` 8, `family` 8, `billing` 7, `tournament` 7, `internal` 5, `mocks` 6, `referral` 4, `ads` 3, `beta` 3, and one to two each for `sync`, `session`, `practice`, `prescription`, `chat`, `content`, `reference`, `feed`, `health`, `webhooks`.

### Feature flags on staging (read from `GET /api/config`)

On at 100%: `social_friends`, `social_ghosts`, `social_leaderboards`, `social_taunts`, `daily_challenge`, `mock_exams`, `billing_checkout`, `chatbot`, `referral_ladder`, `virtual_hubs`.
Off: `boss_battle`, `relay_race`, `tournament`, `social_clips`, `ad_engine`, `closed_beta`, `chatbot_llm`, `glicko2_live`, `irt_3pl_live`, `hirt`, `dina_live`, `thompson_mab`, `churn_gbt`, `location_gamification`.

---

## 3. Backend feature audit

Format per feature: files, what exists, database, routes, gaps, tests. "Verified" means observed on staging.

### A. Authentication and users

- **Files:** `routers/auth.py`, `security.py`, `login_limit.py`, `routers/family.py`.
- **Routes:** register (201), login, refresh, logout, `GET/PATCH/DELETE /auth/me`, `scanner-login/generate|verify|poll`, `google` and `phone` (**both return 501**).
- **Tokens:** HS256 access token, 15 min (`access_token_ttl_seconds = 900`), claims `sub, tier, iat, exp, jti`; opaque rotating refresh tokens stored as SHA-256 (30 days). The frontend's refresh logic shares one refresh across parallel 401s because the backend revokes the family on reuse.
- **Verified live:** register returns the user with `dob` and `age` fields; `PATCH /auth/me` with the app's `{day, month, year}` computes `age: 21` for 10 March 2005 (correct on 2026-11-06); the login limiter returns 429 after 5 failed attempts for one account.
- **Not verified:** refresh rotation, logout revocation, account deletion, scanner login end to end, child/parent sub-accounts.
- **Gaps:** `PATCH /auth/me` accepts impossible or future dates with HTTP 200 and stores a derived age: 29 Feb 2001 gave 25, year 2030 gave 8, an unknown month name gave 26. Age drives the child-safety policy, so it should be validated.
- **Tests:** `test_auth.py`, `test_login_limit.py`, `test_age_targets.py`, `test_hardening.py` (not run).

### B. Database

- **Postgres:** 37 files from `00_extensions.sql` to `270_engine_tranche.sql`. Read in detail: `100_gaming.sql` (`game_matches`, `player_match_results`, `player_elo_ratings` keyed `(user_id, mode)`) and `130_social.sql` (`friendships`: one row per pair via a `LEAST/GREATEST` unique index, `status in (pending, accepted, blocked)`, `source in (request, qr)`, `CHECK (requester <> addressee)`).
- **Neo4j:** `:Skill` nodes with `name, topic, sub_topic, is_root`; no `subject` property anywhere (needed for θ per subject, see section 6).
- **Not read:** the other 35 migrations and the loaders. Indexes, foreign-key coverage, retention and deletion cascades are therefore not audited here.

### C. Learning and practice

- **Routes:** `GET /practice/catalog`, `POST|GET /practice/session`, `GET /practice/mastery`, `POST /sync`, `GET /api/practice/techniques`, `GET /api/topics`, `GET /api/topics/{topic}/subtopics`, `GET /api/subtopics/reference`.
- **Verified live (details in section 6):** session composition and backfill behaviour, mastery merge across devices, large snapshot (≈590 KB) accepted and returned intact, θ round trip, sync idempotency (resend gives `duplicates`), explorer sub-topic skills.
- **Gaps:** see the θ, future-date, backfill and sparse-mapping findings in section 6.

### D. Dashboard and analytics

- **Routes:** `topics, radar, metrics, stats, streak, events, leaderboard, recent-activity`.
- **Verified live (new account):** all return 200 with the keys the frontend adapters read (`stats {accuracy,questions,percentile,speed}`, `streak {current,xp,days,labels}`, `leaderboard [{rank,name,xp}]`, and so on).
- **Not verified:** shapes with real data (a new account returns empty arrays for topics and recent activity).

### E. Social and competitive

| Feature | Backend | Evidence |
|---|---|---|
| Friend request by email | `POST /social/friends/request` | Verified: pending created |
| Duplicate / reverse request | 409 `a request or friendship already exists` | Verified |
| Request to self / unknown email | 404 `no such learner` (same text for both) | Verified |
| Respond (accept / decline / block) | `POST /social/friends/respond` | Accept verified; only the addressee can accept (requester gets 404) |
| Accept twice | 404 `no pending request with that id` | Verified (not idempotent) |
| Friend list | `GET /social/friends` returns `friends, incoming, outgoing` on both sides | Verified |
| Remove, QR generate / redeem | routes exist | Not exercised |
| Friend activity / level / xp / streak | **not provided** | `friends[]` carries only `friendship_id, user_id, name, source, since` |
| Daily challenge, ghosts, achievements | routes live, flags on | GET verified; submit and race not exercised |
| Taunts | `GET /social/taunts/{match_id}` | Returns `{taunt: null}` for an unknown match |
| Tournaments, boss battle, relay race, clips | routes exist, flags **off** | Not usable |
| **Friend-targeted duel invitation** | **none** | Section 7 |
| Duel history / duel leaderboard API | **none** (results are written to `player_match_results`; nothing reads them for a user) | Source search |

Parent-managed friends: for a child account, the lobby only pairs with `approved_friend_ids` (friendships the parent consented to). This is the only place friendship affects a duel.

### F. Infrastructure

- **CORS (REST):** preflight from `http://localhost:3000` is allowed with credentials; an unlisted origin gets 400. Correct.
- **Security headers:** HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, CSP `default-src 'none'`, `Permissions-Policy`.
- **Rate limiting:** login limiter works (5 failures then 429); a general limiter of 300/min per learner or IP is configured. Not tested: lobby/socket join limits.
- **Socket.IO CORS:** `cors: { origin: false }` plus an `allowRequest` origin check. Result: **WebSocket works cross-origin, HTTP long-polling does not** (no `Access-Control-Allow-Origin`). Browsers where WebSockets are blocked (this happened with an ad blocker) have no fallback.
- **Secrets:** code defaults exist (`jwt_secret = "dev-only-change-me"` and others) guarded by `REQUIRE_PROD_SECRETS` / `prod-secrets.ts`. I did not read staging's environment, so whether staging uses real secrets is **unverified**.

### Game server tests

Run in a scratch copy with `npm install`, Vitest: **206 of 207 pass.** The one failure (`origin.test.ts` reads `services/api/app/config.py` by relative path) fails only because my scratch copy lacks that file. Coverage includes duel rules, duel room wiring, seeding, matchmaking, bots, anti-cheat, lobby integration, origin checks. There is **no test for a friend invitation** because no such feature exists.

---

## 4. Frontend architecture

- **Stack:** Next.js 14 (`output: "export"`, static), React, TanStack Query, Zustand (persisted stores), Tailwind, Dexie (IndexedDB offline queue), Capacitor for Android/iOS. 532 source files, 116 test files.
- **API client:** `src/services/api.ts` (`apiGet/Post/Put/Patch/Delete`), bearer token from the auth store, single shared refresh on 401, base URL from `NEXT_PUBLIC_API_URL`; `apiUrl()` prefixes `/api/v1` unless the path starts with `/api/`.
- **Mock mode:** `IS_MOCK = NEXT_PUBLIC_API_MOCK === "true"`. Real backend is the default; fixtures are an explicit opt-in. In real mode a feature with no backend shows `FeatureUnavailable` instead of fixtures (Linked devices, Class calendar).
- **Pages (36):** dashboard (analytics, clubs, family, feed, friends), learn (explorer, mastery, practice, technique/[id], warm-up, mock/run), play (sprint, daily, duel, ghosts, configure-sprint, results), settings (profile, history, leaderboard, achievements, notifications, reports, help, planner, linked-devices, scan-to-login), auth, onboarding.
- **Offline:** durable event queue with batch ids fixed at creation (resend is idempotent), parked events for server rejections, sync indicator, device id, snapshot memory.
- **Duel code:** `services/duel-live.ts` (socket client), `hooks/use-live-duel.ts` (state machine), `components/duel/live-duel.tsx` (screen). `services/duel.ts` and the mock duel page remain for demo mode only.

---

## 5. API contract comparison

Method: scanned every `apiGet/Post/Put/Patch/Delete/authFetch/apiUrl` call in `src` (excluding tests, mocks, vendor): **105 call sites, 83 distinct endpoints**; matched against the live OpenAPI (135 operations); then called every parameterless GET with a real token.

### Result

| Class | Count | Notes |
|---|---|---|
| Registered on staging | 73 | includes paths built from variables |
| `/sync/content/feedback` | 1 | matches the catch-all `/sync/{key}`: returns 401 without a token, so it exists |
| `/auth/google`, `/auth/phone` | 2 | **registered but HTTP 501** (not implemented) |
| Dead in real mode (404) | 7 | `/duel/topics`, `/duel/opponents`, `/duel/result`, `/planner/days`, `/planner/stats`, `/pairing/sessions`, `/pairing/session/{id}/revoke`. Their pages are mock-only or show "unavailable", so users never hit them. |

### Live GET results (new account, 39 endpoints)

All returned 200 with the keys the frontend reads, except: `/api/v1/ads/decision` 404 (ad engine flag off); `/auth/scanner-login/poll` 422 (needs its query parameter, my call omitted it); the 7 dead endpoints above (404).

### Specific checks

| Check | Result |
|---|---|
| `/api` vs `/api/v1` prefix handling | Correct: content routes live at `/api/…`, versioned ones at `/api/v1/…`; the client's `apiUrl` rule matches. |
| Trailing slashes | No mismatches found. |
| Field naming | Backend `snake_case`; frontend adapters map. One mixed area: onboarding stores camelCase (`targetExam`) in the user object. Works. |
| UUIDs / timestamps | Event ids are UUID strings (≤64 chars), `client_timestamp` integer ms, `as_of` ISO. Consistent. |
| Token refresh | Implemented once and shared; covered by `api-refresh.test.ts`. Backend rotation not exercised. |
| CORS | REST fine for `localhost:3000`; Socket.IO polling blocked cross-origin. |
| Error format | Backend uses `{detail: string | [validation]}`; the client reads it. |
| Idempotency | `/sync` resend returns `duplicates`; verified. |

### Backend routes the frontend never calls (62 of 135, abridged)

Billing `checkout, verify, cancel, change, resume` (billing flag on, so **frontend missing**); tournaments (flag off); hub create/join/leave/search (the Clubs screen uses `/clubs`); taunts; clips (flag off); beta redeem; location check-in; `/feedback`; admin and internal routes (correctly not called). The matcher cannot see paths assembled from variables, so a few "unused" entries may be used.

---

## 6. Feature status matrix

| Feature | Status | Evidence / gap |
|---|---|---|
| Register, login, `/me`, rate limit | VERIFIED WORKING | live calls |
| Age from date of birth | VERIFIED WORKING (valid dates) / PARTIALLY IMPLEMENTED (no validation) | invalid dates accepted |
| Refresh, logout, account delete, scanner login | IMPLEMENTED BUT NOT VERIFIED | not exercised |
| Google / phone sign-in | BACKEND MISSING | HTTP 501, frontend calls it |
| Friend request / accept / list / negatives | VERIFIED WORKING | two accounts |
| Friend remove, QR friend code | IMPLEMENTED BUT NOT VERIFIED | not exercised |
| Friend level / XP / streak / activity | BACKEND MISSING | not in `/social/friends`; UI shows nothing |
| **Quick-match duel (lobby to results)** | **VERIFIED WORKING** | two accounts: queue, match, rounds, refusals, timeout, forfeit, rating |
| Duel reconnect mid-round | PARTIALLY IMPLEMENTED | rejoin works but the round is not replayed (known-open in backend docs) |
| Duel bots | PARTIALLY IMPLEMENTED | code exists; matchmaking never backfills (a lone player waited 80 s and nobody joined) |
| **Friend-targeted duel invitation** | **BACKEND MISSING** | section 7 |
| Duel history, duel leaderboard | BACKEND MISSING | no read API |
| Practice session (single skill) | VERIFIED WORKING | 10 of 10 served |
| Practice session (multi-slot) | PARTIALLY IMPLEMENTED | 8 of 10 with default backfill; 10 only with `backfill: true` |
| Sync, idempotent resend | VERIFIED WORKING | `duplicates` on resend |
| Mastery merge across devices | VERIFIED WORKING | per-technique latest practice wins |
| Mastery future-date guard | PARTIALLY IMPLEMENTED | a future `lastPracticedAt` wins |
| θ (ability) persistence | PARTIALLY IMPLEMENTED | stores/returns, but no validation, last write wins, other subject dropped |
| Subject (quant/DI) on skills and items | BACKEND MISSING | no `subject` anywhere |
| Explorer sub-topic to skills | PARTIALLY IMPLEMENTED | live, but 5/25 CAT, 0 Vedic sub-topics mapped |
| Reference (study card) pages | PARTIALLY IMPLEMENTED | 44 cards, 2 complete |
| Dashboard (stats, streak, events, radar, metrics, leaderboard) | IMPLEMENTED BUT NOT VERIFIED | 200 with expected keys; not checked with real data |
| Daily challenge, ghosts | IMPLEMENTED BUT NOT VERIFIED | GET 200; submit/race not run |
| Clubs (hubs) browse | VERIFIED WORKING (GET) / join, leave NOT VERIFIED | |
| Billing: plans, subscription | VERIFIED WORKING (GET) | |
| Billing: checkout, cancel, change | FRONTEND MISSING | flag on, never called |
| Referral | IMPLEMENTED BUT NOT VERIFIED | GET 200 |
| Chat / hints | IMPLEMENTED BUT NOT VERIFIED | policy GET 200; LLM flag off |
| Mock exams | IMPLEMENTED BUT NOT VERIFIED | blueprints/history 200; a full run not exercised |
| Family / child accounts | IMPLEMENTED BUT NOT VERIFIED | `/family` 200 |
| Taunts | FRONTEND MISSING | flag on, never called |
| Tournaments, boss battle, relay race, clips | BLOCKED | flags off; no frontend |
| Class calendar (planner), linked devices | BACKEND MISSING | 404; pages show "unavailable" |
| Ads | BLOCKED | `ad_engine` flag off (404) |

---

## 7. Duel feature audit

### What exists

Quick match, entirely through the lobby queue:

1. Client connects to `/lobby` with the JWT (`auth.token`) and emits `join_lobby {mode: "accuracy_duel"}`.
2. Server reads the account context (`/internal/user/context`), checks a child's daily cap, and either pairs with a queued player (skill band widens with waiting time) or queues. Ack: `{status: "waiting", estimated_wait_seconds}`, `{status: "matched"}`, `{status: "refused"}`, `{status: "in_match", match_id}`, or `{status: "unavailable"}` for any other mode.
3. Both players receive `match_found` on their personal room: `{match_id, mode, topology, opponents: [{user_id, theta_u, opponent_kind}]}`. Opponents list **both** players and carries **no names**; `theta_u` is a constant 0 by design (privacy).
4. A 5 s countdown, then `round_started` to the room: `{match_id, round_number, active_user_id, problem: {problem_id, problem_text, difficulty, time_limit_ms}}`. The turn limit is 30 s × 1.5 = 45 s, scaled by the active player's age.
5. Only the active player may answer (`submit_game_answer`). Correct hands the turn over; **wrong answer or turn timeout ends the match** (sudden death). Position points are 2 for the winner and 1 for the loser, plus +2 per correct and −1 per wrong answer.
6. `round_ended {problem_id, user_id, correct, points_earned (+2/-1), correct_answer}` goes to the room; `match_ended {rankings, elimination_reason, rated, elo_updates}` follows after the result is persisted (`wrong_answer`, `timeout`, `forfeit`).

### Verified on staging (this session)

| Behaviour | Result |
|---|---|
| Lobby auth: bad token | `AUTH_EXPIRED` |
| Two accounts matched, `match_found`, `game:join` ack | OK |
| Turn order and `round_started` payload | OK; field is `problem_text` |
| Wrong answer ends the match | OK (`wrong_answer`, rating 1000 to 837 / 1162, ±163) |
| Idle active player | OK: after 45 s `match_ended` with `timeout`, rated |
| Refusal codes | `NOT_YOUR_TURN`, `STALE_PROBLEM`, `MISSING_KEYSTROKES` returned as `{code}` acks, round stays open |
| No heartbeat | After ~10 s the server announces `game:player_disconnected {grace_period_seconds: 15}` to the opponent, then forfeits (`forfeit`) |
| With heartbeat every 4 s | No false disconnect; match ran to its natural timeout |
| Cancel | Closing the lobby socket removes the player from the queue (a later joiner was not matched with the leaver) |
| Other modes | `speed_duel`, `survival`, `duel`, empty, unknown: `{status: "unavailable"}` |
| Lone player | No bot after 80 s (matchmaking tick never bot-fills; privacy notice says bots are "not used today") |
| Rejoin mid-round | `game:join` acks `joined` but the round is **not** re-sent |

### Not verified

A match with correct answers across several rounds (needs a human to solve questions in real time); the elo and streak rows in Postgres (no database access); a child account's flow; behaviour with the server under restart.

### Missing for "Duel a friend" (the requested feature)

Searched the whole backend (API, game server, SQL, docs) for invite, challenge, private match, or friend duel: **nothing.** Eight plausible REST paths return 404. The `topology` field is accepted in `join_lobby` but ignored. Friendship affects a duel only to restrict a child to approved friends.

Required work, in order:

1. **Store invitations** (backend). Proposed table:

```sql
CREATE TABLE duel_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challengee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(30) NOT NULL DEFAULT 'accuracy_duel',
  status VARCHAR(12) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','cancelled','expired','started')),
  match_id VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,            -- created_at + 10 minutes
  responded_at TIMESTAMPTZ,
  CHECK (challenger_id <> challengee_id)
);
CREATE UNIQUE INDEX one_open_invite_per_pair ON duel_invites
  (LEAST(challenger_id, challengee_id), GREATEST(challenger_id, challengee_id)) WHERE status IN ('pending','accepted');
```

2. **REST endpoints** (new `routers/duels.py`, behind a new flag `social_duel_invites`):

| Route | Body | Success | Errors |
|---|---|---|---|
| `POST /api/v1/social/duels/invites` | `{friend_user_id}` | 201 `{invite_id, status:"pending", expires_at}` | 404 not an accepted friend; 409 an open invite exists in either direction, or either player is in a match; 403 child without parent approval (reuse `approved_friend_ids`); 429 |
| `GET /api/v1/social/duels/invites` | | `{incoming:[{invite_id, from:{user_id,name}, expires_at}], outgoing:[{invite_id, to:{user_id,name}, status, expires_at}]}` | |
| `POST /api/v1/social/duels/invites/{id}/respond` | `{action:"accept"\|"decline"}` | `{invite_id, status}` | 404 unknown or not yours; 410 expired; 409 already answered |
| `POST /api/v1/social/duels/invites/{id}/cancel` | | `{invite_id, status:"cancelled"}` | challenger only |

3. **Start the match** (game server + one internal route). Either player's client, after accept, emits `join_lobby {mode:"accuracy_duel", invite_id}`. The lobby validates through a new `POST /internal/duel/invite/claim {invite_id, user_id}` (checks status `accepted`, membership, expiry, friendship, child rules and daily cap), holds the first arrival in a private waiting slot (up to 30 s, ack `{status:"waiting_for_friend"}`), and when both are present calls `startMatch` directly, skipping the queue. The claim records `match_id` and sets `started`. `match_found` and everything after are unchanged.
4. **Decide product questions:** is a friendly duel rated? (Default proposal: unrated, `rated:false`, no rating change.) Invitation expiry (10 minutes proposed). Push notification versus polling every 5 s.
5. **Backend tests required:** create / accept / decline / cancel / expire; non-friend refused; duplicate and reverse-duplicate refused; child without consent refused; both-present start; one-sided wait times out; replay of an accepted invite cannot start a second match; two simultaneous accepts start exactly one match.

### What the frontend will do once those exist

- `FE-DUEL-1` Duel button calls `POST …/invites`, shows "Waiting for <name>" with Cancel, prevents duplicates (disabled while pending), handles 404/409/403/410.
- `FE-DUEL-2` Poll `GET …/invites` every 5 s on the Friends page and dashboard; show incoming invites with Accept / Decline.
- `FE-DUEL-3` On accept (both sides), navigate to `/play/duel?invite=<id>` and have `LiveDuel` send `join_lobby {mode, invite_id}`.
- Tests for each, plus a two-account staging run of the full flow before the button is enabled.

---

## 8. Backend team task list

| ID | Priority | Task | Files | Change | Database | Contract / acceptance |
|---|---|---|---|---|---|---|
| B1 | P1 | Friend duel invitations | new `routers/duels.py`, `routers/internal.py`, `apps/game-server/src/duel-room.ts`, `flags` seed | section 7 | `duel_invites` (new migration `280_*`) | Routes and claim flow in section 7. Accept: two-account staging run from invite to `match_ended`; every test in section 7 passes. |
| B2 | P1 | Replay the current round on `game:join` | `duel-room.ts` (`game:join` handler), `duel.ts` | After `joined`, emit the active `round_started` (and remaining time) to the rejoining socket | none | Rejoin mid-round: the player receives `round_started` with `time_limit_ms` reduced to the time left. Listed as known-open in `docs/backend/GAME_MODES.md`. |
| B3 | P1 | Validate and merge θ | `routers/sync.py`, `mastery_read.py`, `tests/test_sync_engine.py` | Enforce the T1 rules: theta in [-3,3], `n` equals response count, at most 200, `correct` boolean, `a` in 0.5..2.5, subject in {quant, di}; union responses across events (first occurrence wins); keep other subjects when one is sent; never let an older replay overwrite | none (JSONB) | Invalid payloads skipped while the event is still stored; the 10 θ checks in `BACKEND_TEAM_HANDOFF.md` pass. Staging today stores `theta: 5` and `n: 201` as sent. |
| B4 | P1 | Sub-topic to skill mapping coverage and `reference_ids` per skill | content loaders, `routers/content.py` | Map every served skill to a sub-topic per exam; list the unmapped; primary reference per sub-topic | mapping tables | CAT 5/25, GMAT 3/23, GRE 3/18, Banking 1/25, Vedic 0/17 sub-topics have skills today; target 100% or an explicit `unmapped_skills` list. |
| B5 | P2 | Ignore the client timestamp for solve time | `duel-room.ts`, `duel.ts` | Compute solve time from server receipt; drop `client_timestamp_ms` | none | The 200 ms rule can no longer be bypassed by a later timestamp (documented open issue). Latency is charged to the player: a fairness decision to confirm. |
| B6 | P2 | Allow polling fallback for allowed origins | `apps/game-server/src/index.ts` | `cors: { origin: ALLOWED_ORIGINS }` (the same list the origin check uses) | none | A browser that blocks WebSockets can still connect over long-polling; `origin.test.ts` extended. |
| B7 | P2 | Future-date guard on mastery | `mastery_read.py`, `routers/sync.py` | Clamp or ignore `lastPracticedAt` and `client_timestamp` beyond server time + skew | none | A snapshot with `lastPracticedAt` 3 days ahead no longer wins (today it does). |
| B8 | P2 | Make backfill predictable | `routers/session.py` | Default `backfill` on for every request shape, or document that it is off; mark backfilled items (`requested_skill`) so a client can tell filler from the topic asked for | none | 6+2+2 request returns 10 or says why not. Today single-skill requests silently return unrelated Arithmetic basics. |
| B9 | P2 | Validate date of birth | `routers/auth.py` | Reject impossible dates (29 Feb 2001), future dates, unknown months with 422 | none | Today all return 200 with a derived age. |
| B10 | P2 | Friend-request email oracle | `routers/social.py` | Answer identically whether or not the email exists (as the login limiter's author did for register), or count lookups in the same limiter | none | 404 vs 200/409 no longer reveals which emails have accounts. |
| B11 | P2 | Persist duel state | `duel-room.ts` | Move queue/match state to Redis (the code comment already plans it) | Redis | A game-server restart no longer ends every match and empties the queue. |
| B12 | P3 | Duel history and leaderboard read API | `routers/social.py` or `dashboard.py` | `GET /social/duels/history`, `GET /social/duels/leaderboard` from `player_match_results` | none | Frontend can show past results. |
| B13 | P3 | Friend profile fields | `routers/social.py` | Add `level, xp, streak, last_active` to `friends[]` | none | Friends cards show real values. |
| B14 | P3 | Decide Google / phone sign-in | `routers/auth.py` | Implement, or remove from the contract (501 today) | maybe | Frontend sign-in options match the backend. |
| B15 | P3 | Subject classification (quant/DI) | Neo4j loaders, `session.py`, `prescription.py` | `subject` on skills and items | `:Skill.subject` backfill | In `BACKEND_TEAM_HANDOFF.md` as T2. |

---

## 9. Frontend team task list

| ID | Priority | Task | Files | Dependency | Tests / acceptance |
|---|---|---|---|---|---|
| F1 | DONE | Heartbeat every 4 s in a match | `services/duel-live.ts` | none | Test with fake timers; verified on staging (no false forfeit) |
| F2 | DONE | Handle `{code}` refusals (`NOT_A_PLAYER`, `NOT_YOUR_TURN`, `STALE_PROBLEM`, `MISSING_KEYSTROKES`, …) and `unavailable` queue | `services/duel-live.ts` | none | Tests; verified codes on staging |
| F3 | DONE | Do not send `client_timestamp_ms` (clock-skew risk) | `services/duel-live.ts` | none | Test asserts it is absent |
| F4 | DONE | Friends-page Duel button honest: disabled, explained, link to quick match | `app/(app)/dashboard/friends/page.tsx` | none | `friends-requests.test.tsx` |
| F5 | DONE | Duel UI against the real payloads (`problem_text`, opponents with no names, rankings, rating change, opponent-disconnected note) | `components/duel/live-duel.tsx`, `hooks/use-live-duel.ts` | none | 19 tests |
| F6 | P1 | Enable the friend Duel flow | friends page, new `services/duel-invites.ts`, hooks, `LiveDuel` (`invite_id`) | **B1** | Section 7 (FE-DUEL-1..3) plus a staging two-account run |
| F7 | P1 | Resume a duel after refresh | `hooks/use-live-duel.ts` | **B2** | Rejoin shows the current round |
| F8 | P2 | Remove or isolate dead real-mode calls | `services/duel.ts`, `planner.ts`, `linked-devices.ts` | none | They call 404 endpoints; only reachable in mock mode today |
| F9 | P2 | Billing checkout / cancel / change screens | `services/billing.ts`, paywall | product | Flag is on, endpoints live, no UI |
| F10 | P2 | Sign-in options: hide Google/phone until B14 | `stores/auth-store.ts`, auth screens | **B14** | No button that leads to HTTP 501 |
| F11 | P2 | Pass `backfill` / detect filler items once B8 lands | `services/practice.ts` | **B8** | Single-technique practice never shows unrelated questions silently |
| F12 | P3 | Fix the 12 failing onboarding tests | `components/onboarding/**` tests (button name "With zuzumik", marquee `24s` vs `28s`) | none | Full suite green |
| F13 | P3 | Tournaments, taunts, clips, duel history screens | new | B12, flags | After backend flags go on |
| F14 | P3 | Commit hygiene | repo | none | 24 uncommitted files, including a rebuilt APK binary and 18 deleted report files |

---

## 10. Security and performance findings

| # | Severity | Finding | Owner |
|---|---|---|---|
| S1 | Medium | **Mastery future-date win.** A snapshot with `lastPracticedAt` in the future beats real data on every conflict. A device with a fast clock (or a forged payload) pins its own values. | Backend B7 |
| S2 | Medium | **θ unvalidated.** `theta: 5`, `n: 201`, mismatched `n`, string `correct` were stored; whole θ map replaced per event. Server data can be arbitrary. The app rebuilds from responses, so it is robust, but other consumers (duel seeding reads the flat `theta`, which is not written today) would not be. | Backend B3 |
| S3 | Medium | **Date of birth drives child-safety policy** and is accepted with no validation. | Backend B9 |
| S4 | Medium | **Account existence oracle** in `POST /social/friends/request` (404 vs 200/409). The login limiter's own documentation treats the same leak on register as worth limiting. | Backend B10 |
| S5 | Low | **Client-supplied solve time** (documented by the backend): the 200 ms hard rejection can be walked past by sending a later timestamp. The keystroke intervals are also client-supplied and forgeable. The server-side checks are advisory by design. | Backend B5 |
| S6 | Low | `/health` on the game server is public and reveals queue and match counts. | Backend |
| S7 | Info | Code defaults for secrets exist (`dev-only-change-me`); production start is guarded by `REQUIRE_PROD_SECRETS`. **Staging environment not inspected**, so secret strength is unverified. | Ops |
| S8 | Info | Not tested: lobby/socket rate limits, authorization on every internal route, SQL injection review of raw queries in routers I did not read. | Backend |
| P1 | Medium | **Duel state in memory:** a game-server restart or deploy ends all matches silently and empties the queue; the server cannot be scaled to two instances. | Backend B11 |
| P2 | Low | Mastery payload with 200 techniques is ≈630 KB per read. Acceptable now; a delta read would help later. | Backend |
| P3 | Info | Observed latency on staging: most GETs 60-140 ms, `/practice/catalog` 307 ms, `/mocks/blueprints` 212 ms. | |
| P4 | Low | The 5 s countdown loop in `startMatch` has no delay between iterations, so it emits `lobby:countdown` five times in one tick (the loop has no delay), so clients see all five at once. | Backend |

---

## 11. Deployment and environment findings

- **Staging reachable and healthy:** Caddy fronts both REST and `/socket.io`; WebSocket upgrade works over HTTP/1.1 and from a real Chromium page at `localhost:3000`.
- **REST CORS** allow-list includes `http://localhost:3000`, Capacitor origins, and `https://examarena.com`; others get 400.
- **Socket.IO** admits requests with no `Origin` and listed origins only; **polling is not CORS-enabled** (B6). This is the cause of the error seen when an ad blocker blocked WebSockets.
- **Frontend env:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_MOCK=false`, `NEXT_PUBLIC_DEV_AUTH_BYPASS=false` (variable names only; values were not printed). Firebase keys are empty, which matches Google/phone sign-in being unimplemented on the backend.
- **Static export:** the build now emits 470 technique pages from backend skill names, using URL-safe slugs (Windows cannot write names with colons).
- **Migrations:** the backend repo has 37 SQL files; I cannot tell which are applied on staging (no database access). The `/api/topics/{topic}/subtopics` and `subtopic_items` behaviour proves the T3 work is deployed.
- **Test accounts created on staging this session** (cannot be deleted by me): about 16 throwaway users with `@example.com` addresses (`duel-probe-*`, `adaptive-probe-*`, `deep-probe-*`, `t0-probe-*`, `hb-probe-*`, `audit-*`, `audit-live-*`), a handful of friendships between `audit-*` accounts, and rating rows for the accounts that played. Safe to purge.

---

## 12. Implementation roadmap

Order by dependency:

1. **Done in this session (frontend only, no backend dependency):** F1 to F5. Files changed or added:
   - `src/services/duel-live.ts` (new), `src/hooks/use-live-duel.ts` (new), `src/components/duel/live-duel.tsx` (new), `src/components/duel/live-duel.test.tsx` (new)
   - `src/app/(app)/play/duel/page.tsx` (real mode renders `LiveDuel`; mock mode unchanged), `src/app/real-mode-pages.test.tsx` (Duel removed from the unavailable list)
   - `src/app/(app)/dashboard/friends/page.tsx`, `src/app/friends-requests.test.tsx` (Duel button honest)
   - `src/services/api.ts` (`refreshAccessToken` exported), `package.json` / `package-lock.json` (`socket.io-client`)
   - earlier in the session: Explorer (`explorer-tree.ts`, `backend-adapters.ts`, technique page, `reference-ids.ts`), sync indicator, mastery panel removal, and their tests.
2. **Backend P1, in parallel:** B1 (invitations), B2 (round replay), B3 (θ validation/merge), B4 (mapping coverage).
3. **Frontend after B1 and B2:** F6 and F7, then a two-account staging run: invite, accept, play, results, with the negative cases from the brief (non-friend, duplicate, reject, expired, network drop, refresh, unauthorized, simultaneous actions).
4. **Backend P2:** B5 to B11 (security and robustness).
5. **Product decisions:** friendly duel rated or not; Google/phone sign-in; billing UI; tournaments.
6. **Cleanup:** F8, F12, F14; commit.

### Acceptance for "Duel button enabled"

All of: B1 deployed to staging; two accounts that are friends complete invite, accept, match, results with consistent results on both screens; a non-friend, a duplicate, a decline, and an expiry each behave as specified; the frontend suite is green for the new flow. Until then the button stays disabled.
