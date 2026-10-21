# Zuzumik — Audit 2 (Design System & Theme)

Companion to `docs/QA-AUDIT.md`. Covers the design-system consistency and
theme-edge-case checklist for the app shell + feature screens.

Status: `[x]` = verified, `(~)` = partial (evidence-cited), `[ ]` = open.

---

## Design System

### Color & token architecture
- [x] **One source of truth for colors/tokens**
  - `src/lib/theme/theme-tokens.ts` + `globals.css :root` (.light overrides in globals).
  - Note: header comment claims "AUTO-GENERATED from palette-map.json", but no
    `palette-map.json` exists in the repo — two files must stay manually in sync.
- [x] **Light theme completely implemented** (Phase 1 QA-AUDIT completed)
- [x] **Dark theme completely implemented** (original; frozen)
- [x] **Theme switching updates all components**
  - `theme-store.ts` toggles `.light` on `[data-theme-scope]`; shell wraps app
    (`app-shell.tsx:82`). All portaled modals self-apply `theme === "light" && "light"`.
- [x] **No hardcoded colors outside design tokens**
  - No hex literals in `.tsx`; only `rgba()` computed from `LIME_BRIGHT_RGB` token
    (adaptive-reprompt) and CSS vars. Landing/hero ARIA ring uses tokens.
- [x] **Primary / secondary / accent / neutral colors have defined usage**
  - `primary`=lime, `accent`/`muted`/`destructive`/`border`/`ring`/`chart-*` all
    mapped in `tailwind.config.ts` and consumed consistently.

### Typography
- (~) **Typography scale is consistent**
  - Scale defined (`text-micro`, `text-fluid-xs..3xl`) but the app also uses 30+
    arbitrary sizes — `text-[13px]` x134, `text-[12px]` x182, `text-[11px]` x116,
    `text-[10px]`/`[9px]`/`[8px]`/`[7px]` etc. Needs a sweep toward the fluid scale.
- [x] **Font weights are consistent**
  - `font-bold`/`semibold`/`medium` dominate; `font-display` and `font-mono` used
    for their purpose. (Minor: Inter only loads 300–600 yet `font-bold`=700 is used
    x541 — synthesized bold.)

### Shape & elevation
- (~) **Border radius system is consistent**
  - Predominantly `rounded-full`/`3xl`/`2xl`/`xl`/`lg`/`md` (tokens). 23 arbitrary
    values remain: `rounded-[20px]`/`[18px]`/`[16px]`/`[10px]`/`[0.12em]`.
- (~) **Shadow/elevation system is consistent**
  - No shadow tokens are defined in `tailwind.config.ts`. 31 arbitrary
    `shadow-[0...]` + `shadow-2xl`/`md`/`sm`/`lg`. Needs an elevation scale.
- [x] **Spacing follows a defined scale**
  - Standard Tailwind scale throughout (`gap-2`/`px-4`/`py-3`…). Rare arbitrary,
    e.g. `gap-[3px]`.

### Icons
- [x] **Icon library is consistent** — 100% `lucide-react`
- (~) **Icons have consistent stroke/fill style**
  - Default strokeWidth=2, but explicit overrides span 1.5/1.8/2.2/2.5/2.8/3/3.5
    (44 total). Sizes mix `size={10..24}`. Standardize to a small set.

### Components
- [x] **Button styles are standardized**
  - Shared **`Button` primitive added** (`src/components/ui/button.tsx`) with
    `variant="cta" | "primary" | "glass" | "destructive" | "ghost"` (default cta),
    `size="lg" | "md" | "sm" | "icon"` (default md), `fullWidth`, `type="button"`
    default + `disabled:opacity-30 disabled:cursor-not-allowed` base.
  - `cta` uses `bg-cta` gradient (single mechanism — the `scan-to-login` inline
    `linear-gradient(90deg, CTA_LIME, LIME_DARK)` drift remains there only).
  - **Migrated ~37 buttons across 14 app pages** to the primitive
    (`play/sprint+results+analysis`, `learn/mock/run`, `learn/practice`,
    `play/duel`, `play/configure-sprint`, `dashboard, +analytics/friends/clubs`,
    `learn`, `settings/profile`, `settings/profile/edit`, `settings/reports`).
    Option/segmented-toggle loops (sprint, mock, duel, settings rows, amber solid
    "Start 5-Question Sprint") intentionally left as-is — a separate category.
  - **Dead-hover fix:** glass buttons previously used inline `style={{ backgroundColor:
    GLASS_BG, borderColor: GLASS_BORDER }}` so `hover:bg-white/[0.06]` was masked by the
    inline style. Added `.btn-glass` in `globals.css @layer components` (border/bg from
    tokens) so utilities-layer hover wins; inline-style glass buttons in results,
    analysis, optimization, sprint, mock/run, practice, duel, learn migrated.
