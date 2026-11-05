# Proposal: persist and return a learner's IRT ability (theta)

**Status: proposal for the backend team. Nothing here has been applied, run or tested.** The backend copy used to write it (`Speed-Gym-main`) has no database, no git history, and no Python on the machine it was read on. Every fact below was read from that source; each states where, so it can be re-checked.

## 1. Problem

The app estimates a learner's ability (theta, 2PL-lite, one value per subject) on the device and sends it on every `session_end` as `metadata.theta = { "<subject>": ThetaState }`. The backend stores that event in `raw_events` and nothing reads it back, so:

- a new device, a reinstall or a cleared browser starts from the cold start (theta 0) and then sends a *lower-evidence* state that is as good as any other;
- two devices of one learner each hold part of the evidence and cannot see each other's.

Mastery (P(L)) does not have this problem: `technique_states` is stored as `bkt_state_snapshots` and returned by `GET /api/v1/practice/mastery`.

## 2. What the code and schema actually say (verified)

| Fact | Where |
|---|---|
| `user_cognitive_profiles` has flat `theta`, `theta_se` and a `subject_profiles` JSONB whose defaults are `quant: {theta, topic_theta, se}` and `di: {overall_theta, chart_type_theta, se, recent_sets}` | `db/postgres/10_create_core.sql:367-400`, `270_engine_tranche.sql:90` |
| No API code writes any of those columns | grep of `services/api/app`; `tests/test_legal_claims.py:785` asserts it |
| The flat `theta` is read by the duel server and by tournament seeding as `COALESCE(p.theta, 0)` | `routers/internal.py:164-168` (returned as `theta_u`), `tournaments/service.py:86-88`, `apps/game-server/src/duel-room.ts:109` |
| A test fails if any `INSERT/UPDATE user_cognitive_profiles` mentions `theta`, and the privacy notice says the matchmaking ability score is the same for every player | `tests/test_legal_claims.py:785-796`, `docs/release/PRIVACY.md:378-390` |
| `user_cognitive_profiles` rows are not created at registration; every reader uses a `LEFT JOIN` | `internal.py:168`, `tournaments/service.py:88`, `referral/service.py:83` |
| `bkt_state_snapshots.technique_states` is `NOT NULL`, and the reader keeps only each device's newest row | `20_base_telemetry.sql:44-54`, `mastery_read.py:91-106` (`LATEST_PER_DEVICE_SQL`) |
| Snapshot writes happen in the `/sync` handler for newly stored events, with `ON CONFLICT (source_event_id) DO NOTHING` | `routers/sync.py:618`, `685-694`, `270_engine_tranche.sql:66-74` |
| A batch is processed under a per-learner advisory lock, in one transaction | `routers/sync.py:480-482` |
| For a child account `device_id` is dropped (`None`) | `routers/sync.py:485` |
| `ENGINE_SERVER.md`: a snapshot's theta "has no column" and "survives in `raw_events.metadata`" until a writer exists | `docs/backend/ENGINE_SERVER.md:37-38` |
| The latest migration is `270_engine_tranche.sql` | `db/postgres/` |

Two consequences shaped the design:

1. **The flat `theta` column must not be written for this.** Doing so changes who answers first in a duel, how hard a duel problem is, and tournament seeding, and makes the published privacy sentence untrue. The design document (`ENGINE_TRANCHE_DESIGN.md`, Q31) says "write both"; that is a product decision with a privacy-text change, listed in section 4, and is **not** part of this proposal.
2. **Theta must not travel as its own snapshot row.** `technique_states` is `NOT NULL`, and a theta-only row would be a device's newest row, hiding that device's techniques from the reader.

## 3. Design

### 3.1 Storage: a new table, nothing existing changes

```sql
-- db/postgres/280_learner_ability.sql
CREATE TABLE IF NOT EXISTS learner_ability (
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id        VARCHAR(100) NOT NULL DEFAULT '',          -- '' when none was sent, and always for a child account
    subject          VARCHAR(10)  NOT NULL CHECK (subject IN ('quant', 'di')),
    state            JSONB        NOT NULL,                     -- {subject, theta, se, n, responses:[{problemId,a,b,correct}]}
    client_timestamp BIGINT       NOT NULL,                     -- device time of the session_end that wrote it (UNIX ms)
    source_event_id  UUID         NOT NULL,                     -- the session_end event that wrote it
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, device_id, subject)
);
```

