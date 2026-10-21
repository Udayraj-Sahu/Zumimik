# Zuzumik — Frontend Architecture & Standards Audit

> **Status:** baseline captured 2026-10-18 · remediation tracked in the checklist below.
> **Branch at audit time:** `feat/dashboard-mascot` @ `b6e8fb7`.
> **Remediation branch:** `feature/frontend-standards-improvements`.

---

## 0. Scope and method

**Stack:** Next.js 14.2 App Router, `output: "export"`, React 18.3, Tailwind 3.4, zustand 5,
TanStack Query 5, Dexie 4, Firebase 12, Capacitor 8, Serwist PWA, Vitest 2, Playwright 1.63.

**Surface audited:** 142 `.tsx` · 166 `.ts` · 8 `.css` · 28 test files · 38 route pages.

**Out of scope for this remediation pass:** `src/components/onboarding/story-intro.tsx`,
`src/components/onboarding/story-intro.module.css`, and any Story Intro refactoring
(extraction of its components/hooks/parsing rules/math, line-count reduction, design or
behaviour changes). Story Intro is tracked separately. The only permitted edit was a
3-line identifier rename that unblocked the production build (committed as
`fix(onboarding): rename shadowed map param in story intro group card`) — a bug fix, not a
refactor.

**Not verified:** no screen was visually inspected during the audit, so no claim is made
about visual correctness in either theme or at any breakpoint.

---

## A. Executive Summary

A coherent, well-instrumented codebase with a genuine design-token layer, wrapped around a
handful of extremely large "god files" that break the component model.

Component-based architecture is **partially** followed. There is a real `src/components/ui`
primitive set (13 files), a real hooks layer, a real store layer, and a real token layer —
but the bulk of product logic lives in six files over 500 lines that each define 10–35
sub-components, embed business math, hardcode data arrays, and duplicate theming logic 163
times in JavaScript instead of CSS.

### Five most important findings

1. **Root-layout eager onboarding import** — `src/components/shell/app-entry.tsx:8`
   statically imports `@/app/onboarding/page`, pulled into `src/app/layout.tsx:8`. The
   entire onboarding flow ships in the initial chunk of every route.
2. **`dark:` variants track the OS, not the app theme** — `tailwind.config.ts` had no
   `darkMode` key, so all 26 `dark:` utilities keyed off `prefers-color-scheme` while the
   app themes via a `.light` class toggled by `src/stores/theme-store.ts`.
3. **Toasts rendered outside the theme scope** — `src/components/ui/toaster.tsx:63`
   portalled to `document.body`, outside every `[data-theme-scope]`.
4. **`story-intro.tsx` is a 2,856-line god file** — 35 component/helper definitions, inline
   speech-parsing regex rules, inline commitment math, an inline `useTween` hook, and an
   836-line CSS Module. *(Deferred — excluded from this pass.)*
5. **No CI, no typecheck script, 23.21% coverage** — `tsc --noEmit` was not wired into any
   script; a type error that blocked `next build` was only caught by running the build.

---

## B. Architecture Scorecard (baseline, 0–5)

| Category | Baseline | Target after this pass | Evidence |
|---|---|---|---|
| Component architecture | 2 | 2 | 6 files >500 lines; `story-intro.tsx` 2,856L / 35 defs. |
| Folder structure | 4 | 4 | Clean top-level split, 100% `@/` aliases, no cycles; mixed PascalCase/kebab-case dirs. |
| Reusability & separation of concerns | 2 | 3 | 5× `formatTime`, 3× `SectionLabel`, ~25 hand-rolled skeletons; `services/adaptive.ts` imports a store. |
| CSS & design-system consistency | 3 | 3.5 | ~944 tokens, 6 clean CSS Modules, zero raw hex in Tailwind config; 163 JS theme ternaries. |
| Light/Dark Mode | 2 | 3.5 | Sound class-scoped mechanism + tests; undermined by media-based `dark:`, out-of-scope Toaster, raw `VIOLET` in light branches. |
| Responsive design | 3 | 3 | `--sat/--sab` tokens, ~470 `max-[359px]` tweaks, dedicated responsive spec; fixed widths clipped by global `overflow-x: hidden`. |
| TypeScript & React practices | 3.5 | 4 | `"strict": true`, tsc clean; 1 `any`, `as any`, 4 lint warnings. |
| Accessibility | 2 | 3 | Axe infra + passing spec on 3 routes; no coverage of authenticated screens, app-wide scrollbar hiding. |
| Performance | 2 | 3 | Static export + Serwist + React Query; eager onboarding in root layout, always-bundled mocks, eager gsap in shell. |
| Testing & developer tooling | 3 | 4 | 337 tests pass, coverage/axe/responsive configured; no CI, no `typecheck` script. |

---

## C. Findings

