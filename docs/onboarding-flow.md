# Onboarding flow — component map

How a new user moves through onboarding, screen by screen, with the component that renders each part. Source of truth for the wiring is `src/components/onboarding/onboarding-modal.tsx`.

## Entry

- `src/app/(app)/dashboard/page.tsx` — if `useOnboardingStore().isOnboarded` is false, the dashboard mounts `<OnboardingModal />` (`src/components/onboarding/onboarding-modal.tsx`).
- `/onboarding` (`src/app/onboarding/page.tsx`) is only a marketing landing page — it does not run this flow.

## 1. The wizard (`OnboardingModal`)

Five steps, in order (`resolvedSteps`):

| # | Step id | Label | Component | Notes |
|---|---------|-------|-----------|-------|
| 1 | `name` | Name | `StepName` | free text |
| 2 | `persona` | Who | `StepSingleSelect` + `PERSONA_OPTIONS` | Student / Working Professional / Job Seeker / Parent / Educator / Other |
| 3 | `goal` | Goal | `StepGoal` + `GOAL_OPTIONS` | "What brings you here?" — this step triggers the intros |
| 4 | `triggers` | Vibe | `StepTriggers` + `TRIGGER_GROUPED` | multi-select tags |
| 5 | `details` | Details | `StepDetails` | sex + DOB |

Finish → `handleFinish()` → "You're all set" screen → auto-exit → dashboard.

## 2. Goal step → intro branch (`StepGoal`)

Selecting a goal opens an inline `GoalPanel`:

- **Exam goals** ("Prepare for CAT" / "GMAT" / "GRE" — `TEMPORAL_GOALS`) → "Select your temporal window" with `TEMPORAL_PANEL_OPTIONS`:
  - **"Taking an exam this year"** (`this_year`)
  - "Whenever I am prepared" (`whenever`)
  - "Not sure yet" (`not_sure`)
- **"Master speed math"** → "What's your goal with speed math?" (`VEDIC_USE_CASES`).
- "Help with school stuff" / "Just exploring" — no panel.

Picking a temporal window calls `handleTemporal()` → `setFeatureHookVariant(v)` → **`FeatureIntro` opens as a full-screen overlay immediately** (the wizard pauses underneath). Picking a Vedic use case calls `handleVedicUseCase()`.

## 3. `FeatureIntro` (`src/components/onboarding/intros/feature-intro.tsx`)

Shared hook screen for every variant (`this_year` | `whenever` | `not_sure` | `vedic`). Body:

