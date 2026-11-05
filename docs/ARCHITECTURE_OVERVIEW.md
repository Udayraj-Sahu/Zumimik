# Architecture overview

Verified against the source on 2026-11-06 (branch `feature/backend-integration`). Every status below was checked in code, not inferred from a file name.

Status words: **Complete** (works end to end and is tested), **Partial** (exists, not fully integrated), **Not implemented**, **Blocked** (needs a backend change).

## 1. Layers

```mermaid
flowchart TB
  subgraph Pages["Pages (src/app/(app)/*)"]
    LEARN["/learn  (tabs: Explore, Adaptive Learning, Mock)"]
    PRACTICE["/learn/practice  Guided Practice"]
    EXPLORER["/learn/explorer"]
    TECH["/learn/technique/[id]  Lessons"]
    WARMUP["/learn/warmup"]
    SPRINT["/play/sprint + /play/configure-sprint"]
    RES["/play/sprint/results (+ /analysis)"]
    DASH["/dashboard"]
    SOCIAL["/play/daily, /play/ghosts, /dashboard/friends ..."]
    SETTINGS["/settings/* (history, reports, planner, profile)"]
  end
  subgraph State["State"]
    ZS["Zustand stores (persisted: auth, onboarding, resume, habits, plan, settings ...)"]
    RQ["TanStack Query hooks (src/hooks/queries/*)"]
  end
  subgraph Domain["Domain services (src/services/*)"]
    LEARNER["learner.ts  learner persistence + reconcile"]
    PRAC["practice.ts  session orchestration"]
    TEL["telemetry.ts  events + sync"]
    OTHER["dashboard, analytics, reports, friends, daily, ghosts ..."]
  end
  subgraph Engine["Learner model (src/lib/learning/* + src/vendor/psychometrics)"]
    ENG["BKT, IRT, allocator, scheduler, calibration, fatigue, CLR"]
  end
  subgraph Local["On the device"]
    DEX[("Dexie: eventQueue, dashboardCache, feedbackQueue")]
    LS[("localStorage: learner keys + zustand persist")]
  end
  API[("Backend /api/v1 and /api")]
  Pages --> RQ --> Domain
  Pages --> ZS
  Domain --> Engine
  Domain --> DEX
  Domain --> LS
  Domain --> API
```

## 2. Feature map

| Feature | Route | Uses the shared learner model? | Status |
|---|---|---|---|
| Guided Practice | `/learn/practice` | Yes: hydration, planner, BKT, IRT, review book, fatigue/CLR, sync | **Complete** |
| Timed Sprint | `/play/sprint` | Yes for session planning and result sync (BKT, per-subject IRT, review book). The engine's fatigue checkpoints are recorded for later analysis only: a timed simulation is never interrupted (no break, hint or reordering) | **Complete** |
| Sprint Results | `/play/sprint/results` | Yes: shows the mastery change the pipeline computed, plus the next step | **Complete** |
| Sprint Analysis | `/play/sprint/results/analysis` | Partly: accuracy by technique and difficulty from the session, with each technique's engine label beside it. It does not show history trends | **Partial** |
| Topic Explorer | `/learn/explorer` | Yes: Fractured / Fragile / Fluid labels on technique nodes and in the mastery panel. Bank sub-topics have no skill mapping and stay unlabelled | **Partial** (backend mapping) |
| Technique Lessons | `/learn/technique/[id]` | Yes when the page resolves a skill (existing unambiguous name match): a progress panel with the engine's label, last practice, the label changes recorded on this device, advice and a technique-only practice link | **Complete** at component level; the skill match should be replaced by a backend mapping (T3) |
| Adaptive Learning tab | `/learn?mode=adaptive` | Yes: warm-up, progress, next step, revision, personalised mix, today's plan (engine-driven in real mode) | **Complete** |
| Topic mastery in the tab's dashboard | same | Reads the same persisted snapshot through a display mapping (`mapBackendMastery`), not through the engine | **Partial** |
| Dashboard | `/dashboard` | No: server-computed `/dashboard/*` data | **Not integrated** (by design: it shows behaviour and server summaries) |
| Global sync indicator | all signed-in screens | Reads the real Dexie queue and the network: Synced, Syncing, Offline, Waiting to sync, Needs attention (with the server's reasons). It can only retry, never delete | **Complete** (web test environment); not run on Android |
| Mastery timeline | lesson panel | Local record of label changes (Dexie `masteryHistory`), one row per session and technique, never rebuilt from the snapshot | Local **complete**; shared history **Blocked** (T6) || Analytics, Reports, History | `/settings/*` | No: server data (`/dashboard/stats`, `/mocks/history`) | **Not integrated** |
| Habit tracking | stores/habit-store | Separate on purpose (a test pins that it never imports the learner model) | **Complete** (separation) |
| Social competition (daily, ghosts, friends, leaderboard) | `/play/*` | Separate on purpose (same test) | **Complete** (separation) |

## 3. What is not what it looks like (stale or misleading code)

- `src/lib/adaptive/engine.ts` (`applyOutcome`, `difficultyFor`, `lengthFor`) is a **mock-mode heuristic**. In real mode only `recommendPlan` (mock rhythm and time budget) is still used, and only as the fallback when the learner's history cannot be read.
- `src/stores/adaptive-store.ts` (`zuzumik-adaptive`) is legacy mock-era state with no production reader (only cleared on reset); it stays because its store tests still use it.
- `recordAdaptiveSession` and `recordMockAdaptiveSession` had no callers and were removed.
- `src/lib/mock/*` is development-only fixture data (`NEXT_PUBLIC_API_MOCK=true`).

See `ARCHITECTURE_GAPS.md` for the full checklist.
