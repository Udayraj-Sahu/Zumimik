# Backend team handoff: adaptive learning

For the backend developers. It contains **only backend-owned or jointly verified work**. The frontend side of each item is summarised in one line so you know what it is waiting for.

- Written 2026-11-06 from the backend source in `Speed-Gym-main` (no git history, no database, no Python available to the author). **Nothing below was run.** Every "existing" statement names the file or line it was read from, so it can be re-checked.
- Frontend branch: `feature/backend-integration` (pushed). Staging: `https://examarena-staging.duckdns.org`. **No staging verification has been done by the author.**
- Where this document and the older `docs/proposals/IRT_THETA_PERSISTENCE.md` differ, this document wins (the proposal is kept as the alternative design for T1).

## A. Backend work still required

| ID | Priority | Backend task | Required result | Migration? |
|---|---|---|---|---|
| T0 | P0 verification | Mastery snapshot persistence and merge | Confirm `session_end.metadata.technique_states` storage at realistic sizes, per-device snapshots and per-technique merge | No |
| T1 | P1 | IRT theta persistence and retrieval | Store per-subject ability from accepted `session_end` events; return it from `GET /api/v1/practice/mastery` | No (Option A) |
| T2 | P1 | Canonical subject classification | Authoritative `subject` (`quant` or `di`) on catalog skills and practice items | Likely yes |
| T3 | P1 | Explorer sub-topic mapping | `skills[]` and `reference_ids[]` per sub-topic | Likely yes |
| T4 | P2 | Calibration persistence | Read/write `ans_baseline_ms`, priors and `active_path` | One column |
| T5 | P2 | Review (sinking) persistence | Read/write review entries in the existing `sinking_skills` table | No |
| T6 | P2 | Mastery history | Read (and write) a technique state-change history, if shared history is approved | No |
| T7 | P2 | Question structural metadata for cognitive load | **Not required** (see T7) | No |
| T8 | P3 | Sync diagnostics | Stable rejection codes and documented retry semantics | No |

Decisions that need an owner before T1, T4 or T5 can ship are collected in section G.

### Conventions all contracts follow

Existing conventions (read from the routers): `snake_case` JSON, additive changes only, `/api/v1` for versioned routes, `/api` for content routes, bearer JWT through `get_current_user`, per-event idempotency on `event_id`, and a per-learner advisory lock around each `/sync` batch (`routers/sync.py:480-482`). New fields are **additive**: older apps ignore them, and the new app ignores their absence.

---

## T0 (P0 verification): mastery snapshot persistence and merge

**Why.** The app sends the learner's whole mastery picture as `session_end.metadata.technique_states` and reads it back from `/practice/mastery`. Everything the app shows rests on this round trip.