- (~) **Input styles are standardized**
  - Single family: `rounded-2xl border-white/[0.06-0.08] bg-white/[0.04] px-4
    py-3.5`. Minor border-alpha drift; no shared component.
- [x] **Card styles are standardized**
  - Recurring `rounded-2xl/3xl border + glass (bg-white/alpha + backdrop-blur)`.
  - **Shared `GlassCard` component added** (`src/components/ui/glass-card.tsx`) with
    `radius="2xl" | "3xl"` (default 3xl), base `relative border backdrop-blur-xl`,
    and default style `{ borderColor: GLASS_BORDER, background: GLASS_BG }`
    (caller className/style merge last).
  - **Refactored to `GlassCard` across static (app) pages** (~18 sites): dashboard
    (Quick Access, Topic mastery, Recent Activity, Cognitive radar, Upcoming,
    Leaderboard), dashboard sub-pages (analytics stat cards via border override,
    ClubCard, feed stories, friends rows + error banner), learn (Exam Tabs, mock
    paper cards, StatsSummary, practice result stat cards + hint box), play
    (sprint result stat cards, analysis wrong-answer cards), settings (StatCard,
    prep list, planner error banner + stat cards).
  - Kept as-is intentionally: interactive buttons/segmented controls, gradient &
    tinted *spotlight* cards, dashed-edge inputs, `divide-y` list containers,
    skeletons (all remain standard `rounded-2xl/3xl + glass` recipe).
  - NOTE: this standardization also fixes light-mode borders — cards previously
    hardcoded `border-white/[0.06]` now use `--glass-border` (black-alpha 0.08 in
    light), so the border remains visible in light mode.
- [x] **Modal/dialog styles are standardized**
  - Shared **`Dialog` primitive added** (`src/components/ui/dialog.tsx`): portal,
    `placement="bottom-sheet" | "center"`, Escape-close, basic focus trap
    (restores prior focus), `data-theme-scope` + light auto-apply, aria
    `role/aria-modal/labelledby/describedby/label` passthrough, caller-forwardable
    overlay/panel refs (keeps existing gsap entry/exit in callers), optional
    `panelStyle`. Backed by **`useLockBodyScroll`** (`src/hooks/use-lock-body-scroll.ts`,
    ref-counted, locks `body` + `main` scroller, restores prior overflow) — no
    scroll-lock existed before this.
  - **Migrated bottom-sheet family**: `learn/add-prep-modal`, `dashboard/exam-date-modal`,
    `adaptive/adaptive-reprompt`, `shell/rate-prompt` (center). Legacy modals
    (`onboarding-modal`, intro family, `habit-tracker-modal`, `paywall-modal`) still use
    their own `createPortal`; only z-index normalized.
  - **Elevation scale added** in `globals.css :root`: `--z-fab` 40 / `--z-nav` 50 /
    `--z-dialog` 60 / `--z-toast` 90 / `--z-intro` 200 / `--z-splash` 9999. All legacy
    `z-[60/70/200/210/220/9999]` bands wired to tokens (intro family, splash,
    habit, onboarding-modal → `--z-dialog`, auth-modal/nav-shell → `--z-nav`).
    `paywall-modal` + `offline-banner` remain at `z-[70]` (above dialog, below toast)
    pending a dedicated overlay band.
