# Frontend / backend integration

Contracts below were read from the backend source (`Speed-Gym-main/services/api/app`) and compared with the frontend callers. The backend copy has no git history, so "verified" means: matches that source on 2026-11-06. Nothing here was exercised against the staging server.

## 1. Base paths

`src/lib/platform/config.ts` (`apiUrl`): a path that starts with `/api/` is sent as is, everything else gets `/api/v1`. The backend mounts the versioned routers (`auth`, `session`, `prescription`, `sync`, `dashboard`, `social`, `mocks`, ...) under `/api/v1`, and `content`, `reference` and `practice` (techniques) without a prefix, which gives `/api/topics`, `/api/subtopics/...` and `/api/practice/techniques`.

All of these need a bearer token except the public content and reference reads.

## 2. Routes the learner model uses

| Route | Caller | Request | Response (fields the app reads) | Status |
|---|---|---|---|---|
| `GET /api/v1/practice/catalog` | `services/learner.ts` `loadCatalogSkills` (5 min cache), `services/explorer.ts`, `services/sprint.ts` | none | `{ catalog_version, skills: [{ skill, servable, feeds_mastery, by_difficulty, generated, parents, skipped_prerequisites, unseen }], summary }`. 503 `{detail:{reason:"trust_ladder_unavailable"}}` when the trust table cannot be read | Verified |
| `GET /api/v1/practice/mastery` | `loadMasterySnapshot` (60 s cache, last good copy kept on the device), `services/adaptive.ts` | none | `{ technique_states: { <skill>: {pLearned, state, masteryScore, distinctCorrectIds, recent, evidenceNats, lastPracticedAt, engineVersion, ...} }, selection, as_of, devices }`. Entries are returned exactly as stored. **No theta, no baseline, no active path** | Verified |
| `POST /api/v1/practice/session` | `practice.ts` `getPracticeSession` | `{ slots: [{ skill, bucket: "primary"\|"sinking"\|"frontier", n, p_learned? }] (>= 1 slot, at most 50 items), theta?: -3..3, backfill?: bool }` | `{ items: [{ template_id, question_text, difficulty, skill, technique, topic, sub_topic, trust, feeds_mastery, answer_check, expected_answer, bucket, slot, in_window, repeat, irt:{a,b,source}, template? }], summary:{requested,served,...}, ... }`. A single-slot request is back-filled by the server unless `backfill:false` | Verified |
| `GET /api/v1/practice/session?topic=&size=` | bank topics and the short-session top-up | query | same item shape | Verified |
| `POST /api/v1/sync` | `telemetry.ts` `sendSyncBatch`, `offline/sync.ts` | `{ events: SyncEvent[] (<= 500), device_id?: string (<= 100) }`; `SyncEvent = { event_id (<= 64, dedup key), event_type (<= 60), client_timestamp (ms, >= 0), session_id? (UUID), session_elapsed_ms?, metadata }` | `{ accepted, duplicates, sampled_out, minimized, rejected: [{ event_id\|null, index, reason }], device_id_ignored, xp_awarded, psychometric, unknown_event_types, entitlement }` | Verified |
| `GET /api/topics`, `GET /api/topics/{topic}/subtopics`, `GET /api/practice/techniques`, `GET /api/subtopics/reference`, `GET /api/subtopics/{id}/reference` | `services/explorer*.ts`, `reference.ts`, `techniques.ts` | query | topic list `{ topics: [{ topic, problems, subtopics, subtopic_list }] }`; skills `{ techniques: [{ name, topic, sub_topic, is_root, problem_count }] }` | Verified |

## 3. Behaviour the frontend now depends on

- **Per-event rejection.** `/sync` validates each event on its own and answers HTTP 200 with the rest stored. The client reads `rejected`, parks those events with their reason (one Dexie transaction with deleting the acknowledged batch) and never retries them (the server says a resend gets the same answer). `services/offline/sync.ts: settleAcknowledged`. Tested in `sync-rejections.test.ts`.
- **Idempotency.** The server deduplicates on `event_id` (returned as `duplicates`); the local queue is keyed by the batch's first event id; the local replay applies each event id once.
- **`session_end.metadata.technique_states`** becomes a `bkt_state_snapshots` row (only when present). `metadata.theta` is logged in `raw_events` and nothing reads it back (see gaps).
- **`calibration_completed`, `fatigue_index_computed`, `clr_mode_activated`** are registered psychometric event types (`telemetry.py`), so they are stored, never sampled.
- **Device id.** The backend keeps each device's latest snapshot and then chooses, per technique, the entry with the latest practice time (`mastery_read.py`, partitioned by `device_id`). The client previously sent no `device_id`, so every device of a learner looked like one device and only the single newest snapshot counted. Every `/sync` now carries a stable per-install id (`services/offline/device-id.ts`, tested in `device-id.test.ts`).

## 4. Errors and retries

| Situation | Client behaviour |
|---|---|
| Network failure, 5xx, 401, 408, 429 | batch stays queued, retried by the next flush (oldest first) |
| Other 4xx on the whole request | batch parked with the message (`isPermanentRejection`), never deleted |
| 200 with `rejected` | rejected events parked, the rest cleared |
| 401 | one token refresh; if refused, sign out and `resetAppState` (unsynced events and learner data are kept for that learner) |
| `/practice/catalog` 503 | the cached catalog is used; session building falls back to the single-skill request |
| `/practice/mastery` unreadable | the last good copy on the device is used; with none, no snapshot is written and nothing is recommended (never a blank learner) |