- One current state per learner, per device, per subject. It is the *latest* state, not a history.
- `ON DELETE CASCADE` means account deletion removes it with the rest of the learner's rows.
- It is new, so it is backward compatible. There is nothing to backfill, because nothing was stored. (An optional one-off backfill could read `raw_events.metadata -> 'theta'` of stored `session_end` events; not verified, and the table is partitioned on `client_timestamp`.)

### 3.2 Write path (sketch, `routers/sync.py`)

Collect while the events are processed, write after the snapshots, in the same transaction and under the same advisory lock:

```python
# next to `snapshots: list[...] = []`
abilities: list[SyncEvent] = []

# inside the per-event loop, next to the snapshot collection (sync.py:618)
if inserted and event.event_type == "session_end" and isinstance(event.metadata.get("theta"), dict):
    abilities.append(event)

# after the bkt_state_snapshots inserts (sync.py:694), same cursor
for event in sorted(abilities, key=lambda e: e.client_timestamp):
    for subject, state in _valid_ability(event.metadata["theta"]):          # drops unknown subjects, bad shapes
        await cur.execute(
            """INSERT INTO learner_ability
                   (user_id, device_id, subject, state, client_timestamp, source_event_id)
               VALUES (%s, %s, %s, %s, %s, %s::uuid)
               ON CONFLICT (user_id, device_id, subject) DO UPDATE
                  SET state = EXCLUDED.state,
                      client_timestamp = EXCLUDED.client_timestamp,
                      source_event_id = EXCLUDED.source_event_id,
                      updated_at = NOW()
                WHERE EXCLUDED.client_timestamp >= learner_ability.client_timestamp""",
            (user["id"], device_id or "", subject, json.dumps(state), event.client_timestamp, event.event_id),
        )
```

`_valid_ability(theta)` (new, pure, unit-testable):

- accept only the keys `quant` and `di`; **anything else is dropped, never mapped to a subject**;
- `state` must be an object with finite `theta` in [-3, 3], finite `se` > 0, integer `n` in [0, 200], and `responses` a list of at most 200 objects `{problemId: str, a: 0.5..2.5, b: finite, correct: bool}`; a state failing any check is skipped (the event itself is still stored: this must never reject a `session_end`);
- reject a state whose `n` disagrees with `len(responses)`.

Why it is safe:

- **Idempotent.** Only an event stored just now (`inserted`) is collected, so a resent event writes nothing, and the same event cannot apply twice.
- **No regression.** The `WHERE EXCLUDED.client_timestamp >= ...` clause means a delayed older batch cannot overwrite a newer state. Equal timestamps overwrite with the same content.
- **No race.** Batches of one learner are serialised by the existing advisory lock; two devices write different primary-key rows anyway.

### 3.3 Read path (sketch, `mastery_read.py`)

```python
ABILITY_SQL = """
    SELECT subject, device_id, client_timestamp, updated_at, state
    FROM learner_ability WHERE user_id = %s::uuid
    ORDER BY subject, client_timestamp DESC
"""

async def read_ability(conn, user_id: str) -> dict:
    rows = await (await conn.execute(ABILITY_SQL, (user_id,))).fetchall()
    out: dict[str, list[dict]] = {}
    for subject, device_id, client_ts, updated_at, state in rows:
        out.setdefault(subject, []).append(
            {"device_id": device_id or None, "as_of": _iso(updated_at), "state": state})
    return out

# read_mastery(conn, user_id): view["theta"] = await read_ability(conn, user_id)
```

`GET /api/v1/practice/mastery` (additive; older clients ignore the new key):

```jsonc
{
  "technique_states": { "...": "..." },
  "selection": { "...": "..." },
  "as_of": "2026-11-06T10:00:00Z",
  "devices": 2,
  "theta": {
    "quant": [
      { "device_id": "6f1c...", "as_of": "2026-11-06T10:00:00Z",
        "state": { "subject": "quant", "theta": 0.88, "se": 0.78, "n": 3,
                   "responses": [ { "problemId": "t1", "a": 1.0, "b": 0.0, "correct": true } ] } },
      { "device_id": "a93d...", "as_of": "2026-11-04T09:12:00Z", "state": { "...": "..." } }
    ]
  }
}
```