1. **Existing source.** Write: `routers/sync.py` (snapshot collection `:618`, insert `:685-694`, `ON CONFLICT (source_event_id) DO NOTHING`). Read and merge: `mastery_read.py` (`LATEST_PER_DEVICE_SQL` `:91-106`, `select_states` `:239`, `read_mastery` `:305`). Table: `bkt_state_snapshots` (`db/postgres/20_base_telemetry.sql:44`; `270_engine_tranche.sql:66-80` adds `source_event_id`, `client_timestamp`, the `periodic` reason).
2. **Change required.** None unless a check below fails.
3. **Tables and columns.** `bkt_state_snapshots(id, user_id, session_id, technique_states JSONB NOT NULL, snapshot_reason, device_id VARCHAR(100), source_event_id UUID UNIQUE, client_timestamp BIGINT, created_at)`.
4. **Migration.** No.
5. **Routes.** `POST /api/v1/sync`, `GET /api/v1/practice/mastery`.
6. **Request.** The app now sends `{ "events": [...], "device_id": "<stable per-install id, <= 100 chars>" }`. A `session_end` carries `metadata.technique_states = { "<skill>": { pLearned, state, masteryScore, accuracyScore, consecutiveCorrect, consecutiveErrors, totalAttempts, totalCorrect, distinctCorrectIds[<= 50], recent[<= 10], evidenceNats, lastPracticedAt, decayedFrom?, engineVersion } }`.
7. **Response.** Existing (`sync.py:698-713`): `{ accepted, duplicates, sampled_out, minimized, rejected: [{event_id|null, index, reason}], device_id_ignored, xp_awarded, psychometric, unknown_event_types, entitlement }`.
8. **Auth.** Existing.
9. **Validation.** Existing per-event validation (`sync.py:208-304`). Verify the snapshot JSON has no size cap that truncates it.
10. **Idempotency and multi-device.** Previously the app sent **no** `device_id`, so every device of a learner shared the `NULL` partition and only one snapshot counted. It now sends one. **Verify**: two devices (two `device_id` values) practising different techniques each keep their own latest snapshot, and `select_states` returns, per technique, the entry with the latest practice time; a device with an older entry for a technique it did not practise must not hide the other device's newer one.
11. **Tests (please run and add).** (a) A 200-technique `technique_states` (about 0.5 MB, estimate: up to 50 `distinctCorrectIds` of about 40 characters each per technique) is stored and returned unchanged. (b) Two `device_id`s, disjoint techniques, both returned. (c) Two `device_id`s, same technique, the later `lastPracticedAt` wins. (d) A batch of `client_timestamp` in the future cannot win (existing guard, `mastery_read.py:27-34`). (e) A resent `session_end` writes no second row. (f) A child account (`device_id` dropped, `sync.py:485`) still gets a readable snapshot.
12. **Deploy / rollback.** Nothing to deploy; if a size limit is found (proxy in `deploy/*` or an application limit), raising it is the fix and is reversible.

Open question for you: the proxy and application request-size limits were not found in `services/api/app` (searched for body/size limits). Please state them.

---

## T1 (P1): IRT theta persistence and retrieval

**Why.** The app estimates ability per subject on the device and sends it on `session_end`; nothing stores it, so a new device starts from zero.

1. **Existing source.** `db/postgres/10_create_core.sql:367-405` (`user_cognitive_profiles`: flat `theta`, `theta_se`, and `subject_profiles` JSONB with defaults `quant: {theta, topic_theta, se}`, `di: {overall_theta, chart_type_theta, se, recent_sets}`), `270_engine_tranche.sql:90`. `routers/internal.py:164-168`, `tournaments/service.py:86-88`, `apps/game-server/src/duel-room.ts:109` **read the flat `theta`**. `tests/test_legal_claims.py:785-796` fails if any `INSERT/UPDATE user_cognitive_profiles` statement mentions `theta`; `docs/release/PRIVACY.md:378-390` says θ is 0 for everyone. `docs/backend/ENGINE_SERVER.md:37-38`: theta "survives in `raw_events.metadata`" until a writer exists.
2. **Files to change.** `routers/sync.py` (new write step), `mastery_read.py` (new `read_ability`), `tests/test_sync_engine.py` (new tests).
3. **Tables.** **Option A (recommended, no migration):** `user_cognitive_profiles.subject_profiles` JSONB, under the existing `quant` and `di` keys; **do not write the flat `theta`/`theta_se`** (see section G, D1). The row is not created at registration (every reader uses `LEFT JOIN`), so the writer must upsert: `INSERT INTO user_cognitive_profiles (user_id, subject_profiles) VALUES (...) ON CONFLICT (user_id) DO UPDATE SET subject_profiles = ...`. **Option B (alternative):** a new table `learner_ability (user_id, device_id, subject, state JSONB, client_timestamp, source_event_id, PK (user_id, device_id, subject))`, in `docs/proposals/IRT_THETA_PERSISTENCE.md`; it keeps per-device rows and leaves merging to the client, at the price of a migration.
4. **Migration.** None for Option A.
5. **Routes.** Write: existing `POST /api/v1/sync` (no new route). Read: additive field on `GET /api/v1/practice/mastery`.
6. **Request** (already sent by the app, only for subjects the backend named; the app never sends an unclassified estimate):

