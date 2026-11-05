# Answer lifecycle

The path of one answer, from the question being chosen to the next adaptive session, traced through the real functions. File paths are under `src/`. Guided Practice (`app/(app)/learn/practice/page.tsx`) is the reference flow; differences for the Sprint are at the end.

## 1. Sequence

```mermaid
sequenceDiagram
  autonumber
  participant UI as Practice page
  participant PR as services/practice.ts
  participant LN as services/learner.ts
  participant PL as lib/learning/session-plan.ts
  participant API as Backend
  participant WB as hooks/use-wellbeing.ts
  participant TL as services/telemetry.ts
  participant DX as Dexie eventQueue

  Note over UI,API: 1 Question selection
  UI->>PR: getPracticeSession(topic, n, difficulty, ..., level)
  PR->>LN: loadLearnerStates (under withLearnerLock)
  LN->>DX: flushEventQueue, then pendingEvents
  LN->>API: GET /practice/mastery (offline: last good copy)
  LN-->>PR: hydrateStates + replay of unacknowledged attempts
  PR->>LN: loadCatalogSkills (GET /practice/catalog)
  PR->>PL: planAdaptiveSession(states, catalog, review book, focus skill)
  PR->>API: POST /practice/session { slots, theta? }
  API-->>PR: items [{template_id, skill, bucket, irt, ...}]
  PR-->>UI: SprintSession (mapBackendPracticeSession, unique, topped up only with the same skill)

  Note over UI: 2 Rendering
  UI->>UI: render question, hint, guided mode

  Note over UI,WB: 3 Answer submission and 4 evaluation
  UI->>UI: handleSelect / handleTextSubmit, checkPracticeAnswer (local), answeredAt = Date.now()
  UI->>WB: reportScored -> onScored (fatigueCheckpoint every 5th scored answer, stepClr)
  WB-->>UI: break overlay, guided hints, reordered remaining questions

  Note over UI,DX: 5 BKT and IRT update, 6 learner-state update, 7 local persistence
  UI->>TL: queueSessionSync(session, result, domain, "practice", extraEvents, onChange)
  TL->>TL: withLearnerLock: buildSessionSyncEvents
  TL->>TL: resolveAttemptTimes -> buildSessionLog (eligible answers only)
  TL->>TL: applyAbility (recordResponse) -> commitAbility (local theta)
  TL->>LN: reconcileLearnerStates (snapshot + pending replay)
  TL->>TL: applySession (rebuildStates / processAttempt) -> technique_states
  TL->>TL: summariseChange, applySessionToSinking -> commitSinkingBook
  TL->>DX: enqueueEventBatch (id = first event id)

  Note over TL,API: 8 Backend sync
  UI->>TL: sendSyncBatch(events)
  TL->>DX: flushQueuedBefore (older batches first)
  TL->>API: POST /sync { events }
  API-->>TL: { accepted, duplicates, rejected: [{event_id, index, reason}], ... }
  TL->>DX: settleAcknowledged (transaction: delete batch, park rejected events)
  TL->>LN: invalidateLearnerCache

  Note over UI,API: 9 Next adaptive session
  UI->>PR: getPracticeSession(...) again, which starts at step 1 with the new state
```

## 2. What counts as a scored answer

`attemptEligibility` (`lib/learning/learner-state.ts`) is the single gate for BKT, IRT, the fatigue watch and the review book. An answer is excluded when it is unanswered, deferred (server-graded: `correct === null`), has no canonical skill id (`skillId`), is sandbox content (`trustStatus === "sandbox"`), or has `feedsMastery === false`. The same problem twice in one list counts once, and IRT counts only the first scored attempt per problem.

## 3. Timestamps

Each answer stores `answeredAt` (device time at submission). `resolveAttemptTimes` is the one source for BKT replay, forgetting decay, IRT order and the `problem_attempt` event stamp:

- usable `answeredAt` (after 2020 and at most 5 minutes ahead of now) is used and labelled `at_source: "actual"`;
- anything else falls back to a reconstructed time (session end minus the durations still to come), labelled `"reconstructed"`;
- times never decrease and never exceed now, so a clock that steps backwards cannot reorder attempts.

Queued events that predate this carry no `skill_id` and are skipped from the local replay (they are still delivered). Their `client_timestamp` is one shared stamp per batch, so they keep their array order.

Every attempt event also carries the engine's `bcl` (base cognitive load) for its question, when the question has text.

## 4. Offline and failure handling

```mermaid
flowchart TD
  A["queueSessionSync: events stored in Dexie before any network call"] --> B{"POST /sync"}
  B -- "network / 5xx / 401 / 408 / 429" --> C["stays queued; replayed locally on top of the last snapshot"]
  C --> D["next flush: oldest batch first"]
  B -- "4xx (not 401/408/429)" --> E["batch parked with the reason, never deleted"]
  B -- "200" --> F{"rejected[] empty?"}
  F -- yes --> G["batch deleted"]
  F -- no --> H["one transaction: delete batch + park the rejected events with their reason"]
  H --> I["parked events are not retried and not replayed into the learner state"]
```

- When a batch is acknowledged, the transaction that removes it also advances the remembered snapshot with that batch's `technique_states` and bumps an acknowledgement counter, so a cached older server snapshot is never used for the next session. An acknowledged session cannot disappear from the learner's state, online or after an offline restart.
- Ability is routed by subject: each eligible answer updates the estimate of the subject the backend named for its item; an item with no subject updates a local-only estimate that is never sent.
- Duplicate delivery is harmless: the server deduplicates on `event_id`, the queue is keyed by the batch's first event id, and the local replay applies each event id once.
- Two sessions finishing together are serialised by `withLearnerLock`, so the second starts from a state that already contains the first.
- A browser or Android restart keeps Dexie and localStorage, so queued events and the remembered snapshot survive; the session itself is not resumable in Practice.

## 5. Sprint differences

`/play/sprint` builds its questions with `getSprintQuestions -> getPracticeSession` (same planner, same request), but answers live in `stores/sprint-store.ts` and are synced from the results page through `syncSprintResult -> queueSessionSync` (same pipeline, same lock). The sprint records the engine's fatigue checkpoints (observe only, handed to the results screen and logged with the result) and never interrupts the learner. An explicit level (Beginner = 2, Advanced = 4) is sent as the matching theta; "Adaptive" sends the learner's own ability.