- [x] **Toast/notification styles are standardized**
  - Added minimal toast system: **`toast-store`** (`src/stores/toast-store.ts`, zustand,
    `toast.success/info/error` facades, auto-dismiss ~3.5s) + **`Toaster`**
    (`src/components/ui/toaster.tsx`, motion entry/exit, `--z-toast`, `role="alert"`
    for errors / `role="status"` otherwise, bottom-center mobile / bottom-right sm+,
    mounted in `app-shell`).
  - Demo wiring: `content-feedback` submit failure → `toast.error(...)` (was silent
    `catch { setSubmitted(null) }`).
  - Note: inline `destructive/5` error banners remain the standard for in-form
    validation errors; toasts cover transient system/async feedback.

---

## Theme edge cases
- [x] Text remains readable in both themes
- [x] Disabled elements remain distinguishable
- [x] Placeholder text has sufficient contrast — fixed: all 5 inputs now use
  full `text-muted-foreground` instead of `/20–/30` (was ~1.5:1 in light; now
  4.7:1 light, 5.5:1 dark — AA).
- [x] Borders don't disappear in dark mode
- [x] Shadows work appropriately in dark mode
- [x] Images/logos don't become invisible (feed hero is `keep-white` + gradient overlay)
- [x] SVG icons inherit theme correctly (lucide, colored via theme tokens)
- [x] Charts adapt to theme (`chart-1..5` defined per theme in globals.css)
- [x] Loading skeletons adapt to theme
- [x] Empty states adapt to theme

---

## Offline storage edge cases

Automated coverage: `src/services/offline/offline-storage.test.ts` (vitest + jsdom +
`fake-indexeddb`). All 11 scenarios pass (14/14 total suite incl. `src/lib/utils.test.ts`).
Covers the Dexie offline DB (`src/services/offline/db.ts`, `sync.ts`), persisted zustand
stores (`safeLocalStorage`), and `resetAppState`/`purgeUserData` (`src/lib/platform/reset-app-state.ts`).

- [x] **First installation** — fresh env exposes empty DB tables + store defaults; `resetAppState` is a no-op.
- [x] **Existing data** — persisted stores and DB rows round-trip on load (settings rehydrate; cached query data and queued feedback readable).
- [x] **Corrupted data** — malformed persisted JSON and incomplete DB rows are tolerated (defaults kept, no throw).
- [x] **Schema migration** — v1→v2 upgrade preserves rows and adds `updatedAt`/`trustStatus`/`createdAt`/`retryCount` indexes.
- [x] **Storage unavailable** — reads/writes/reverts never throw; fall back safely via `safeLocalStorage` + try/catch.
- [x] **Storage quota exceeded** — dropped writes persist nothing; in-memory state still updates.
- [x] **Logout clears required data** — resets auth + all store defaults, removes `localStorage`/`sessionStorage` keys, clears both DB tables and the query cache.
- [x] **User switching** — previous user's DB rows and auth state never leak into the next session.
- [x] **Multiple tabs** — state shared via `localStorage`; each tab hydrates on load (verified: zustand v5 persist has no live `storage`-event sync by design).
- [x] **Stale cache** — TTL-expired `dashboardCache` entries return `null`, self-delete, and are reaped by `clearExpiredCache`.
- [x] **Cache invalidation** — writes overwrite prior cache (`put`-upsert), expiry invalidates, and logout purges the cache.

---

## State management edge cases

Automated coverage: `src/stores/state-management.test.ts` (vitest + jsdom). All 19
checks pass (33/33 total suite incl. offline-storage + utils). Covers all 16 zustand
stores in `src/stores/` — 11 persisted via `persist()` (`auth`, `settings`, `plan`,
`rate`, `walkthrough`, `resume`, `adaptive`, `referral`, `onboarding`, `habit`,
`theme`) and 5 non-persisted (`network`, `paywall`, `toast`, `sprint`, `template`) —
plus `resetAppState` invariants.

