# Architecture gaps

Status as of 2026-11-06. P0 data integrity or correctness, P1 core or adaptive integration, P2 learning experience, P3 UI and documentation.

**Fixed** means the code is changed and a test that was executed covers it. **Open** items name what is missing. **Blocked** needs a backend change (details in `FRONTEND_BACKEND_INTEGRATION.md` section 5).

## Fixed in this pass

| Pri | Gap | Fix | Evidence |
|---|---|---|---|
| P0 | `/sync` answers 200 and lists events it rejected, and the client deleted the whole batch | `settleAcknowledged` parks rejected events with their reason in the same Dexie transaction that deletes the batch; they are not retried and not replayed into the learner state | `sync-rejections.test.ts` (7) |
| P0 | Deleting an account left queued unsynced events and all learner data on the device (`purgeUserData` existed but nothing called it) | Account deletion calls `purgeUserData` (that learner's events and learner keys, nobody else's); logout and expired sessions deliberately keep them | `purge-user-data.test.ts` (3), `delete-account.test.tsx` |
| P1 | No `device_id` was sent, so the server could not keep devices' snapshots apart and an offline device could overwrite another's newer technique state | A stable per-install id travels with every `/sync` | `device-id.test.ts` (4) |
| P1 | The Adaptive tab's plan ranked techniques by percentage and chose difficulty from mastery thresholds, which also overrode the learner's ability | In real mode the plan comes from the engine (`enginePlan`, `recommendSteps`); difficulty is left to the ability estimate; the earlier heuristic is only the fallback when history cannot be read | `session-views.test.ts`, `use-today-plan.test.tsx` |
| P1 | Sprint Results showed no mastery change | `SessionChangeCard`: per technique, accuracy of this session beside the engine's before and after label, computed once inside the sync pipeline from the states that are persisted | `learner-model-features.test.tsx` |
| P2 | Sprint Analysis listed wrong answers only: no technique or difficulty view, no mastery context | `SessionBreakdownCard`: accuracy by technique and difficulty, average time, each technique's mastery label beside it (kept apart) | `learner-model-features.test.tsx`, `session-views.test.ts` |
| P2 | Adaptive widgets were scattered (dashboard, explorer) | Warm-up, progress, next step, revision and the personalised mix live in the Adaptive Learning tab; a test pins who may import them | `session-views.test.ts` |

Earlier in this work (also tested): stale-snapshot race (event-sourced reconcile, lock, ordered idempotent queue), actual per-answer timestamps with a labelled fallback, BKT/IRT/allocation/session composition, calibration, spaced repetition, fatigue and CLR in Practice, Explorer mastery labels, technique-only practice.

## Open

| Pri | Gap | Why it is open |
|---|---|---|
| P1 | **Blocked:** IRT theta is not recovered on a new device | The API neither stores nor returns theta. Proposed backend change in `FRONTEND_BACKEND_INTEGRATION.md` 5.1 |
| P1 | **Blocked:** Quant and Data Insights are not separated | Practice items carry no subject; all items are `quant` (5.2) |
| P1 | **Blocked:** bank sub-topics cannot show techniques or mastery | No sub-topic to skill mapping (5.3) |
| P1 | Dashboard, Analytics, Reports and History do not read the learner model | They show server-computed `/dashboard/*` and `/mocks/*` data. This is by design for behaviour and results, but mastery there (`/dashboard/topics`, `mapBackendMastery`) is a second mapping of the same snapshot, not the engine's states |
| P2 | Technique Lessons show no mastery label and no recommendation | They only link into practice by skill and level |
| P2 | Timed Sprint is not watched for fatigue | Different, timed format; not designed |
| P2 | Analytics has no mastery progression over time | The app stores only the latest hydrated state per technique, not a history of it. A series needs either server snapshots exposed through an API or a local history store |
| P2 | `cognitive-load.ts` is vendored but unused | No per-question load is supplied to the controller |
| P2 | **Blocked:** calibration baseline, priors, active path and review entries are per device | No write or read route (5.4, 5.5) |
| P2 | Practice sessions are not resumable | The fatigue/CLR state is therefore session-scoped |
| P3 | Offline and sync status is not shown to the learner | Only the practice screen shows a saved / queued state; there is no global indicator and no view of parked events |
| P3 | Legacy code remains | `lib/adaptive/engine.ts` (`applyOutcome`, `difficultyFor`, `lengthFor`), `stores/adaptive-store.ts` and `recordAdaptiveSession` (no callers) |
| P3 | Not run | No Android device, no live backend, no multi-device run. Cross-device behaviour is covered only against a fake server that merges the way `mastery_read.py` does |

## Stale documentation

- The older reports and audits (the `EXAM_ARENA_*` files at the repository root, `FRONTEND_INTEGRATION_CHANGELOG.md`, and the files that were under `docs/`, including `ADAPTIVE_ENGINE_INTEGRATION.md`) are deleted in the working tree. That deletion was not made by this pass. They remain in git history (for example `git show 8861bf9:docs/ADAPTIVE_ENGINE_INTEGRATION.md`) and were not restored, because the removal may be intentional.
- These five documents (`ARCHITECTURE_OVERVIEW.md`, `ADAPTIVE_LEARNING_ARCHITECTURE.md`, `ANSWER_LIFECYCLE.md`, `FRONTEND_BACKEND_INTEGRATION.md`, `ARCHITECTURE_GAPS.md`) are the current description. Anything older that says Sprint or Practice sync only `problem_attempt` and `session_end` without `technique_states` is out of date.