- Protocol pill (Sparkles icon)
- Hero headline + sub
- **"What is included"** section → `<IncludedCarousel />`
- **"Core systems"** section → `<SystemCarousel />` (on mobile Core systems renders above What's included)
- CTA "Enter Zuzumik"

`onDone` → `featureHookDone()` branches by variant:

| Variant | Next screen |
|---------|-------------|
| `this_year` | **`ArenaIntro`** |
| `whenever` / `not_sure` | **`PitchIntro`** |
| `vedic` | **`FamilyHubIntro`** |
| anything else | back to the wizard (`goNext()`) |

Vedic use-case branch (before FeatureIntro): "Lightning Mental Calc" / "Brain Gym" → FeatureIntro `vedic`; "Teaching My Kid" / "Competitive Exam" → `FamilyIntro`.

## 4. Arena path (exam this year)

### `ArenaIntro` (`src/components/onboarding/intros/arena-intro.tsx`)

Thin wrapper around `<IntroCarousel layout="split" />` (`src/components/onboarding/intros/intro-carousel.tsx`) with `useArenaIntroSlides()`. Slides, in order:

| # | Tag | Body component |
|---|-----|----------------|
| 01 | ACTIVE LANES | `<HeroCard />` (`hero-card.tsx`) |
| 02 | FEATURES | `<FeatureList />` (`feature-list.tsx`) |
| 03 | SPONSOR REEL | `<StockVideoAd src="/media/stock-ad.mp4" poster="/media/stock-ad-poster.webp" />` |
| 04 | SPEED (only when upcoming exams exist) | `<SpeedCard />` (`speed-card.tsx`) |
| 05 | HABIT | `<HabitProtocol />` (`habit-protocol.tsx`) |
| 06 | REVIEWS | `<ReviewCarousel />` (`review-carousel.tsx`) |
| 07 | HOW IT WORKS | `<HowItWorks />` (`how-it-works.tsx`) |

Split (desktop) layout: carousel on the left, **`<ClearanceTiers />`** pricing panel + "ENTER … ARENA" CTA + "Skip for now" on the right (`lg:overflow-y-auto`, scrollbar hidden). `onClose` → **`PlanIntro`**.

### `PlanIntro` (`src/components/onboarding/intros/plan-intro.tsx`)

Paywall. `<PlanSelector />` (plans `initiate` / `single-lane` / `dual-lane`), annual/monthly billing toggle, UPI/wallet/card `PayRow`s. `onClose` → **`StoryIntro`**.

### `StoryIntro` (`src/components/onboarding/intros/story-intro.tsx`)

"DECODE YOUR DAY" — single screen around `<DecodeDay />`:

- "Where does time slip away?" — six collapsible `DdGroupCard`s: **Commute 🚇, Breaks ☕, Waiting ⏳, Work gaps 💼, Home 🏠, Weekend 📝** (all start collapsed)
- Per-slot time editing via `DdSheet` + `DdWheel`, `DdDayChips`
- Voice input (speech recognition), hourly nudge, tracking toggles
- "Lock in" → saves the commitment + schedules notifications → `onClose` → `goNext()` back into the wizard (step 4, `triggers`)

## 5. Pitch path (whenever / not sure)

### `PitchIntro` (`src/components/onboarding/intros/pitch-intro.tsx`)

Same `IntroCarousel` shell, curated by `usePitchIntroSlides()` (`PITCH_SLIDE_ORDER`):

| # | Tag | Body component |
|---|-----|----------------|
| 01 | TACTICAL EFFICIENCY | `<StopFeeding />` |
| 02 | MANIFESTO | `<Manifesto />` |
| 03 | SPONSOR REEL | `<StockVideoAd />` (reused Arena slide) |
| 04 | COMPOUND EFFECT | `<CompoundChart isActive={…} />` |
| 06 | REVIEWS | `<ReviewCarousel />` (reused) |
| 07 | HOW IT WORKS | `<HowItWorks />` (reused) |

`onClose` → **`PlanIntro`** → **`StoryIntro`** (same tail as the Arena path).

## 6. Vedic / family path

| Order | Component | File |
|-------|-----------|------|
| 1 | `FamilyIntro` (slides 1–5) | `family-intro.tsx` |
| 2 | `FamilyHubIntro` | `family-hub-intro.tsx` |
| 3 | `SeatBuilderIntro` (`SeatBuilderSelector`) | `seat-builder-intro.tsx` |
| 4 | `StoryIntro` | `story-intro.tsx` |

Wiring in `onboarding-modal.tsx`: FeatureIntro(vedic) → `FamilyHubIntro` → `SeatBuilderIntro` → `StoryIntro`.

## 7. Skip behaviour

Every intro has a "Skip for now" → `handleSkipIntro()` in `onboarding-modal.tsx`: clears goal/temporal/vedic/targetExam, marks all hook-seen flags, `finishOnboarding()`, closes — no "You're all set" screen; the user lands on the dashboard and Learn asks for a goal later via `AdaptiveReprompt`.

## 8. Re-entry hooks (post-onboarding, on the dashboard)

`dashboard/page.tsx` effect — after onboarding, if a hook flag was missed it re-opens the matching intro once:

1. `!planHookSeen` → `PlanIntro`
2. exam lane + `temporalWindow === "this_year"` + `!arenaHookSeen` → `ArenaIntro`
3. exam lane + (`whenever` | `not_sure`) + `!pitchHookSeen` → `PitchIntro`

## Summary chain

```
Dashboard (not onboarded)
 └─ OnboardingModal: name → persona → goal
     └─ goal picked (exam) + temporal window
         └─ FeatureIntro (variant)
             ├─ this_year      → ArenaIntro → PlanIntro → StoryIntro → wizard (triggers → details) → done
             ├─ whenever/not_sure → PitchIntro → PlanIntro → StoryIntro → wizard → done
             └─ vedic (mental calc) → FamilyHubIntro → SeatBuilderIntro → StoryIntro → wizard → done
```

## Current slide sets (what the code uses now)

The two tables above describe the original wording; this section records the
slide sets as they actually ship today, without changing the history above.
Both flows read the same module-scope slide objects in
`src/components/onboarding/intros/intro-carousel.tsx`; only the order lists differ
(`useArenaIntroSlides` builds its array in place, `PITCH_SLIDE_ORDER` selects
by id).

### Arena — `useArenaIntroSlides()` (7 slides)

| # | Tag | Body component | Notes |
|---|-----|----------------|-------|
| 01 | FIRST 3 SECONDS | `<FirstGhostCta />` (`src/components/first-ghost-cta/FirstGhostCta.tsx`) | `full` + `fill`; only rendered while at least one lane exists |
| 02 | FIRST MOVE | `<FirstMoveTimes />` (`first-move-times/FirstMoveTimes.tsx`) | `FIRST_MOVE_SLIDE`, same object the Pitch uses |
| 03 | SPONSOR REEL | `<StockVideoAd src="/media/stock-ad.mp4" poster="/media/stock-ad-poster.webp" />` | `bare` |
| 04 | THE TRAP | `<TrapResults />` (`trap-results/TrapResults.tsx`) | `TRAP_RESULTS_SLIDE`, same object the Pitch uses |
| 05 | THE STALL | `<StallTimer isActive={…} />` (`stall-timer/StallTimer.tsx`) | `STALL_TIMER_SLIDE`; count-up runs only while active |
| 06 | REVIEWS | `<ReviewCarousel />` (`onboarding/review-carousel.tsx`) | |
| 07 | HOW IT WORKS | `<HowItWorks />` (`onboarding/how-it-works.tsx`) | |

Removed from the Arena set: `FEATURES` (`FeatureList`), `SPEED` (`SpeedCard`,
which also dropped the `useDashboardData().upcoming` lookup) and `HABIT`
(`HabitProtocol`). Those components still exist but are no longer mounted by
either intro.

`FirstGhostCta` props: `title`, `tagline`, `stats` (tuple of
`{ value, label, tone: "bad" | "good" }`), `points`, `note`. It renders no CTA
and no quote; the shell's own "ENTER … ARENA" button is the only action.

### Pitch — `usePitchIntroSlides()` / `PITCH_SLIDE_ORDER` (6 slides)

| # | Tag | Body component | Notes |
|---|-----|----------------|-------|
| 01 | TACTICAL EFFICIENCY | `<AlgorithmPitch />` (`algorithm-pitch/AlgorithmPitch.tsx`) | `stop-feeding` |
| 02 | FIRST MOVE | `<FirstMoveTimes />` | `manifesto` |
| 03 | SPONSOR REEL | `<StockVideoAd />` | reused Arena slide |
| 04 | THE TRAP | `<TrapResults />` | `compound-chart` |
| 05 | THE STALL | `<StallTimer isActive={…} />` | `stall-timer` |
| 06 | TRIAL | `<TrialTimeline />` (`trial-timeline/TrialTimeline.tsx`) | `trial-timeline`; reuses `<ReviewCarousel showSummary={false} compact />` for its review marquee |

`REVIEWS` and `HOW IT WORKS` are not part of the Pitch order.

### Shell contract used by the slides

- `body` may be a node or `(isActive: boolean) => ReactNode`; only the active
  slide gets `isActive === true`.
- `full: true` means the slide owns its card surface (no carousel header);
  `fill: true` adds `self-stretch`; `bare: true` is full-bleed (the sponsor
  video).
- Inactive slides render with `aria-hidden="true"` — tests must query with
  `{ hidden: true }` or plain text queries.
- The shell CTA ("ENTER … ARENA") calls `exit(onClose)`; there is no in-slide
  CTA wiring today.

## Folder layout (`src/components/onboarding`)

Flat list → three role-based folders; `onboarding-modal.tsx` stays at the root
as the entry point.

```
onboarding/
├── onboarding-modal.tsx      wizard + step machine, branches to every intro
├── intros/                   full-screen intro screens
│   ├── arena-intro.tsx       exam-this-year path
│   ├── pitch-intro.tsx       whenever / not-sure path
│   ├── plan-intro.tsx        paywall
│   ├── story-intro.tsx       decode-your-day (+ .module.css)
│   ├── feature-intro.tsx     every variant's hook screen
│   ├── family-intro.tsx      vedic family path
│   ├── family-hub-intro.tsx
│   ├── seat-builder-intro.tsx
│   └── intro-carousel.tsx    shared carousel shell + both slide lists (+ .test)
├── slides/                   bodies rendered inside the carousel
│   ├── hero-card.tsx         legacy opener (no longer mounted)
│   ├── feature-list.tsx      legacy Arena slide (no longer mounted)
│   ├── habit-card.tsx
│   ├── habit-protocol.tsx    legacy Arena slide (no longer mounted)
│   ├── speed-card.tsx        legacy Arena slide (no longer mounted)
│   ├── how-it-works.tsx      (+ .module.css)
│   └── review-carousel.tsx   (+ .module.css)
└── auth/
    ├── auth-modal.tsx
    └── auth-panel.tsx
```

Imports always use the `@/components/onboarding/<folder>/<file>` form, so the
only relative import left is `story-intro.tsx` → `./story-intro.module.css`.
Tests sit next to their component in the same folder.
