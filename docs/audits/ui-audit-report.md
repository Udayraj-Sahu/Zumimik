# Zuzumik — Whole-App UI Audit

**Project:** Zuzumik Frontend  
**Date:** 2026-10-16  
**Screens audited:** 40 routes x 6 viewport/theme combos (240 renders)  
**Method:** code + computed-DOM inspection (automated) — Playwright chromium against static export (out/) on localhost:3008

> This is a **mechanical** audit (computed styles + DOM semantics), not a visual one. The model cannot view screenshots, so aesthetic judgments are out of scope.

## Executive Summary

The app shell is **structurally very strong**: 40 routes render with **zero horizontal overflow** across all 6 viewport/theme combinations, navigation switches cleanly at the 1025px boundary, exam routes correctly suppress the bottom nav, and `prefers-reduced-motion` is honoured.

The real problems are concentrated in **accessibility polish**, and one has a single, precise root cause:

1. **Light-mode chart text fails WCAG AA** — `--chart-3: #F59E0B` (amber) is defined identically in the dark and light token blocks. The light block deliberately darkens `--chart-1` and `--chart-5` but **skips chart-3**, so amber text renders at ~1.7–2.4:1 on light surfaces (needs 4.5:1). This single token explains most contrast failures across 22 routes.
2. **Icon-only sidebar links have no accessible name** — when the sidebar is collapsed the label text is hidden and the icon is `aria-hidden`, so screen readers announce nothing on every app route.
3. **21 of 40 routes have no `<h1>`** — several pages start at `<h2>` or have no heading at all.
4. **Sub-44px touch targets** — the theme toggle (48x24), accent swatches (36x36), carousel dots (8x8), and several pill buttons sit below the 44px guideline.

Layout/responsiveness — the area we just refactored — is **clean**. No regressions were found in the sidebar-shove / centered-content work.

## Scope & Method

- **Routes:** 40. Groups: public:landing (1), public:auth (1), public:onboarding (1), app:dashboard (5), app:learn (14), app:play (6), app:settings (12).
- **Viewports/themes:** 1440x900 light, 1440x900 dark, 390x844 light, 390x844 dark, 820x1180 light, 820x1180 dark.
- **Collector:** Playwright (chromium) against the static export in `out/` served on `localhost:3008`; seeded auth/onboarding/walkthrough/theme localStorage per combo.

**Limitations (read before acting on any single row):**

- No visual/pixel review (model cannot view images); findings are computed-style + DOM semantics only.
- Contrast measured from computed color vs nearest opaque ancestor background; elements over gradients/images are flagged as likely false positives.
- Accessible-name check is heuristic (aria-label / innerText / img alt / title).

## Priority Fixes (ranked)