```json
{ "event_type": "session_end", "event_id": "…", "client_timestamp": 1793879995000, "session_id": "…",
  "metadata": {
    "technique_states": { "…": "…" },
    "theta": {
      "quant": { "subject": "quant", "theta": 0.4, "se": 0.3, "n": 3,
                 "responses": [ { "problemId": "t101", "a": 1.0, "b": 0.0, "correct": true } ] },
      "di":    { "subject": "di", "theta": -0.2, "se": 0.4, "n": 1,
                 "responses": [ { "problemId": "t240", "a": 1.2, "b": 0.5, "correct": false } ] }
    } } }
```

7. **Response** (additive on `/practice/mastery`; existing keys unchanged):

```json
{ "technique_states": { "…": "…" }, "selection": { "…": "…" }, "as_of": "2026-11-06T10:00:00Z", "devices": 2,
  "theta": {
    "quant": { "theta": 0.4, "se": 0.3, "n": 25, "responses": [ { "problemId": "t101", "a": 1.0, "b": 0.0, "correct": true } ] },
    "di":    { "theta": -0.2, "se": 0.4, "n": 12, "responses": [] }
  } }
```

   A learner with nothing stored gets `"theta": {}`. A subject that has no data is absent (not `null`).
8. **Auth.** Bearer JWT; a learner reads and writes only their own row (`user["id"]`).
9. **Validation** (a state failing any rule is skipped; **the event itself is still stored**, a bad theta must never reject a `session_end`): subject in `{quant, di}` only (any other key is dropped, never mapped); `theta` finite in [-3, 3]; `se` finite and > 0; `n` an integer in [0, 200] equal to `len(responses)`; `responses` at most 200 objects `{problemId: non-empty string, a: 0.5..2.5, b: finite, correct: boolean}`; at most one response per `problemId`.
10. **Idempotency and multi-device merge (deterministic, documented).** Only an event that was stored just now (`inserted`) writes. Per subject, under the existing per-learner advisory lock: `merged.responses` = the stored responses followed by the incoming ones, removing a repeated `problemId` (**the first occurrence wins**), keeping the latest 200. This is order-independent for evidence (a replayed or older event adds nothing already present), so no timestamp guard is needed. `theta` and `se` are **informational**: the app rebuilds both from `responses` with the vendored engine, so the server need not port the IRT code; store them from whichever state has the larger `n` (a tie goes to the incoming state). Never average two estimates. If the server later ports the IRT, recompute here.
11. **Tests.** Valid persistence for `quant`; separate `quant` and `di` storage; invalid payloads skipped without rejecting the event (theta 5, `n` not equal to the response count, 201 responses, `correct` not boolean, unknown subject); a duplicate `event_id` writes nothing; two devices with disjoint responses produce the union; a replayed older event changes nothing; the `mastery` response contains `theta` and the old keys; an old client (no `theta`) is unaffected; **`test_legal_claims` still passes** (nothing writes the flat `theta`).
12. **Deploy / rollback.** Additive. Deploy the backend first; the app reads `theta` only when present. Rollback: remove the write step and the response key; stored JSON is harmless.

**Frontend status.** Ready and tested: `remoteAbilityOf`, `mergeBook`, `loadAbilityBook` (`src/lib/learning/ability-book.ts`, `src/services/learner.ts`). It ignores any `theta` that is not the shape above and rebuilds each state from `responses`, so a wrong server theta cannot corrupt it. **Waiting for backend deployment.**

---

## T2 (P1): canonical Quant / Data Insights subject

**Why.** Practice items carry no subject, so the app cannot keep Quant and Data Insights ability apart. It keeps items with no subject in a local-only "unclassified" estimate and never counts them as Quant.