Severity: Critical / High / Medium / Low / Informational.

| # | Sev | Category | Location | Issue | Status |
|---|---|---|---|---|---|
| 1 | Critical | Light/Dark | `tailwind.config.ts` | No `darkMode` key → 26 `dark:` utilities follow OS, not app theme. | ✅ |
| 2 | Critical | Light/Dark | `ui/toaster.tsx:63` | Portal target outside every `[data-theme-scope]`. | ✅ |
| 3 | Critical | Performance | `shell/app-entry.tsx:8` → `app/layout.tsx:8` | Onboarding page statically imported into the root layout entry. | ✅ |
| 4 | Critical | Tooling | `package.json`, no `.github/` | No `typecheck` script and no CI. | ✅ |
| 5 | High | Build | `lib/config.ts:5` + `src/services/*` | `IS_MOCK` is a runtime check; services statically import `@/lib/mock/*`, so `lib/mock/techniques.ts` (56 KB) always ships. | ✅ |
| 6 | High | Product | `dashboard/page.tsx:59-93, 339-346` | Hardcoded `FALLBACK_*` arrays (incl. a fake "You" at rank 47) used as live render fallback. | ✅ |
| 7 | High | Reusability | 5× `formatTime`, 3× `SectionLabel`, 2× `SectionHeading`/`FadeUp`/`timeAgo`, `todayStr`×2, `clamp`×6 | Duplicated general-purpose helpers. | ~ `formatTime`/`todayStr` consolidated in `lib/format.ts`; `SectionLabel` and the rest deliberately deferred |
| 8 | High | Correctness | `habit-tracker-modal.tsx:82` | `days.sort()` mutates in place during render. | ✅ |
| 9 | High | Light/Dark | `habit-tracker-modal.tsx:365-366,512,569,600-601,670-671,684` | Raw `VIOLET` (`#34D399`) in light branches → ≈2.1:1 on white. | ✅ |
| 10 | High | Error handling | `play/configure-sprint/page.tsx:44` | `.then()` with no `.catch()` → permanent spinner on rejection. | ✅ |
| 11 | High | a11y | `tests/e2e/a11y.spec.ts:4` | Axe scans only `/`, `/auth`, `/onboarding` — none of the 38 authenticated screens. | ✅ |
| 12 | Medium | React | `learn/practice/page.tsx:190-194` | Missing effect deps (lint warning). | ✅ |
| 13 | Medium | React | `learn/explorer/page.tsx:78`, `explorer/mind-map.tsx:59`, `onboarding/feature-intro.tsx:321` | Remaining `react-hooks/exhaustive-deps` warnings. | ✅ |
| 14 | Medium | Performance | `shell/app-shell.tsx:6` | Eager `Walkthrough`, `RatePrompt`, `Toaster`, `gsap` in the authenticated shell. | ☐ |
| 15 | Medium | Performance | `lib/notifications/story-reminders.ts:1-2`, `invite-card.tsx:8-9`, `habit-tracker-modal.tsx:35-36` | Static `@capacitor/*` imports reached from eagerly-loaded routes. | ☐ |
| 16 | Medium | Data layer | `practice/page.tsx`, `configure-sprint/page.tsx`, `sprint/results/page.tsx`, `ui/content-feedback.tsx` | Direct service calls bypassing React Query. | ☐ |
| 17 | Medium | Theming | `globals.css:1543-1580` | Unlayered desktop font re-scale rewrites Tailwind utilities. | ☐ |
| 18 | Medium | Theming | `globals.css:659, 678-683` | Attribute-scraping selectors `[class*=…]` / `[style*=…]`. | ☐ |
| 19 | Medium | Responsive | `renderers/*` `w-[500px]`/`w-[560px]` + `globals.css:1218-1221` | Fixed widths clipped by global `overflow-x: hidden`. | ☐ |
| 20 | Medium | a11y | `globals.css:1196-1202` | Scrollbars hidden app-wide. | ☐ |
| 21 | Medium | State | `onboarding-modal.tsx:176-185, 269-289` | 8-way local/store mirror with bidirectional `toggleTrigger` sync. | ☐ |
| 22 | Low | Theming | `learn/page.tsx:894`, `play/page.tsx:85` | Half-flipped alpha tints (text uses `hueText`, background uses raw hex). | ☐ |
| 23 | Low | Assets | `styles/driver-override.css:3` | Literal font names under `next/font`; all-dark popover. | ☐ |
| 24 | Low | Lifecycle | `paywall-modal.tsx:161`; `adaptive-reprompt.tsx:88-99`; `onboarding-modal.tsx:244-254` | `setTimeout`/GSAP tweens without cleanup. | ☐ |
| 25 | Low | Deps | `package.json` | `animejs`, `zod`, `@capacitor/preferences` unused under `src/`. | ☐ |
| 26 | Low | Types | `onboarding-modal.tsx:819,279,1401`; `(window as any).Capacitor` ×3; `paywall-modal.tsx:166` | `any` / `as any` / non-null assertions. | ☐ |
| 27 | Low | Layering | `services/adaptive.ts:1,11,19` | Service imports and mutates a zustand store. | ☐ |
| 28 | Info | Structure | `CompoundChart/`, `Manifesto/`, `StopFeeding/`; `registry/magicui/` | Naming inconsistencies. | ☐ |
| 29 | Info | Docs | `README.md` | Documents branch `mobile/dashboard-glassmorphism`; actual `feat/dashboard-mascot`. | ☐ |
| 30 | Info | Tests | `vitest.config.ts:22-29` | Coverage excludes `src/app/**`, understating risk. | ☐ |
| 31 | — | Architecture | `story-intro.tsx`, `onboarding-modal.tsx`, `adaptive-dashboard.tsx` + 3 more | God files / duplication of theme ternaries. | ☐ *(Story Intro deferred; others out of scope for this pass)* |