- [x] **Initial state** — every store exposes correct defaults with no persisted data (including 5 seeded habits + 30-day habit log, 3 default reclaim configs, dark theme).
- [x] **Loading state** — async mutations never expose partial/premature state (login stays unauthenticated until resolved; toasts auto-dismiss after their 3.5s lifetime).
- [x] **Updated state** — every mutable action updates memory and writes persisted storage (auth, settings, plan, rate, walkthrough, onboarding, habits, referral, adaptive, theme).
- [x] **Reset state** — each store's `reset()` returns it to its exact initial shape.
- [x] **Persisted state** — re-hydration from storage rebuilds the last session snapshot (verified by snapshot→wipe→restore→rehydrate, simulating a reload).
- [x] **Logout state** — `logout()` clears auth only (user/token/refresh/flag); other slices survive until `resetAppState`, which clears everything user-scoped.
- [x] **Refresh state** — full-reload simulation restores the session from persistence (auth, plan, rate, walkthrough, onboarding, referral, theme).
- [x] **Navigation state** — client-side route events never reset store state; stores are not coupled to `next/navigation`/`next/router` (`useRouter`) anywhere in `src/stores/`.
- [x] **Stale state** — legacy persisted shapes are healed via `merge`/`migrate` (padded 7-day `weekDays`, default `reclaimConfigs`); mismatched-version blobs without a `migrate` fn and malformed blobs are ignored with defaults kept, no throw.
- [x] **Race conditions** — concurrent async logins settle to a consistent last-write-wins auth state (no torn/superseded mix); rapid sequential writes persist the final value.
- [x] **No unnecessary global state** — only serializable data is persisted (never action functions; JSON round-trip safe); transient UI stores (`toast`, `paywall`, `network`, `sprint`, `template`) never write `localStorage`.
- [x] **No duplicated source of truth** — one unique persist key per store (11 total); `resetAppState` `STORAGE_KEYS` mirrors every persisted store *except* `zuzumik-theme` (theme intentionally survives logout — a conscious exclusion, not drift).
- [x] **Store resets correctly** — `resetAppState` restores every store, empties both Dexie tables and clears scratch rows. (Note: the ephemeral toast queue is intentionally not managed by `resetAppState`.)
- [x] **Persisted values are version-safe** — onboarding `version: 1` + `migrate` is non-throwing for stored versions 0–3; forward migrations keep new keys (`arenaHookSeen`/`pitchHookSeen`) and pad legacy shapes.
- [x] **Sensitive data isn't unnecessarily persisted** — recursive scan of all persisted payloads: no `password`/`otp`/`pin`/`secret`/`idToken` fields, and the password arg is never stored in auth memory. Acknowledged trade-off to revisit with real JWTs: `token`/`refreshToken` currently persist for session restore.

---

## Date & time edge cases

Automated coverage: `src/lib/date-time.test.tsx` (vitest + jsdom + Testing Library).
All 23 checks pass (56/56 total suite across 4 files). Exercises the real date paths in
`src/lib/text/stats.ts` (`computeStreak`, `computeRecent`) and the exam-date picker
`src/components/dashboard/exam-date-modal.tsx` (rendered via jsdom with an
`Element.scrollTo` polyfill and a stubbed `gsap`). Timing is pinned with
`vi.useFakeTimers()`/`vi.setSystemTime`; assertions derive expected dates from the same
constructors the app uses, so they hold in any timezone.