| # | Severity | Fix | Evidence | Affected |
|---|----------|-----|----------|----------|
| 1 | HIGH | **Darken chart palette in light theme (amber especially)** — `--chart-3: #F59E0B` is identical in dark and light blocks, so amber text (text-chart-3) renders at 1.88-2.36:1 on light surfaces. The light block already darkens --chart-1 and --chart-5 but skips --chart-3. Add a darkened amber for light mode. _(27-patterns-accessibility.md -> Contrast (WCAG 1.4.3))_ | `globals.css:30 vs globals.css:410` | /learn/mastery, /learn/technique/*, /play, /settings/achievements, /dashboard |
| 2 | HIGH | **Give icon-only sidebar links an accessible name** — Collapsed sidebar nav links render only an aria-hidden icon with the text label hidden until hover, so screen readers announce nothing. Add aria-label (or sr-only text) to each nav link. _(27-patterns-accessibility.md -> Keyboard/ARIA)_ | `app-shell.tsx:94-105` | all app routes |
| 3 | MEDIUM | **Add a page H1 to heading-less routes** — 21 routes start at h2 or have no heading at all, so there is no programmatic page title. Promote each screen's title to an h1. _(23-patterns-visual-hierarchy.md -> Typography)_ | `e.g. dashboard/analytics renders only h2s` | /dashboard/analytics, /dashboard/clubs, /dashboard/feed, /learn/mastery, /play/*, /settings/* |
| 4 | MEDIUM | **Label carousel pagination + notification badge buttons** — Hero carousel dots are <button> at 8x8/20x8 with no accessible name, and the notification badge button (20x20) is unnamed. Add aria-label and enlarge hit area to >= 44px. _(27-patterns-accessibility.md -> Touch targets; 25-patterns-feedback.md)_ | `dashboard hero carousel` | /dashboard |
| 5 | MEDIUM | **Raise sub-44px tap targets** — Accent swatch (36x36), theme toggle (48x24), 'Details' pill (h29), 'PRACTICE NOW'/'EXPLORE TECHNIQUES' (h31), 'VIEW HABITS' (h41) fall below 44px. Increase min height or pad the hit area. _(27-patterns-accessibility.md -> Touch targets (WCAG 2.5.5))_ | `theme-toggle.tsx, dashboard cards` | /dashboard, all app routes (theme toggle) |
| 6 | LOW | **Mark current location on subroutes** — aria-current is only set on top-level routes; subroutes (/dashboard/analytics, /settings/*) never mark the active item, so wayfinding is weaker. Derive active state from pathname prefix. _(31-patterns-navigation.md -> Wayfinding)_ | `app-shell.tsx:91 (active = pathname === item.href)` | all app subroutes |
| 7 | LOW | **Fix /learn heading skip and /play duplicate landmarks** — /learn jumps h1 -> h3 (cards should be h2). /play renders 2 main and 2 nav landmarks (likely an inline duplicate/overlay). _(23-patterns-visual-hierarchy.md; 27-patterns-accessibility.md -> Landmarks)_ | `learn page cards; play page landmark counts` | /learn, /play |

## App-wide Findings

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| GF-1 | HIGH | **Chart palette not re-tuned for light mode** — Light block darkens --chart-1/--chart-5 but leaves --chart-3 (#F59E0B) and --chart-4/#8B5CF6 untouched, producing sub-AA text on light surfaces. | `globals.css:408-412 vs 28-32` |
| GF-2 | HIGH | **Icon-only nav links are unlabeled** — Collapsed sidebar hides label text and the icon is aria-hidden -> no accessible name across every app route. | `app-shell.tsx:94-105` |
| GF-3 | MEDIUM | **Most screens lack an H1** — 21/40 routes have no h1; hierarchy starts at h2/h3. | `screens[].checks.visual_hierarchy` |
| GF-4 | MEDIUM | **Small interactive controls** — Carousel dots, notification badge, accent swatches, theme toggle, and several pills are under 44px. | `screens[].tap_target_samples` |
| GF-5 | LOW | **Subroute wayfinding** — aria-current only on top-level items. | `app-shell.tsx:91` |
| GF-6 | PASS | **Layout stability is excellent** — Zero horizontal overflow across 40 routes x 6 viewport/theme combos; nav/sidebar switch correctly at the 1025px boundary; exam routes suppress the bottom nav. | `raw sweep` |
| GF-7 | PASS | **Reduced-motion supported** — prefers-reduced-motion media query present in the stylesheet. | `globals.css` |

## Confirmed False Positives (excluded from counts)

The contrast heuristic compares text colour to the nearest opaque ancestor background. These are **not** real failures:

- **`bg-cta` buttons** (e.g. "CONTINUE SETUP", "PRACTICE NOW", "VIEW HABITS"): use `background-image: linear-gradient(...)`, so computed `background-color` is `transparent` and the heuristic grabs a near-black ancestor. Actual near-black text on the violet/lime CTA gradient is ~4.5:1+.
- **White text on `.keep-white` image cards** (e.g. `/dashboard/feed` "Can you beat yesterday's accuracy?"): the card carries an `<img>` and `.keep-white` (`globals.css:1028`) intentionally restores true white — deliberate overlay text.
- **The 1x1 sr-only "Skip to content" link** — inflates every tap-target count by 1 (already subtracted).
- **Low body text on form/canvas routes** (`/settings/profile/edit` = 3 inputs+labels, `/play/sprint`, `/learn/mock/run`) — content lives in inputs/canvas, not DOM text.

## Per-Route Matrix

`X` = fail, `!` = warn, `OK` = pass, `-` = n/a.

| Route | Group | H1 | Contrast | Names | Tap | Focus | Current | Notes |
|-------|-------|:--:|:--------:|:-----:|:---:|:-----:|:-------:|-------|
| `/` | public:landing | OK | OK | OK | X | ! | - | Tap targets under 44px |
| `/auth` | public:auth | OK | OK | OK | OK | OK | - | — |
| `/onboarding` | public:onboarding | OK | OK | OK | OK | OK | - | — |
| `/dashboard` | app:dashboard | OK | X | X | X | OK | OK | Contrast below WCAG AA; Tap targets under 44px; Controls without accessible name |
| `/dashboard/analytics` | app:dashboard | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/dashboard/clubs` | app:dashboard | X | X | OK | X | OK | X | No H1 / page title; Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/dashboard/feed` | app:dashboard | X | X | OK | X | OK | X | No H1 / page title; Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/dashboard/friends` | app:dashboard | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn` | app:learn | OK | X | OK | X | OK | OK | Heading level skip; Contrast below WCAG AA; Tap targets under 44px |
| `/learn/explorer` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/mastery` | app:learn | X | X | OK | X | OK | X | No H1 / page title; Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/mock/run` | app:learn | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/learn/practice` | app:learn | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/learn/technique/data-sufficiency` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/lcm-gcd` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/number-system-factors` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/percentage-tricks` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/prime-factorization` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/quant-comparison` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/sentence-correction-parallelism` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/speed-distance` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/learn/technique/work-rate` | app:learn | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/play` | app:play | OK | X | OK | X | OK | OK | Contrast below WCAG AA; Tap targets under 44px; Landmark count |
| `/play/configure-sprint` | app:play | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/play/duel` | app:play | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/play/sprint` | app:play | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/play/sprint/results` | app:play | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/play/sprint/results/analysis` | app:play | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/settings` | app:settings | OK | OK | X | X | OK | OK | Tap targets under 44px; Controls without accessible name |
| `/settings/achievements` | app:settings | X | X | OK | X | OK | X | No H1 / page title; Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/settings/help` | app:settings | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/settings/history` | app:settings | X | X | OK | X | OK | X | No H1 / page title; Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/settings/leaderboard` | app:settings | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/settings/linked-devices` | app:settings | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/settings/notifications` | app:settings | X | X | OK | X | OK | X | No H1 / page title; Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/settings/planner` | app:settings | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/settings/profile` | app:settings | OK | X | OK | X | OK | X | Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/settings/profile/edit` | app:settings | X | OK | OK | X | OK | X | No H1 / page title; Tap targets under 44px; Current location not marked |
| `/settings/reports` | app:settings | X | X | OK | X | OK | X | No H1 / page title; Contrast below WCAG AA; Tap targets under 44px; Current location not marked |
| `/settings/scan-to-login` | app:settings | X | OK | OK | X | ! | X | No H1 / page title; Tap targets under 44px; Current location not marked |

## What's Working Well

- **Zero horizontal overflow** on all 40 routes x 6 viewport/theme combos.
- **Responsive nav** — desktop sidebar / mobile bottom nav switch correctly; exam routes intentionally omit the bottom nav.
- **Token-driven theming** — light/dark scope applies to the app shell; public routes stay on the unscoped dark surface by design.
- **`prefers-reduced-motion`** media query present.
- **Forms are labelled** — `/settings/profile/edit` pairs 3 inputs with 3 labels.
- **The `.keep-white` escape hatch works** — white overlay text on image cards is preserved in light mode.