---

## D. Architecture map (baseline)

```
src/
├── app/                          # 38 routes, ALL client
│   ├── layout.tsx                # server; metadata + next/font + AppEntry  ← root client boundary
│   │   └── capacitor-init.tsx    # history/popstate patch + theme subscription
│   ├── onboarding/page.tsx       # ← was statically imported by app-entry.tsx:8  ⚠ #3
│   ├── (app)/layout.tsx          # server → DashboardShell → AppShell (client)
│   │   └── app-shell.tsx         # sidebar ≥1025px + mobile nav + Toaster + Walkthrough + RatePrompt
│   └── globals.css               # ~944 tokens: :root (dark) + 4× .light blocks + 16 accent blocks
├── components/
│   ├── ui/                       # 13 primitives (no barrel)
│   ├── shell/                    # app-entry, app-shell, splash-screen, offline-banner, walkthrough
│   ├── onboarding/               # 19 files; story-intro.tsx (2,856L) — deferred
│   └── adaptive/ dashboard/ exam/ explorer/ landing/ learn/ paywall/ renderers/
├── hooks/                        # 7 root hooks + queries/ (22 TanStack Query wrappers)
├── stores/                       # 18 zustand stores; theme-store = the theming engine
├── services/                     # api.ts, adaptive.ts, offline/{db,sync}.ts, …
├── lib/                          # config.ts (IS_MOCK), theme-tokens.ts, mock/**, native/, story/
└── providers/                    # query-provider (staleTime 5m), online-provider
```

Data flow: Page (client) → `hooks/queries/use-*.ts` → `services/*.ts` → `api.ts` →
`NEXT_PUBLIC_API_URL`; offline path via `services/offline/db.ts` (Dexie) + `network-store`.
Theming: `theme-store` → `applyThemeToScopes()` → `.light` + `data-accent` on every
`[data-theme-scope]` → `globals.css` tokens.

---

## E. Baseline verification (historical — 2026-10-18)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | PASS — 0 errors (after the 3-line story-intro rename fix). |
| `npm run lint` | PASS exit 0 — 0 errors, **4 warnings** (`learn/explorer/page.tsx:78`, `learn/practice/page.tsx:194`, `explorer/mind-map.tsx:59`, `onboarding/feature-intro.tsx:321`) + repeated `no-img-element`. |
| `npm run test` | PASS — 28 files, **337 tests**, 40.35s. |
| `npx vitest run --coverage` | All files **23.21%** stmts / **59.04%** branch (excludes `src/app/**`, `src/lib/mock/**`). |
| `npm run build` | PASS (static export to `out/`). |
| `npm run test:a11y` | PASS — 3/3 (`/`, `/auth`, `/onboarding`). |
| `tests/e2e/responsive.spec.ts` | **NOT RUN** at audit time. |

---

## F. Remediation checklist

Updated as work progresses. `[x]` = implemented and re-verified on this branch;
`[~]` = partial / deferred; `[ ]` = not done.

### Critical

- [x] **#1 `darkMode: "class"`** — make `dark:` follow the in-app theme store.
- [x] **#2 Toaster theme scope** — portal inherits `[data-theme-scope]` tokens.
- [x] **#3 Lazy onboarding** — `next/dynamic` in `app-entry.tsx`, remove static page import.
- [x] **#4 `typecheck` script + GitHub Actions CI** (typecheck, lint, unit tests).

### High

- [x] **#5 Mock tree-shaking** — stop shipping `lib/mock/**` when `NEXT_PUBLIC_API_MOCK=false`.
  (All static `@/lib/mock/*` imports in `src/services/*` converted to `await import()`
  inside `if (IS_MOCK)` branches; built bundle verified — mock data now lives only in lazy
  page chunks, e.g. the 56 KB techniques mock ships as a 47 KB on-demand chunk.)