1. **Existing source.** Catalog: `routers/prescription.py` (`practice_catalog`, `:399-466`). Items: `routers/session.py` (item builder `:130-165`, `attach_irt` `:615`), `routers/prescription.py` (`prescribed_session` `:244`, `_load_tier1`). Skills: Neo4j `:Skill` (`name`, `topic`, `sub_topic`, `is_root`, `routers/practice.py:52`). No `subject` exists anywhere in the graph, the catalog or the items (searched `db/neo4j`, `content*.py`, `prescription.py`, `session.py`). The only `di` in the backend is the GMAT mock section (`mocks/blueprints.py:124`).
2. **Files to change.** `routers/prescription.py`, `routers/session.py`, the content/seed tooling that loads `:Skill` nodes (`db/neo4j/loaders/*`), and wherever generated items are built.
3. **Tables.** `:Skill` nodes in Neo4j (a `subject` property), or an explicit mapping table; **the classification must come from the taxonomy or an explicit mapping the content owner maintains. Do not infer it from question text, technique name or route.**
4. **Migration.** A graph property backfill (or a mapping table) by the content team.
5. **Routes.** `GET /api/v1/practice/catalog`, `POST /api/v1/practice/session`, `GET /api/v1/practice/session` (all additive).
6. **Request.** Unchanged.
7. **Response.**

```json
// GET /api/v1/practice/catalog
{ "skills": [ { "skill": "Fractions and Decimals", "subject": "quant", "servable": 12, "parents": [], "…": "…" } ] }

// POST /api/v1/practice/session  and  GET /api/v1/practice/session
{ "items": [ { "template_id": "t101", "skill": "Fractions and Decimals", "subject": "quant", "bucket": "primary", "irt": { "a": 1.0, "b": 0.0, "source": "seed" }, "…": "…" } ] }
```

8. **Auth.** Existing.
9. **Validation.** `subject` is exactly `"quant"`, `"di"`, or **absent for unclassified content** (never a default). An item inherits its skill's subject; a skill with no classification yields no field. A value outside the two is a data error to be logged, not served.
10. **Idempotency.** Not applicable (read-only).
11. **Tests.** Catalog subject mapping; static item propagation; generated item propagation; a skill with no classification serves no `subject`; an invalid stored value is not served; old fields unchanged; together with T1, independent `quant` and `di` updates.
12. **Deploy / rollback.** Additive; deploy before the app starts relying on it (the app already reads it when present).

**Frontend status.** Ready and tested: catalog and item `subject` are read only when they are exactly `quant` or `di` (`services/backend-adapters.ts`, `services/learner.ts`); everything else stays unclassified. **Waiting for backend deployment.**

---

## T3 (P1): Explorer sub-topic to technique mapping

**Why.** `/api/topics` returns sub-topic names only, so the Explorer cannot show a sub-topic's techniques or mastery. It never invents a mapping.

1. **Existing source.** `routers/content.py` (`list_topics` `:51-118`, `topic_subtopics` `:120-176`), `routers/reference.py` (`/subtopics/reference`, `/{id}/reference`), `routers/practice.py:52` (`/practice/techniques`, `:Skill.topic/sub_topic`). Tables: `problems(topic, sub_topic)`, `topic_browser_subtopics(subtopic_id, topic, category, …)`.
2. **The problem.** Three vocabularies: bank topic (`"Number Theory"`), `:Skill.topic` (`"NumberTheory"`), reference topic (`"Vedic Math"`). No key joins them.
3. **Decision for the backend (section G, D6).** Define the mapping source: **(a)** a controlled mapping table `subtopic_skill_map(topic, sub_topic, skill_id)` and `subtopic_reference_map(topic, sub_topic, reference_id)` maintained by content (a migration), or **(b)** make the three vocabularies consistent and derive it. The frontend must not guess either.
4. **Migration.** Likely yes for (a).
5. **Routes (additive).** `GET /api/topics`, `GET /api/topics/{topic}/subtopics`. Keep `subtopic_list` and the existing `subtopics` array.
6. **Request.** Unchanged.
7. **Response.**