- [x] **Date picker** — opens on "today + 90 days" by default and confirms a correctly padded `YYYY-MM-DD` ISO.
- [x] **Invalid date** — a day larger than the target month snaps to the month's last day (Feb 31 → Feb 28 non-leap, Apr 31 → Apr 30); a non-existent `2023-02-29` normalizes to Mar 1 per the JS Date spec instead of becoming a silent leap day.
- [x] **Minimum date** — past dates *and today itself* are rejected with "Pick a future date — your exam date must be after today"; a clearly future date passes and confirms its ISO.
- [x] **Maximum date** — the year column offers exactly `currentYear .. currentYear + 5`; `currentYear + 6` is unreachable.
- [x] **Same start/end time** — an equal `from - to` pair round-trips through the onboarding store as-entered; the forced "+15 min" clamp lives in the UI layer (`story-intro.tsx` `clampWindow`, lines 108-115 — component-level, not unit-tested).
- [x] **Start > end time** — a cross-midnight pair ("22:30 - 00:30") is stored as-entered; the UI clamps both ends to `LAST_SLOT` (23:45).
- [x] **Timezone** — streak day keys come from the device-local calendar day of the ISO instant, not the UTC day. Note: the modal parses a date-only ISO as UTC midnight, so a "today" pick can read as yesterday in negative-offset zones at the strict `picked <= today` bound — worth a manual check in such zones.
- [x] **Midnight** — two entries on one local day (00:01 + 23:59) count once; a 23:59 / next-day 00:01 pair counts as two streak days; sub-minute activity reports "Just now".
- [x] **Month boundary** — streaks tolerate Jan 31 → Feb 1; relative time crosses month edges with plain day math ("2d ago").
- [x] **Year boundary** — streaks span Dec 31 → Jan 1 without a reset.
- [x] **Leap year** — Feb 29 is a real, distinct streak day in 2032; the picker exposes 29 days that February and snaps 31 → 29.
- [x] **Past date** — entries older than the 7-day streak window never extend the current streak; relative time buckets past activity into "Nd ago" / "Yesterday" / "Just now".
- [x] **Future date** — future-dated entries never inflate the current streak; the picker defaults to +90 days for the countdown.

---

## Text, input & forms edge cases

Automated coverage: `src/lib/text-input-empty.test.ts` (vitest). All 17 checks pass
(109/109 total suite across 8 files). Exercises the zod schemas in
`src/lib/types/template.ts` (SolveAlongTemplate, TemplateExample, Session) and the
empty-data paths in `src/lib/text/stats.ts`.

- [x] **Very long text** - 50k-char strings pass; no max-length cap is enforced (min(1) only).
- [x] **Short text / one word** - single characters meet the min(1) boundary.
- [x] **Unicode** - Latin + diacritics and CJK pass validation.
- [x] **Emoji / Hindi / regional languages** - Hindi, Bengali, and emoji pass verbatim.
- [x] **Numbers** - int/range enforced (difficulty 1-5, positive step_num/expected_time, non-integers rejected).
- [x] **Dates & currency** - date strings (`2026-09-28`) and rupee amounts pass verbatim.
- [x] **Empty inputs / new user** - required empty strings rejected; optional fields tolerate absence; full empty-history dashboard is safe.
- Note: whitespace-only strings pass (schemas do not `.trim()`); a session may carry an empty `templates: []` (no min) - a tolerated empty state, not an error.

## Empty states

- [x] **No records** - data layer returns safe zeros/empty for a brand-new user (stats, topic mastery, recent activity, streak).
- [x] **No history / no questions / no exams / no notifications / no search results / no uploaded files** - dashboard, feed, clubs, and history iterate mock-pipeline arrays; an empty array deterministically renders a zero list via the same `stats.ts` contracts.
- UI gap: no shared `EmptyState` component exists (icon + explanation + next action). Empty screens use ad-hoc markup; a reusable empty-state component is recommended.

## Images & Media (inspection - inline SVG + raw `<img>`; no remote raster pipeline)

- [x] **Lazy loading** - feed story thumbnails and club covers use `loading="lazy"`; hero is above-the-fold (eager).
- [x] **No layout shift** - every image sits in a fixed-size box (`h-[160px]`, `w-14 h-14`, `w-[52px] h-[70px]`) with `overflow-hidden`.
- [x] **Correct object-fit** - `object-cover` on hero, thumbnails, and club covers crops varied/aspect-ratio images safely.
- [x] **Decoding** - `decoding="async"` on all `img` tags; nothing blocks first paint.
- [x] **Different aspect ratio / large / very small** - `object-cover` inside fixed boxes handles all of these.
- Gaps: **missing/broken image** - no `onError` fallback (dead URL = broken-image glyph). **WebP/AVIF** - next/image is not used and `next.config.mjs` sets no formats; source format follows the mock content provider. **Placeholder** - no blurDataURL. Revisit if real remote media is introduced.

## API failure / retry / refresh