## 5. Contracts that cannot support a requirement (backend work needed)

1. **Theta (IRT) persistence and recovery.** The full proposal is `docs/proposals/IRT_THETA_PERSISTENCE.md`. Summary, verified against the backend source. **Proposal only: not applied and not run** (the backend copy has no database to run it against).

   What the schema and code actually say:
   - `user_cognitive_profiles` has a flat `theta` and `theta_se` (`10_create_core.sql:371`, `270_engine_tranche.sql:90`) and a `subject_profiles` JSONB whose defaults are `quant: {theta, topic_theta, se}` and `di: {overall_theta, chart_type_theta, se, recent_sets}`. No API code writes any of them.
   - The flat `theta` is **read by the duel server and tournament seeding** (`routers/internal.py:164` returns it as `theta_u`; `tournaments/service.py:86`; `apps/game-server/src/duel-room.ts:109`) as `COALESCE(p.theta, 0)`. `tests/test_legal_claims.py:785` fails if anything writes it, and `docs/release/PRIVACY.md:390` tells users the matchmaking ability score is the same for everyone. **Writing the flat column would change who answers first and how hard a duel problem is, and contradict the published privacy text.** The design (ENGINE_TRANCHE_DESIGN Q31, "write both") assumes that change. It is an owner decision that needs a Duels privacy update, so this proposal does not do it, and practice ability does not need it.
   - `user_cognitive_profiles` rows are not created at registration (every reader uses a `LEFT JOIN`), so a writer to that table would have to upsert.
   - `bkt_state_snapshots.technique_states` is `NOT NULL` and the reader takes each device's newest row (`LATEST_PER_DEVICE_SQL`). A theta-only snapshot row would hide that device's techniques, so theta must not be sent as its own snapshot.
   - `ENGINE_SERVER.md` says a snapshot's theta "survives in `raw_events.metadata`" until a writer exists. The client already sends `session_end.metadata.theta = { "<subject>": ThetaState }`.

   Proposed change (backend repository), leaving `user_cognitive_profiles` and the duel behaviour untouched:
   - **Migration `280_learner_ability.sql`** (the next number after `270`): `CREATE TABLE IF NOT EXISTS learner_ability (user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, device_id VARCHAR(100) NOT NULL DEFAULT '', subject VARCHAR(10) NOT NULL CHECK (subject IN ('quant','di')), state JSONB NOT NULL, client_timestamp BIGINT NOT NULL, source_event_id UUID NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (user_id, device_id, subject));` It is a new table, so it is backward compatible and needs no backfill. An optional backfill could read `raw_events.metadata->'theta'` of stored `session_end` events; that is not verified.
   - **Write**, in `routers/sync.py` next to the snapshot insert, for an event stored just now (`inserted`) that is a `session_end` with `metadata.theta` as an object: keep only the keys `quant` and `di` (anything else is dropped, never mapped), require theta in [-3, 3] and at most 200 responses, then `INSERT ... ON CONFLICT (user_id, device_id, subject) DO UPDATE SET state = EXCLUDED.state, client_timestamp = EXCLUDED.client_timestamp, source_event_id = EXCLUDED.source_event_id WHERE EXCLUDED.client_timestamp >= learner_ability.client_timestamp`. It is idempotent: a resent event is not `inserted` again, and an older replay cannot overwrite a newer state.
   - **Read**: `/practice/mastery` adds `theta: { "<subject>": [ { device_id, as_of, state } ] }`, newest first. It is additive, so older clients ignore it. The server does not merge. The client combines evidence from several devices (union of responses by problem id, first attempt each, then the engine's `refitTheta`), the same "select, never average" rule used for P(L).
   - **Tests to add**, in the style of `tests/test_sync_engine.py`: the new table's columns; a stored `session_end` writes one row per valid subject; a resent event writes nothing; an older `client_timestamp` does not regress a row; an unknown subject is dropped; `/practice/mastery` returns it; `test_legal_claims` stays green because `user_cognitive_profiles.theta` is still not written.
   - **Subject.** The `di` key only becomes meaningful once practice items carry a subject (item 2). Until then the client sends `quant` only and nothing is guessed.
   - **Frontend after that** (small): `loadAbility` merges the server states with the local one as described, then `restoreTheta` rebuilds theta from the combined responses.
2. **Subject for practice items.** Practice items have no subject field, so Data Insights ability cannot be told from Quant. The required contract is a canonical `subject` (`quant` or `di`) on each `:Skill` (or item) returned by `/practice/catalog` and `/practice/session`. Until then every item is `quant` and nothing is guessed.
3. **Sub-topic to technique link.** `/api/topics` returns sub-topic names only. Needed: per sub-topic `skills[]` and `reference_ids[]` (see the earlier requirement note). Until then bank sub-topics stay display-only.
4. **Calibration and learning path storage.** `ans_baseline_ms` and `active_path` have columns (migration 270 and `40_exam_v5.sql`) but no write route and no read. The app keeps them on the device and logs `calibration_completed`.
5. **Review entries.** `sinking_skills` has no writer or reader in the API, so the review book is per device.