```json
// GET /api/topics
{ "topics": [ { "topic": "Number Theory", "problems": 120, "subtopics": 4,
    "subtopic_list": ["Divisibility"],
    "subtopic_items": [ { "name": "Divisibility",
        "skills": [ { "id": "DivisibilityRules", "name": "Divisibility rules" } ],
        "reference_ids": ["divisibility_tricks"] } ] } ] }
```

   `skills[].id` is the canonical `:Skill.name` used by `/practice/catalog` and `/practice/session`. A sub-topic with no mapping returns `"skills": []` and `"reference_ids": []` (never omitted, never guessed). `GET /api/topics/{topic}/subtopics` returns the same two arrays per sub-topic.
8. **Auth.** Public like the rest of `content` (unchanged); a skill listed must exist in the catalog.
9. **Validation.** Every `skills[].id` must exist as a `:Skill`; every `reference_ids[]` must exist in `topic_browser_subtopics`; reject at load time, not at request time.
10. **Idempotency.** Read-only.
11. **Tests.** Topic and sub-topic mapping; reference-to-skill mapping; missing mapping returns empty arrays; an invalid skill id is rejected by the loader; the response is a strict superset of today's (old clients unaffected).
12. **Deploy / rollback.** Additive; mapping data loaded before the route change.

**Frontend status.** Ready: technique nodes (already keyed by canonical skill id), Fractured / Fragile / Fluid labels, technique-only practice and deep links. **Waiting for an API contract** (field names above are proposed, not agreed): the frontend will consume `subtopic_items` once you confirm or change them.

---

## T4 (P2): shared calibration and active learning path

1. **Existing source.** `users.active_path VARCHAR(50)` with `CHECK IN ('core_math_vedic','vedic_standalone','exam_prep') DEFAULT 'core_math_vedic'` (`db/postgres/40_exam_v5.sql:12-15`, **on `users`, not on `user_cognitive_profiles`**). `user_cognitive_profiles.ans_baseline_ms INTEGER` (`270_engine_tranche.sql:89`). Registered event `calibration_completed` (`telemetry.py:77`, psychometric, never sampled). Design: `ENGINE_TRANCHE_DESIGN.md` W1-8. **No API code reads or writes any of these** (grep).
2. **Files to change.** `routers/sync.py` (handle a newly stored `calibration_completed`), `mastery_read.py` (read), tests.
3. **Tables.** Reuse `users.active_path` and `user_cognitive_profiles.ans_baseline_ms`. Priors have no column. **One new nullable JSONB column `user_cognitive_profiles.calibration`** is proposed for `{status, priors, completed_at}`; if you prefer no migration, `subject_profiles -> 'calibration'` could hold it (but it is not a subject; section G, D7).
4. **Migration.** One column (or none with the JSONB alternative).
5. **Routes.** Write through the existing `POST /api/v1/sync` (idempotent, offline-safe, no new route); read as an additive `calibration` field on `GET /api/v1/practice/mastery`.
6. **Request** (what the app already sends in a `calibration_completed` event; `answered` is the number of warm-up answers):

```json
{ "event_type": "calibration_completed", "event_id": "…", "client_timestamp": 1793879995000,
  "metadata": { "priors": { "Fractions": 0.8, "Decimals": 0.5 }, "ans_baseline_ms": 6200, "active_path": "exam_prep", "answered": 6 } }
```

7. **Response** (additive on `/practice/mastery`):

```json
{ "calibration": { "status": "completed", "ans_baseline_ms": 6200, "priors": { "Fractions": 0.8 }, "active_path": "exam_prep", "completed_at": "2026-11-06T10:00:00Z" } }
```

   Absent for a learner who never calibrated.