Automated coverage: `src/services/offline/sync-retry.test.ts` (vitest + fake-indexeddb). All 11
checks pass. Exercises the offline sync service (`src/services/offline/sync.ts`) and the cache.

- [x] **Network failure** - fetch rejection is contained (never thrown to the caller); mutation stays queued.
- [x] **Server error (5xx)** - mutation retained for retry; retryCount untouched.
- [x] **Invalid data / 4xx on feedback** - retryable; dropped only after MAX_SYNC_RETRIES (3) attempts, retryCount incremented each attempt.
- [x] **4xx on non-feedback keys** - never auto-dropped (kept for manual recovery).
- [x] **Session expiration during sync** - 401 on feedback behaves like a 4xx (retry counted, then dropped at cap).
- [x] **Retry** - on-cap feedback rows are deleted from the queue AND the Dexie row.
- [x] **Refresh** - overlapping `syncAll` calls coalesce into a single request batch (single-flight guard).
- [x] **Stale refresh** - TTL-expired dashboard cache invalidates and self-deletes on read.
- [x] **Missing data / no token** - offline sync is a no-op; nothing leaves the device.

## Loading states

- [x] **Initial / async loading** - covered in the State management suite (async mutations never expose partial/premature state).
- [x] **Skeleton** - `animate-pulse` skeletons verified in `adaptive-dashboard.tsx` and `habit-tracker-modal.tsx`; onboarding pages ship pulse placeholders.
- Inspection: button/page/table/image/lazy-component loading use inline states (no shared skeleton API); recommend a reusable skeleton/loader component when one is introduced.

## Notifications / Toasts

Automated coverage: `src/lib/toasts.test.ts` (vitest + fake timers). All 9 checks pass.
Exercises `src/stores/toast-store.ts`.

- [x] **Success / info / error toast** - pushed with correct type and title; messages preserved verbatim (incl. 2k-char messages).
- [x] **Multiple simultaneous notifications** - distinct ids, insertion order preserved.
- [x] **Auto-dismiss** - fires exactly at 3.5s, removes only the expired toast.
- [x] **Manual dismiss** - removes only the targeted toast.
- Gap: **warning toast** does not exist - `ToastType` is `"success" | "info" | "error"`. Dark mode/positioning/stack-over-controls stay UI-styling concerns; add a `warning` type and confirm mobile placement in the device pass.

## Security

Automated coverage: `src/lib/security.test.ts` (vitest + static scans). All 15 checks pass.

- [x] **No secrets in frontend** - recursive scan of every src file: no Firebase/Google strips, Stripe keys, AWS access ids, PEM private keys, SendGrid keys, GitHub tokens, or service-role keys.
- [x] **No API private keys / service-role keys** - firebase reads `NEXT_PUBLIC_FIREBASE_*` at runtime; no key literals ship in the bundle.
- [x] **Environment variables correctly separated** - every `process.env.*` in src is `NEXT_PUBLIC_*` (browser-safe); mock flag defaults true, API URL/mock mode validated.
- [x] **Authentication state handled securely** - `logout()` clears user/token/refreshToken in memory AND in the persisted blob.
- [x] **Protected routes enforced** - the `isAuthenticated` gate flips false on logout (app-level guard; route shells are manual-verify).
- [x] **Sensitive information not displayed** - persisted payloads contain no password/otp/pin/secret fields (re-verified alongside the State suite).
- [x] **No dangerous HTML injection** - React escapes text by default; the sole `dangerouslySetInnerHTML` is a static `application/ld+json` script.
- [x] **User input escaped/sanitized** - zod `min(1)` on all required text; nothing is injected into the DOM unsanitized.
- [x] **Debug logs removed from production** - zero `console.log`/`console.debug`/`debugger` in src.
- [x] **Error messages don't expose internals** - sync errors carry only key + HTTP status (`Sync failed for <key>: <status>`) and are swallowed, never surfaced to users.
- Gaps: **token expiry** - no `exp`/expiry check exists; session restore relies on persistence and expiry would come from server-side 401s. **Source maps** - not explicitly configured (off by default). **External URLs** - the app renders no user-supplied external URLs needing runtime validation.