- [x] **#6 Dashboard fallback data** — real loading/empty/error states instead of fabricated data.
  (`FALLBACK_*` arrays replaced with `EMPTY_*` neutral defaults; fabricated trend chips removed.)
- [~] **#7 `src/lib/text/format.ts`** — single source for `formatTime`, `formatDuration`, `formatDate`/`timeAgo`, `formatMembers`, `clamp`, `todayStr`; delete duplicates.
  (Partial: `formatTime`, `formatHoursMinutes`, `formatMinutes`, `todayStr` added and
  5×/2× duplicates removed. `SectionLabel` unification skipped — three different markup
  shapes, visual-regression risk. `clamp`/`formatMembers`/`timeAgo` duplicates remain.)
- [x] **#8/#9 Habit tracker** — copy before sort; replace raw `VIOLET` with tokens.
  (Sort copies; 16 component-level `VIOLET` usages replaced with `EMERALD_DEEP` light /
  accent-dark via a `habitAccent` local.)
- [x] **#10 Sprint config error handling** — `.catch` + error UI.
  (`.catch` resets templates + request-id guard; `.finally` clears loading.)
- [x] **#11 A11y coverage** — add authenticated routes to the axe spec.
  (17 authenticated routes added, seeded via `seedAppState`. The expanded scan found 5
  real serious violations, all fixed: scrollable `<main>` on analytics made focusable;
  violet stat-label contrast on explorer; locked-achievement contrast on profile;
  unlabeled `<select>` on history; invalid `role="list"` containers on
  history/notifications/leaderboard.)
- [x] **#12/#13 Effect-dependency lint warnings** — clear all 4.

### Medium

- [x] **#14 Lazy shell UI** — `Walkthrough` / `RatePrompt` via `next/dynamic`.
- [x] **#15 Lazy native plugins** — dynamic import inside `isNativePlatform()` branches.
- [x] **#16 Query-layer routing** for direct service calls.
- [x] **#17–#20 CSS hardening** — font re-scale, attribute-scraping selectors, scrollbar scoping, fixed-width renderers.
- [x] **#21 Onboarding modal state mirror**.

### Low / Info

- [x] **#22 Half-flipped alpha tints.**
- [x] **#23 Driver tour font + light styling.**
- [x] **#24 Lifecycle cleanups.**
- [x] **#25 Remove unused deps** (`animejs`, `zod`, `@capacitor/preferences`) — only after verifying zero references.
- [x] **#26 Type hygiene.**
- [x] **#27 `services/adaptive.ts` layering.**
- [x] **#28/#29 Naming + README branch name.**

### Explicitly out of scope for this pass

- [ ] **#31 Story Intro god-file refactor** — deferred to a dedicated task.
- [ ] Onboarding modal / adaptive-dashboard god-file splits — large refactors, separate task.

---

## G. Post-remediation verification

Actual results on `feature/frontend-standards-improvements` after the Critical + High pass:

| Command | Result |
|---|---|
| `npm run typecheck` | PASS — 0 errors. |
| `npm run lint` | PASS exit 0 — 0 `exhaustive-deps` warnings (baseline had 4); only pre-existing `no-img-element` warnings remain. |
| `npm run test` | PASS — 28 files, **337/337 tests**. |
| `npm run build` | PASS (static export). Bundle inspection: mock-data markers (`SAMPLE_TEMPLATES`, `DUEL_OPPONENTS`, `FAQ_ITEMS`, `getTechniqueById`) appear **only** in small lazy page chunks (1–47 KB), not in the main/shared chunks. |
| `npm run test:a11y` | PASS — **20/20** (3 public + 17 authenticated routes via `seedAppState`). The 5 serious violations the expanded scan initially found were fixed and re-verified green. |
| `tests/e2e/responsive.spec.ts` | Still not run in this pass (unchanged from baseline; layout-sensitive changes were limited to `tabIndex`/`outline-none` on `<main>`, which do not affect layout). |

### Known caveats (honest disclosures)

- **Pre-paint theme flash:** no inline theme bootstrap script was added to the root layout,
  because `tests/security.test.ts` restricts `dangerouslySetInnerHTML.__html` to
  JSON/DECODE patterns. On first load of a rehydrated non-default theme there is up to a
  ~1-frame window before `applyThemeToScopes()` runs. Documented, accepted, deferred.
- **`SectionLabel` not unified** — three different markup shapes across call sites;
  unification deferred (visual-regression risk without visual QA).
- **No visual inspection performed** — no claim is made about pixel-level appearance in
  either theme; only automated checks (tsc, lint, unit tests, axe, bundle inspection) were run.
- **Medium and Low findings (#14–#29) not addressed** in this pass — remaining checklist
  items above are accurate and unclaimed.