8. **Auth.** Own data only.
9. **Validation.** `ans_baseline_ms` an integer in [1, 600000]; `priors` values in [0, 1] and each key a known skill; `active_path` one of the three enum values (otherwise ignore that field, keep the event); never lower an `active_path` that the user set explicitly elsewhere without a rule (section G, D8).
10. **Idempotency / multi-device.** Written only for a newly stored event. Conflict rule: the **later `client_timestamp` wins** per field; a skipped warm-up (no `calibration_completed`) writes nothing, so it can never overwrite real calibration.
11. **Tests.** Save and read; invalid baseline ignored; invalid `active_path` ignored; a duplicate event is a no-op; offline event then sync; a later event wins; a second user cannot read the first's; an old client unaffected.
12. **Deploy / rollback.** Additive; column nullable.

**Frontend status.** Local calibration is complete and offline-safe. **Waiting for API contract** (read shape above is proposed). On agreement the app will merge: server value used when the device has none; a device value newer than the server's is kept.

---

## T5 (P2): shared review (sinking) entries

1. **Existing source.** `sinking_skills` (`db/postgres/40_exam_v5.sql:116-141`): `PRIMARY KEY (user_id, technique_id)`, `technique_canonical_id VARCHAR(50)`, `decay_priority DECIMAL(3,2) CHECK 0..1`, `consecutive_errors`, `total_errors`, `total_attempts`, `triggered_by CHECK IN ('mock_wrong_answer','session_wrong','decay','manual')`, `source_problem_ids TEXT[]`, `trap_types TEXT[]`, `last_practiced`, `created_at`, `updated_at`. `DATA_PATH.md:211-216`: the table has no runtime writer. The engine's entry is `{techniqueId, decayPriority, consecutiveErrors, totalErrors, triggeredBy}`.
2. **There is no due-date column, and the engine has none:** an entry is "due" when its priority is above 0.7 (queue) or the 7-day decay cliff applies; resolved means priority 0 and `consecutive_errors` 0 (`resolveSinking`). The contract below keeps it that way. **Do not add a second scheduler on the server.**
3. **Files to change.** `routers/sync.py`, `mastery_read.py` (or a sibling), tests.
4. **Migration.** None.
5. **Routes.** Write through `session_end.metadata.review_entries` on the existing `POST /sync`; read as an additive `review` list on `GET /api/v1/practice/mastery`.
6. **Request** (the app would send the entries that changed in the session):

```json
{ "metadata": { "review_entries": [
  { "technique_id": "Fractions", "decay_priority": 0.9, "consecutive_errors": 2, "total_errors": 4, "triggered_by": "session_wrong", "last_practiced": 1793879995000, "resolved": false } ] } }
```

7. **Response:**

```json
{ "review": [ { "technique_id": "Fractions", "decay_priority": 0.9, "consecutive_errors": 2, "total_errors": 4, "triggered_by": "session_wrong", "last_practiced": "2026-11-06T10:00:00Z", "updated_at": "2026-11-06T10:00:01Z" } ] }
```

   Resolved entries are not returned (`decay_priority` 0 and `consecutive_errors` 0 are deleted or hidden; your choice, document it).
8. **Auth.** Own rows only.
9. **Validation.** `technique_id` a known `:Skill`; `decay_priority` in [0.00, 1.00] (two decimals); `triggered_by` in the four values; counters non-negative integers.
10. **Idempotency / multi-device.** Upsert by `(user_id, technique_id)`, only for a newly stored event. Conflict rule: the entry whose `last_practiced` is **later wins**; ties keep the higher `decay_priority`. A resolution from one device must not be undone by an older entry from another (the later `last_practiced` decides).
11. **Tests.** Create, update, resolve; duplicate request; offline update then sync; cross-device (later wins, resolution not reverted); another learner's entries not readable; invalid values skipped.
12. **Deploy / rollback.** Additive.