## Keyboard & input ergonomics

- [x] **Correct keyboard type** - phone sign-in uses `type="tel"`; profile editor uses `type="email"` and `type="tel"` (static-verified).
- Device tier (manual QA): enter-key submit, next-field navigation, keyboard not hiding input/submit, keyboard closes after submission, cursor preservation - jsdom cannot model soft keyboards.

## Mobile / app behavior (Android - config inspection + device QA gate)

- [x] **App launches correctly / splash** - Capacitor `MainActivity` with `NoActionBarLaunch` theme; static build exported to `out/`.
- [x] **Safe area** - `env(safe-area-inset-*)` applied across app-shell, exam-shell, and every onboarding screen; `dvh` viewport units used.
- [x] **Screen rotation** - AndroidManifest `configChanges` covers `orientation|screenSize|keyboardHidden|uiMode|...` so activity survives reconfiguration.
- [x] **Android back button** - `enableOnBackInvokedCallback="true"` (predictive back) with `singleTask` launch mode.
- [x] **Storage perms (as applicable)** - no CAMERA/STORAGE permissions declared - correct, since uploads use the Android Storage Access Framework picker (no runtime permission needed).
- [x] **Notification permissions** - `POST_NOTIFICATIONS` declared for (currently dark-mode-frozen) notification feature.
- Device tier / gaps: **deep links** - no intent-filter for `com.zuzumik.app`; **external links / status & navigation bars / keyboard overlap / backgrounding / resume / killed-and-reopened / file picker / camera (N/A)** - require an on-device QA pass. Splash/status bar theming uses Capacitor defaults (no plugin config in `capacitor.config.ts`).## Responsive & breakpoints

Matrix: 11 primary screens x [320,360,375,390,414,768,1024,1280,1440,1920] + secondary screens x
[320,375,768,1024,1280,1920], Chromium + mobile-Chrome projects. Auto-verified by
`tests/e2e/responsive.spec.ts` (serves static `out/` via `tests/e2e/static-server.cjs`).

- [x] **Nav mode at breakpoints** - floating pill nav <= 1024px, fixed sidebar (250px) >= 1025px
  with matching `main` margin-left; pill hidden on exam flows (`/play/sprint`, `/learn/mock/run`,
  `/learn/practice` prefixes); main keeps >= 80px bottom padding while the pill is visible.
  Note: nav boundary moved from `lg`(1024) to `min-[1025px]` so the tablet APK keeps the floating
  pill (product decision).
- [x] **Nothing clipped / everything reachable** - content inside an `overflow-x:auto` rail is
  scroll-reachable (carousels); no `position:fixed` element partially outside the viewport;
  decorative `pointer-events:none` shapes and inline-SVG geometry excluded (not user-facing).
- [x] **Controls fit viewport** - every a/button/input/select/textarea within the viewport at each
  tested width, except the one explicit finding below.
- [x] **Text is not clipped** - no unwrapped/overflowing run-of-text at any tested width.
- [x] **No document-level horizontal scroll** - `scrollWidth <= innerWidth` on every screen/width.
- [x] **Tables** - every data table either fits its section or lives in a scrollable stub.
- (~) **Technique chip row at 320px** - `/learn/technique/quant-comparison` renders a non-scrolling
  `flex gap-2` chip row (row scrollWidth 319px vs 288px available) whose last 52px round badge
  sticks ~15px past the right edge at width 320 (button partially clipped, no scroll to reach it).
  Repeats in both projects at 320px only. Open: allow the row to wrap or shorten the chips.
- (~) **Landing hero decorative badge at 320px** - `/` hero's absolutely-centered floating badge
  (non-interactive `pointer-events:none` band) extends to ~436px at width 320 (~116px of visual
  crop, clipped by the hero section). Landing is dark-mode frozen; left for the device-tier pass.
- Device tier (manual QA gate): true zoom 80/125/150/200%, on-device keyboard overlap, on-device
  safe-area notches, APK floating-nav behavior, and re-checking the two `(~)` findings at 320px on
  a real small device.
