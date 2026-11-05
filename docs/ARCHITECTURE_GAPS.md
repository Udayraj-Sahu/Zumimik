# Architecture gaps

Updated 2026-11-06 (branch `feature/backend-integration`). P0 data integrity or correctness, P1 core or adaptive integration, P2 learning experience, P3 UI and documentation.

**Status words.** *Complete and tested*: works end to end and an executed test covers it. *Implemented, not integration-tested*: code and unit tests exist, no run against the real backend or a device. *Partial*. *Blocked by backend*: needs a backend change (see `BACKEND_TEAM_HANDOFF.md`). *Not implemented*.

**Test evidence (executed on this machine).** Baseline before this pass: 889 passed, 13 failed (12 onboarding component tests that fail independently of this work, plus one intermittent test of mine that exposed a real bug, fixed below). After: **959 passed, 12 failed** on two consecutive full runs; the 12 are the same onboarding tests (`intro-carousel`, `review-carousel`, `stall-timer`). `tsc --noEmit` clean. `next build` compiles all 93 pages. **Not run:** the backend's own tests, any staging call, an Android device or emulator, a real two-device session.

## 1. Gap audit

| ID | Pri | Current behaviour (verified) | Missing / wrong | Files and functions | Team | Acceptance tests | Status |
|---|---|---|---|---|---|---|---|
| G1 | P0 | After a batch was acknowledged, the 60 s snapshot cache could still serve the older server snapshot, and the offline "last good snapshot" predated it; acknowledged events had left the queue, so a session vanished from the learner's state until the next online read | Cache and remembered snapshot ignored acknowledgements | `services/learner.ts` (`loadMasterySnapshot`, cache keyed by `ackGeneration()`), `services/offline/sync.ts` (`settleAcknowledged` bumps the generation and advances the snapshot), `lib/learning/snapshot-memory.ts` | Frontend | `learner-sync.test.ts` "P0" block (6), `snapshot-memory.test.ts` (4): queued then online session, snapshot or flush failing, background flush, offline restart after ack, mixed accepted and rejected | **Complete and tested** |
| G2 | P0 | `/sync` answers 200 with a per-event `rejected` list; the client deleted the whole batch | Rejected events lost | `offline/sync.ts` `settleAcknowledged` (one Dexie transaction: delete batch, park rejected) | Frontend | `sync-rejections.test.ts` (9) | **Complete and tested** |
| G3 | P0 | Account deletion left queued events, learner data and (now) mastery history on the device | `purgeUserData` was never called | `lib/platform/reset-app-state.ts`, `settings/page.tsx`, `lib/learning/storage-keys.ts` | Frontend | `purge-user-data.test.ts` (3), `delete-account.test.tsx` | **Complete and tested** |
| G4 | P0/P1 | No `device_id` was sent, so all of a learner's devices looked like one to the server | Cross-device snapshot merge could not work | `offline/device-id.ts`, `sync.ts`, `telemetry.ts` | Frontend, backend verifies | `device-id.test.ts` (4) | Frontend **complete and tested**; backend behaviour **pending verification** (T0) |
| G5 | P1 | Adaptive tab plan ranked by percentage, difficulty from thresholds (overrode the learner's ability); and it flashed the heuristic plan before the engine's | Not from the learner model | `lib/adaptive/engine-plan.ts`, `hooks/queries/use-adaptive.ts`, `lib/learning/mastery-view.ts` (`recommendSteps`) | Frontend | `session-views.test.ts`, `use-today-plan.test.tsx` (3, including the no-flash regression) | **Complete and tested** |
| G6 | P1 | Theta existed for one subject, every item counted as Quant, nothing restored from the server | No per-subject ability, no recovery | `lib/learning/ability-book.ts` (per-subject book, deterministic merge, validated server adapter), `services/learner.ts` (`loadAbilityBook`), `services/practice.ts` (`requestTheta`), `services/telemetry.ts` | Frontend + backend | `ability-book.test.ts` (22), `ability.test.ts`, `backend-adapters.test.ts`. Items with no named subject feed a local-only "unclassified" estimate, are never reported as Quant and never merged into Quant | Frontend **implemented, tested with simulated server data**. Cross-device recovery **Blocked by backend** (T1, T2) and **not verified end to end** |
| G7 | P1 | Bank sub-topics are display-only | No sub-topic to skill mapping | `services/explorer-tree.ts`, `/api/topics` | Backend, then frontend | n/a until the contract exists | **Blocked by backend** (T3); technique labels, deep links and technique-only practice are **complete and tested** |
| G8 | P2 | Per-question cognitive load had no caller | Engine function unused | `lib/learning/wellbeing.ts` (`cognitiveLoadOf`, used by `reorderRemaining`), `telemetry.ts` (`bcl` on each attempt) | Frontend | `wellbeing.test.ts` (valid, missing, boundary, tie-break), `sync-rejections.test.ts` | **Complete and tested**. The engine counts load from the question text itself, so **no backend metadata is needed** (T7) |
| G9 | P2 | Timed Sprint had no fatigue handling | Decision and integration | `hooks/use-wellbeing.ts` (`observeOnly`), `lib/learning/wellbeing.ts` (`observeCheckpoint`), `stores/sprint-store.ts`, `play/sprint/page.tsx`, results page | Frontend | `use-wellbeing.test.tsx` (3): timed mode records the checkpoint and applies no break, hint, reorder or intervention event; normal mode intervenes | **Implemented, tested at hook and sync level**; **not tested through the full Sprint page UI**. Decision: a timed simulation is only observed |
| G10 | P2 | Calibration and review live on the device | No server read or write | `services/calibration.ts`, `services/learner.ts` | Backend | n/a until agreed | **Blocked by backend** (T4, T5); local behaviour **complete and tested** |
| G11 | P2 | Lessons showed no mastery | Panel | `components/technique/technique-mastery-panel.tsx`, `lib/learning/mastery-view.ts` (`adviceFor`) | Frontend | `mastery-history.test.tsx` (5 panel tests: label, last practice, history, advice, direct practice, absent when unreadable, not started) | **Complete and tested** at component level. The lesson page picks its skill with the existing unambiguous name match (`findPracticeSkill`), which a backend mapping should replace (T3) |
| G12 | P2 | No mastery timeline | Local history | `services/mastery-history.ts`, `offline/db.ts` (Dexie v4 `masteryHistory`), `telemetry.ts` | Frontend; shared history backend | `mastery-history.test.tsx` (5 for the service and the real pipeline), `purge-user-data.test.ts` | Local **complete and tested** (only real label changes, one row per session and technique, nothing reconstructed). Shared history **Not implemented / blocked** (T6) |
| G13 | P3 | Offline and sync status only on the practice screen | Global indicator | `components/shell/sync-indicator.tsx`, `hooks/use-sync-status.ts`, `services/sync-status.ts`, `offline/sync-activity.ts` | Frontend | `sync-indicator.test.tsx` (10): every status and transition, counts, reasons, no delete action | **Complete and tested** (web test environment); **not run on Android** |
| G14 | P3 | Dead adaptive code | Cleanup | removed `recordAdaptiveSession` and `recordMockAdaptiveSession` (no callers) | Frontend | build and suites green | **Partial**: `stores/adaptive-store.ts` and `applyOutcome` have no production reader but a store test suite uses them, so they remain, with a note in the file |
| G15 | P3 | Test timing | Cold dynamic imports exceeded Testing Library's 1 s wait under the parallel suite | `vitest.setup.ts` (`asyncUtilTimeout: 5000`) | Frontend | two consecutive full runs | Fixed |

## 2. Backend gap audit (summary)

Full detail, contracts and tests are in `BACKEND_TEAM_HANDOFF.md`.

| Item | Needed | Existing source | Migration | Status |
|---|---|---|---|---|
| T0 | Verify snapshot persistence, size and per-device merge | `sync.py`, `mastery_read.py`, `bkt_state_snapshots` | No | Pending |
| T1 | Persist and return per-subject theta | `user_cognitive_profiles.subject_profiles` (flat `theta` is read by duels and pinned by a privacy test: do not write it) | None (option A) | Not implemented |
| T2 | `subject` on catalog skills and items | no subject exists anywhere in the graph or catalog | Likely | Not implemented |
| T3 | `skills[]` and `reference_ids[]` per sub-topic | three unlinked topic vocabularies | Likely | Not implemented |
| T4 | Calibration read/write | `users.active_path`, `user_cognitive_profiles.ans_baseline_ms`; no API code | One column | Not implemented |
| T5 | Review entries | `sinking_skills` (no writer or reader; no due-date column) | No | Not implemented |
| T6 | Mastery history | `technique_state_transitions` (no writer or reader) | No | Not approved |
| T7 | Structural question metadata | not needed | none | n/a |
| T8 | Stable rejection codes | `sync.py` `_validate_events` | No | Not implemented |

## 3. Dashboard, Analytics, Reports, History

They read server-computed `/dashboard/*` and `/mocks/*` data and are **not** on the learner model. That is deliberate for behaviour and results (XP, streak, mock history), and a test pins that behaviour and competition code never imports the learner model. The Adaptive Learning tab, Sprint Results, Sprint Analysis, the Explorer labels and the Technique Lessons panel do use it. A mastery-over-time view in Analytics needs shared history (T6) or the local timeline above.

## 4. Remaining risks

- Cross-device behaviour is only exercised against a fake server that merges the way `mastery_read.py` reads. The real merge is T0.
- The lesson page's skill match is a name heuristic (pre-existing); until T3 ships it can fail to find a skill (then no panel and no skill practice are offered, which is the safe outcome).
- Android: the same code runs in the WebView, but nothing was executed on a device.
- `docs/ADAPTIVE_ENGINE_INTEGRATION.md` and the older reports (`EXAM_ARENA_*`, `FRONTEND_INTEGRATION_CHANGELOG.md`, the old `docs/` files) are deleted in the working tree. That deletion was not made by this work, they remain in git history, and they were not restored. This set of documents replaces them.