**Frontend status.** The local review book works. **Waiting for API contract** (field names are the table's own, proposed here).

---

## T6 (P2): mastery history (only if shared history is approved)

1. **Existing source.** `technique_state_transitions` (`db/postgres/10_create_core.sql:341-357`): `user_id`, `technique_id`, `from_state`, `to_state`, `mastery_score_before/after`, `trigger_event`, `session_id`, `problem_id`, `attempt_id`, counters, `created_at`. **Nothing reads or writes it** (grep). The app records a local timeline from the pipeline's own before/after states.
2. **Files to change.** `routers/sync.py` (write on a newly stored `session_end` whose `technique_states` changed a label versus the previous snapshot), a read route, tests.
3. **Migration.** None (the table exists; confirm `from_state 'new'` for a first appearance).
4. **Routes.** New read route: `GET /api/v1/practice/mastery/history?skill=<id>&limit=<1..100>&before=<ISO>` (paginated, newest first). No new write route.
5. **Response:**

```json
{ "items": [ { "technique_id": "Fractions", "from_state": "fragile", "to_state": "fluid", "session_id": "…", "engine_version": 2, "at": "2026-11-06T10:00:00Z" } ], "next_before": "2026-11-01T09:00:00Z" }
```

6. **Auth.** Own rows only.
7. **Validation.** `limit` bounded; `before` a valid ISO time; `skill` optional.
8. **Idempotency.** One row per `(session_id, technique_id)` for the stored event; a resent `session_end` writes nothing.
9. **Rules.** Store meaningful label changes only, never every sync; never synthesise history from the current snapshot.
10. **Tests.** A change is written once; no change writes nothing; pagination; ownership; a duplicate event.
11. **Deploy / rollback.** New route and a write step; additive.

**Frontend status.** Local timeline done and tested; shared history **Not implemented, waiting for an approval and a contract**.

---

## T7 (P2): question structural metadata for cognitive load

**Not required.** The engine counts the features itself from the question text: `bclFeatures(text)` then `baseCognitiveLoad(...)` in `src/vendor/psychometrics/cognitive-load.ts` (the design's own counting rules, COG-01, VMSG:312). The app calls those functions, logs the result as `bcl` on each `problem_attempt`, and uses it only as the tiebreak the controller already supports. No structural fields are needed from the backend, and none should be fabricated. If you want structured metadata for another reason, tell the frontend team; the linguistic and working-memory loads (COG-02, COG-03) are not built in the engine.

---

## T8 (P3): sync diagnostics

1. **Existing source.** `routers/sync.py:321-352` (`_validate_events`, `rejected: [{event_id, index, reason}]`, `reason` is free text like `"client_timestamp: Input should be greater than or equal to 0"`).
2. **Change.** Add a stable `code` to each rejection, additive, next to `reason`: `invalid_event_id`, `invalid_event_type`, `invalid_client_timestamp`, `invalid_session_id`, `invalid_event_shape`, `invalid_field`. Keep `reason` (human text, never echoing values).
3. **Document retry semantics.** The app treats these as: **retry** on network failure, 5xx, 401 (after one token refresh), 408, 429; **park for good** on any other 4xx for the whole request; and, per event, **park** everything listed in `rejected` (the server says a resend returns the same answer). Please confirm that table is what you intend, or change it.
4. **Registered psychometric events** that must stay registered and never sampled out: `fatigue_index_computed`, `clr_mode_activated`, `calibration_completed`, `bkt_state_snapshot` (`telemetry.py:73-81`). Confirm.
5. **Tests.** Each rejection reason maps to one stable code; unknown fields do not break old clients.

**Frontend status.** Parked events and their reasons are shown in the new sync indicator. Showing the stable codes is **waiting for the contract**.

---

## B (cross-check). Required contract examples in one place

See T1 (theta in `/practice/mastery`), T2 (`subject` in catalog and items), T3 (`subtopic_items` with `skills[]` and `reference_ids[]`), T4 (`calibration`), T5 (`review`), T6 (history route), T8 (`code` on rejections).

## C. Dependency matrix

| Item | Frontend | Backend | Status |
|---|---|---|---|
| T0 snapshot persistence and merge | Complete and tested (event-sourced reconcile, device id, acknowledged-snapshot memory) | Verification pending | Backend pending |
| T1 theta | Adapter, merge and per-subject book complete and tested | Not implemented | Waiting for backend deployment |
| T2 subject | Reads and uses `subject` when present | Not implemented | Waiting for backend deployment |
| T3 Explorer mapping | Technique labels, practice and deep links done | Contract not agreed | Waiting for API contract |
| T4 calibration | Local complete | Contract not agreed | Waiting for API contract |
| T5 review | Local complete | Contract not agreed | Waiting for API contract |
| T6 history | Local timeline complete | Not approved | Waiting for API contract |
| T7 cognitive load | Complete and tested (engine computes it) | Nothing required | Frontend complete |
| T8 diagnostics | Parked events and reasons shown | Codes not added | Waiting for API contract |

## D. Backend verification checklist

- Existing routes still work, and old frontend clients (no `device_id`, no `theta`, no `subject` handling) remain compatible.
- JWT authentication and learner ownership hold on every new field and route.
- Duplicate sync events do not duplicate updates (snapshots, theta, calibration, review, history).
- Multiple devices never overwrite newer learner progress (T0 tests).
- Partial event rejection stays per event and the rest of the batch is stored.
- Existing database data is preserved by every migration; migrations run on a copy of staging first.
- Payload limits support the realistic mastery snapshot (T0).
- All tests pass against the real database model, including `test_legal_claims` unchanged.
- Staging responses match the contracts above.

## E. Acceptance criteria

A backend task is **not complete** until: it is merged; any migration is applied successfully; its tests pass; its request and response examples are documented here or updated; staging verification is done or explicitly marked pending; and the frontend can consume it with no guessing and no mock values. A written plan or a proposed schema is not completion.

## F. Deployment order

1. T0 verification (no change expected).
2. T8 (stable codes: harmless, additive).
3. T1 backend, then the app reads `theta` automatically (already built).
4. T2 backend (subject), then T1's `di` becomes meaningful.
5. T3 mapping data and route, then the frontend integrates `subtopic_items`.
6. T4, T5 contracts agreed, backend, then the frontend integrates them.
7. T6 only if approved.

Each step: agree the contract, implement, run backend tests, deploy to staging, validate the real response, integrate the frontend, run frontend tests, then an end-to-end test.

## G. Decisions needed before building

| # | Decision | Author's recommendation |
|---|---|---|
| D1 | Write the flat `user_cognitive_profiles.theta` as well (design Q31)? It changes duel turn order, duel difficulty and tournament seeding, and contradicts `PRIVACY.md` and `test_legal_claims` | No. Store practice ability in `subject_profiles` only |
| D2 | Store ability for child accounts (under 13)? Snapshots are already stored for them | Same treatment as snapshots; skip if policy says otherwise |
| D3 | Privacy notice: practice ability, calibration and review entries are new stored items | Update the notice before release |
| D4 | Where cross-device theta is combined (server union, as in T1) | Server union of responses; the app refits |
| D5 | Retention of ability, calibration, review and history | Keep while the account exists (cascade on delete) |
| D6 | The source of the sub-topic mapping (T3) | A controlled mapping table the content owner maintains |
| D7 | Where calibration priors live (T4): new `calibration` column or `subject_profiles` | New column |
| D8 | May a calibrated `active_path` replace one the user chose explicitly? | Only if the user never set it (needs a flag) |
| D9 | Whether shared mastery history (T6) is approved | Product decision |