Nothing in `theta` is averaged or merged on the server, the same rule `mastery_read.py` states for P(L) ("never merge P(L) directly", VMSG:281). A learner with no stored ability gets `"theta": {}`.

### 3.4 Subject

The table accepts `quant` and `di` because the client names the subject. Practice items carry no subject today, so the app sends `quant` only and a `di` row will not exist until items carry one. **Required for Data Insights:** a canonical `subject` (`quant` | `di`) on each `:Skill` (or item) returned by `/practice/catalog` and `/practice/session`. This proposal does not infer it from the skill name or the exam.

## 4. Decisions needed from the owner

| # | Decision | Default in this proposal |
|---|---|---|
| D1 | Write the flat `user_cognitive_profiles.theta` as well (design Q31)? It changes duel turn order, duel difficulty and tournament seeding, and needs the Duels privacy sentence and `test_legal_claims` updated | **No.** Practice ability lives in `learner_ability` only |
| D2 | Store ability for child accounts (under 13)? Technique snapshots are stored for them already; ability is the same class of data | Store, with `device_id ''` (as snapshots do) and no other difference. Skip entirely if policy says so: one condition in `_valid_ability`'s caller |
| D3 | Privacy notice: practice ability is a new stored item ("an ability estimate used to choose practice difficulty"). Its wording and where it is listed | Needs a notice update before release |
| D4 | Cross-device combination happens in the client (union of responses, then the engine's `refitTheta`) rather than on the server | Client side, as for the engine's other estimators, so the server needs no copy of the IRT code (the Python parity port, W1-9, is not required) |
| D5 | Retention of `learner_ability` | Keep the latest state while the account exists (cascade on delete) |

## 5. Backend tests to add (style of `tests/test_sync_engine.py`)

1. Migration 280: the table, its columns and types, the subject check and the primary key (`_columns("learner_ability")`).
2. A stored `session_end` with `theta: {quant: <valid>}` writes one row with the device id, timestamp and source event.
3. The same batch sent twice writes nothing the second time (and `duplicates` counts it).
4. An older `client_timestamp` arriving later does not overwrite a newer row; an equal one does.
5. An unknown subject (`"varc"`, `"Quant"`) is dropped and the event is still accepted.
6. Invalid states are skipped without rejecting the event: theta 5, `n` not equal to the number of responses, 201 responses, a non-boolean `correct`.
7. A child account writes with `device_id = ''`.
8. `GET /practice/mastery` returns `theta` per subject, newest first, and `{}` for a learner with none; the existing keys are unchanged.
9. A theta-only batch (no `technique_states`) does not create a snapshot row and does not change `technique_states` in the read.
10. `test_legal_claims` still passes (nothing writes `user_cognitive_profiles.theta`), and deleting the user removes the rows.

## 6. Rollout and compatibility

- Additive on both sides: older apps keep sending `metadata.theta` into `raw_events` as now and ignore the new response key; the new app keeps working against a backend without the table (it only reads `theta` when present).
- Order: ship migration 280 and the backend change, then the app change in section 7. No data migration, no flag required; a kill switch would be one condition around the write.
- Size: a state is at most 200 responses (a few tens of KB). Measure the event-metadata limit before merging; the table only keeps the latest state per device and subject, so growth is bounded by learners x devices x subjects.

## 7. Frontend follow-up (small, after the backend ships)

- `services/learner.ts` `loadAbility` also reads `theta` from the already-fetched `/practice/mastery` snapshot (`loadMasterySnapshot` returns it), and merges: union of `responses` from the local state and every remote state by `problemId` (first attempt wins, as `recordResponse` already requires), keep the latest 200, then `restoreTheta` (which refits through the engine). The merged state is also what `commitAbility` stores.
- Tests: two devices with disjoint responses combine; a duplicate problem counts once; a remote state with a bad shape is ignored; no `theta` in the response leaves the local behaviour unchanged.

## 8. Not covered

- The flat-column and duel questions (D1) and the privacy notice wording (D3).
- A Python port of the IRT code on the server (not needed with D4).
- Data Insights ability, until items carry a subject (3.4).
- Server-side calibration of item parameters (a separate part of the design, `item_irt_params`).
