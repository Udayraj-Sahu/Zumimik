# Zuzumik — QA Audit Matrix

Generated against the "Professional Website + APK Frontend Checklist" (35 sections).
Status: `[ ]` unchecked = not yet audited/fixed, `[x]` checked = verified fixed/passing, `(~)` = partial.

Stack under audit: Next.js 14.2 (static export + Serwist PWA), React 18, Zustand (persisted),
TanStack Query v5, Capacitor 8 (android + ios pkgs, no `ios/` workspace yet),
dark theme via `:root` CSS vars in `globals.css` + tailwind custom colors (no separate colors.ts single source),
`IS_MOCK` defaults on.

## Offline strategy (Dexie/IndexedDB) — as wired on this branch
- DB: `src/services/offline/db.ts` — `ZuzumikDB` v2, two tables: `dashboardCache` (`id, updatedAt, trustStatus`, TTL) and `feedbackQueue` (`id, createdAt, retryCount`).
- Read path: `cacheQueryData("dashboard", data)` writes on dashboard data arrival (`use-dashboard.ts:44`).
- **[x] Offline read path wired (this branch):** `useDashboardData` now runs `clearExpiredCache()` on mount, loads `getCachedQueryData("dashboard")` into state, uses it as `placeholderData` when offline, and the queryFn falls back to cached data when a fetch fails while offline (`use-dashboard.ts`). `OnlineProvider` also calls `clearExpiredCache()` on boot.
- Write-buffer path: `submitContentFeedback` (`content-pipeline.ts`) queues to `feedbackQueue` + `syncQueue` when `!isOnline`; `online-provider.tsx` fires `syncAll()` on reconnect (`POST /sync/<key>`, deletes from queue + feedbackQueue on success; failures are retained).
- `network-store` holds `isOnline` + `syncQueue` (id/timestamp, no retry cap on failed syncs).
- **[x] Offline banner UI (this branch):** `src/components/shell/offline-banner.tsx` — fixed top banner rendered from `OnlineProvider`, dismissible, shows queued-action count + manual "Retry sync". Consumes `isOnline` (the previously-unused store value).

Routing map used throughout:
- Public: `/` (landing), `/auth`, `/onboarding`, `/not-found`
- App (behind `DashboardShell` auth gate): `/dashboard`, `/dashboard/analytics`, `/dashboard/feed`, `/dashboard/clubs`, `/dashboard/friends`, `/settings`(+/profile/edit/reports/notifications/leaderboard/linked-devices/planner/history/achievements/help/scan-to-login), `/learn`(+/explorer/mastery/practice/mock/run/technique/[id]), `/play`(+/sprint/configure-sprint/duel/sprint/results/sprint/results/analysis)
- Auth gate: `src/components/shell/dashboard-shell.tsx` + `src/components/shell/app-entry.tsx`

---

## 1. 📊 Design System & Visual Consistency

### Global
- [~] One source of truth for colors/tokens — `:root` CSS vars in `globals.css` + tailwind `colors` in `tailwind.config.ts`; **JS-side glass/violet tokens centralized** in `src/lib/theme/theme-tokens.ts` (`GLASS_BG`, `GLASS_BORDER`, `VIOLET`, `VIOLET_DIM`, `VIOLET_GLOW`) — replaced 27 files' duplicated local glass/border constants; **all `GLASS_*` JS tokens are now `var(--glass-*)` references** (incl. `GLASS_BORDER`, `GLASS_02`, `GLASS_025`, `GLASS_06`) so they flip in light mode automatically; the generated `.light` block omits `--glass-02/025/06`, so those are added in the hand-written `.light` override (`globals.css` ~481-484) as black-alpha values; system-wide hex-usage sweep pending (landing + per-screen accent palettes to Phase 6 follow-up)
- [x] Light theme **scoped to app shell** — `.light` flips `[data-theme-scope]` subtrees only (AppShell root + app-internal modal portals: exam-date, add-prep, paywall, adaptive-reprompt, onboarding-modal, habit-tracker-modal, and all 8 onboarding intro overlays arena/feature/story/plan/pitch/seat-builder/family/family-hub). Landing page + landing components + auth/onboarding login page stay **dark always** (zero landing edits per user directive). Toggle: Settings → APPEARANCE.
- [x] Dark theme completely implemented
- [~] Theme switching — persisted via `theme-store` (`zuzumik-theme` in localStorage); **white-alpha utilities flip automatically in light mode** because `tailwind.config.ts` maps `white: "rgb(var(--color-white-rgb) / <alpha-value>)"` and `.light` sets `--color-white-rgb: 0 0 0` (confirmed in compiled CSS). Keep-dark console chrome chips (`bg-black/XX` panels with `border-white/·`, e.g. paywall HUD cards, onboarding billing switch/receipt, arena/story/seat/feature/family intro chips) re-assert white via the `.light .keep-white` class (globals.css ~780) so their white borders/icons stay visible in light; same for the dashboard `RollingNumber` odometer rail. `DEEP_BLACK` stays literal — it's a solid surface color, not an alpha glass.

### Theme edge cases
- [x] Text readable (dark mode) — tokens flip via `.light`; residual keep-dark chrome uses `.keep-white` to preserve white-alpha borders/labels (paywall HUD, onboarding chips, dashboard odometer rail)
- [x] Disabled elements distinguishable (dark mode) — disabled controls rely on `disabled:opacity-*` (theme-agnostic) + `text-muted-foreground`; all exam controls on scoped pages flip correctly
- [ ] Placeholder contrast sufficient (dark mode) — `placeholder:text-muted-foreground` used; spot-check pending
- [x] Borders don't disappear in dark mode — all `border-white/·`/`bg-white/·` utilities flip via `--color-white-rgb` in light; `GLASS_BORDER`, `GLASS_02/025/06` converted to var refs (see Global section); keep-dark console chips re-assert white via `.keep-white`
- [ ] Shadows work in dark mode
- [ ] Images/logos don't become invisible
- [ ] SVG icons inherit theme correctly
- [ ] Charts adapt to theme (dark)
- [ ] Loading skeletons adapt to theme (dark)
- [x] Empty states adapt to theme (dark) — all empty-state messages use `text-muted-foreground`/`text-muted-foreground/60` (flip via token); empty-state containers use `GLASS_BG`/`bg-white/[0.06]`/`border-white/[0.06]` (var refs / flip via `--color-white-rgb`); verified on settings history/leaderboard/achievements, sprint results, sprint config, linked-devices
- [~] No hardcoded colors outside design tokens — most duplicated glass/lime/violet constants centralized in `theme-tokens.ts`; raw hex sweep (`rg` of hex/rgb in `.ts/.tsx`) still pending for per-screen accents (landing components historically raw-styled)
- [~] Primary/secondary/accent/neutral usage defined — tokens exist; usage audit pending
- [ ] Typography scale consistent (Space Grotesk / Inter / JetBrains Mono via `next/font`)
- [ ] Font weights consistent
- [ ] Border radius system consistent
- [ ] Shadow/elevation system consistent
- [ ] Spacing follows a defined scale
- [~] Icon library consistent — lucide-react; stroke/fill consistency pending
- [ ] Icons have consistent stroke/fill style
- [ ] Button styles standardized
- [ ] Input styles standardized
- [ ] Card styles standardized
- [ ] Modal/dialog styles standardized
- [ ] Toast/notification styles standardized

---

## 2. 📱 Responsive Design

Breakpoints to verify per route (`dashboard`, `learn`, `play`, `settings` trees + landing):
360 / 375–430 / 431–600 / 601–768 / 769–1024 / 1025–1366 / 1367–1600 / 1601+; zoom 80–200%.

- [ ] No horizontal scrolling
- [ ] No content clipped
- [ ] No overlapping elements
- [ ] Buttons fit viewport
- [ ] Long text wraps correctly
- [ ] Cards resize correctly
- [ ] Tables have mobile strategy
- [ ] Navigation converts correctly
- [ ] Bottom navigation doesn't overlap content (`MOBILE_NAV` in `src/components/shell/app-shell.tsx`)
- [ ] Fixed elements don't cover buttons
- [ ] Modals fit screen
- [ ] Keyboard doesn't hide inputs
- [ ] Forms usable with keyboard open
- [~] Safe-area padding works (`viewportFit: cover` set; `env(safe-area-inset-*)` wired in `app-shell`, `exam-shell`, onboarding components)

Tablet / Desktop sizing (sidebar `lg:ml-[250px]`, max-w content) — audit pending.

---

## 3. 🧭 Navigation
- [ ] Every navigation link works
- [ ] Active route highlighted (`sidebar` download or state in app-shell)
- [ ] Back/forward navigation works
- [ ] Refresh preserves route (static export + persisted stores)
- [ ] Deep links work
- [ ] Invalid routes → `src/app/not-found.tsx` (exists; e2e passing)
- [x] Protected routes redirect correctly — `app-entry.tsx` now `router.replace("/onboarding")` for unauthenticated app-route prefixes (`/dashboard*`, `/settings*`, `/learn*`, `/play*`); `dashboard-shell.tsx:16` is the secondary in-shell guard; e2e `landing.spec.ts` "protected app route redirects" green on both projects
- [x] Unauthorized cannot access protected screens — same gate; URL now lands on `/onboarding` (previously stayed on `/dashboard` while rendering onboarding in-place)
- [ ] Login redirect preserves intended destination
- [ ] Logout clears protected navigation state
- [ ] Sidebar closes after navigation on mobile
- [ ] Mobile menu doesn't stay open after route change (`app-shell.tsx:38-40`)
- [ ] Breadcrumbs correctness
- [ ] External links open correctly
- [ ] No accidental duplicate tabs/windows

### Back-button edge cases
- [~] Android back works — `src/app/capacitor-init.tsx` hardware back + SPA nav-depth handler
- [ ] Back closes modal first
- [ ] Back closes drawer first
- [ ] Back from form doesn't lose data
- [ ] Back after login correct
- [ ] Back after logout doesn't expose authenticated page

---

## 4. 🖱️ Interaction (every clickable)
- [ ] Default / hover / focus / active / disabled / loading / error / success states
- [ ] Min touch target ~44px
- [ ] No double submission
- [ ] Loading indicator + disable while processing
- [ ] Keyboard activation (Enter/Space)
- [ ] No duplicate requests on double-click/tap
- [ ] No race conditions on rapid navigation
- [ ] No multiple modals / toast flood

---

## 5. 📝 Forms
Forms inventory: auth (`components/auth/auth-panel.tsx`), profile edit, planner, configure-sprint, mock-exam answer input, settings forms, add-prep-modal, habit-tracker.
- [ ] Required fields marked
- [ ] Validation timing correct
- [ ] Error near field + understandable
- [ ] Error clears on correction
- [ ] Submit disabled appropriately / loading / success
- [ ] Server + network errors handled
- [ ] Form data preserved after error
- [ ] Paste / autofill / password-manager / mobile keyboard
- [ ] Password visibility toggle
- [ ] Date/number/decimal/search/file inputs

---

## 6. 📊 Tables & Data Grids
Surface: leaderboard, history, achievements, analytics, friends, sprint results.
- [ ] Empty / one / many / 100+ rows
- [ ] Long text
- [ ] Sorting / filtering / searching
- [ ] Pagination + page-size change
- [ ] Selection (all/clear) / row actions
- [ ] Loading / error / no-result
- [ ] Responsive + horizontal scroll where required
- [ ] Sticky header / columns no overlap
- [ ] Column widths usable; long numbers no overflow
- [ ] Dates formatted consistently

---

## 7. 🔍 Search & Filter
Surfaces: learn/explorer, leaderboard, friends, feed, history.
- [ ] Normal / empty / 1-char / very-long / special-char search
- [ ] No results / case-insensitive / leading-trailing spaces
- [ ] Rapid typing (debounce) / loading / failure / clear
- [ ] Multiple filters + reset + persistence
- [ ] Pagination-after-filter reset-to-page-1 edge case

---

## 8. 🔄 API / Backend States
All query hooks in `src/hooks/queries/*`, services in `src/services/*`, base client `src/services/api.ts`.
Currently `IS_MOCK=true` by default (`src/lib/platform/config.ts:4`) — mock layer (300ms latency in auth-store) is the primary test surface until a real API is wired.
- [ ] 200/201/204, 4xx (400/401/403/404/409/422/429), 5xx (500/502/503)
- [ ] Timeout / network disconnected / slow network / empty / malformed / null fields
- [~] 401 → refresh → retry implemented in `api.ts:30-55` (no logout-on-expire audit)
- [ ] Stale response doesn't overwrite newer data (race condition audit for all `useQuery` hooks)

---

## 9. 🌐 Network Handling & Offline
- [x] Offline detection — `online-provider.tsx` + `network-store` + `services/device.ts`
- [x] Offline sync queue — `services/offline/{sync,db}.ts` (Dexie)
- [~] PWA SW — `src/app/sw.ts` (Serwist, `defaultCache`, reloadOnOnline)
- [x] Offline banner UI — `components/shell/offline-banner.tsx` (dismissible, retry sync, queued count)
- [x] Cached data served appropriately — dashboard offline fallback via `getCachedQueryData` (`use-dashboard.ts`)
- [~] Actions needing internet disabled/handled — banner + queued feedback only; audit explicit disabled states
- [~] Retry button / auto-retry without infinite loop — banner retry + `syncAll` on reconnect; no retry cap on failed syncs
- [~] User-entered data not lost — `feedbackQueue` persists in Dexie; verify all mutation surfaces offline-queue

---

## 10. ⚡ Performance
- [ ] Initial load optimized (static export; bundle split audit pending)
- [~] Images optimized / lazy loading — `loading="lazy" decoding="async"` added to app-route `<img>` in feed (stories, videos) + clubs covers; alt text present; fixed-dimension containers (no CLS)
- [~] Code splitting — dynamic imports in some paths
- [x] Route-level loading — `src/app/(app)/loading.tsx` added
- [~] Fonts optimized (`next/font`, display swap)
- [ ] Unused deps removed (animejs vs gsap vs motion overlap?)
- [ ] No unnecessary re-renders / memory leaks
- [ ] Large lists virtualized
- [ ] API requests minimized; caching implemented (QueryClient staleTime 5m, retry 1 — `query-provider.tsx`)
- [ ] Core Web Vitals (LCP/INP/CLS) — Lighthouse baseline needed

### APK
- [ ] Launch time / transitions / scroll / animation FPS / memory / battery / large-list / no freezes

---

## 11. 📱 Capacitor / APK
- [~] `capacitor.config.ts` exists; android generated; `@capacitor/{core,app,device,preferences,local-notifications,share,android,ios}`
- [ ] No `ios/` workspace — iOS sections blocked until `npx cap add ios`
- [~] Splash screen, status bar, navigation bar, safe area, keyboard, rotation, background/resume/kill-reopen — **safe-area insets wired throughout** app-shell/exam-shell + onboarding screens (`env(safe-area-inset-*)`); **Keyboard/StatusBar/SplashScreen plugins NOT installed** — add (Phase 7, native step)
- [ ] Deep links, external links, file picker, camera/storage/notification permissions
- [ ] Lifecycle: open → login → minimize → another app → return → continue
- [ ] Real-device matrix (small/standard/large phone, tablet, old Android, low-RAM, large-font)

---

## 12. ⌨️ Keyboard & Input (APK)
- [ ] Keyboard doesn't hide input/submit — needs `@capacitor/keyboard` `resize`/`resizeOnFullScreen` (Phase 7 native step)
- [ ] Screen scrolls when keyboard opens — WebView default; verify on device
- [ ] Keyboard closes after submit
- [~] Correct keyboard types — `type="email"`/`type="number"`/`type="password"` present in auth/onboarding inputs (spot-checked)
- [ ] Enter / next-field navigation / cursor preserved

---

## 13. 🔐 Frontend Security
- [ ] No secrets / private / service-role keys in frontend (env separation audit)
- [~] Auth token currently stored in `localStorage` via zustand persist (shift to `@capacitor/preferences` on native; risk noted)
- [ ] Token expiry handled (partial: refresh in api.ts; no proactive expiry logout)
- [ ] Logout clears sensitive state (audit all persisted stores)
- [~] Protected routes client-enforced (dashboard-shell); note: static export = no server guard, acceptable for SPA+Capacitor
- [ ] Input escaped/sanitized, no dangerous HTML injection (`dangerouslySetInnerHTML` audit)
- [ ] External URLs validated
- [ ] Debug logs removed prod; source maps policy; error messages don't leak internals

---

## 14. 🔑 Authentication
- [~] Login/logout flows in `auth-store.ts` (mock + firebase + api paths)
- [~] Firebase client exists (`lib/firebase/client.ts`) — google + phone
- [ ] Signup: existing email / invalid email / weak password / mismatch / empty / verify-fail / network-fail
- [ ] Login: wrong pw / unknown user / expired session / locked / remember / logout
- [ ] Session: expiry / refresh / multi-tab / multi-device / logout-elsewhere

---

## 15. 🔔 Notifications / Toasts
- [ ] Success/error/warning/info, long message, multiple simultaneous
- [ ] Auto-dismiss + manual dismiss
- [ ] Mobile positioning, dark mode, doesn't cover controls
- [~] Local notifications plugin present (`@capacitor/local-notifications`; `lib/notifications/story-reminders.ts`)

---

## 16. 🌀 Loading States
- [x] Initial loading / skeleton / page loading (dashboard skeleton, learn mock/topic skeletons, mastery skeletons)
- [x] No blank screens (splash → `AppEntry`; route frames)
- [x] Route-level loading boundary — `src/app/(app)/loading.tsx` added (spinner + label)
- [ ] Table/button loading, upload progress, lazy-image placeholders (remaining sweeps)

---

## 17. ❌ Error States
Every major screen: loading / success / empty / error / retry / refresh.
- [~] API failure with retry: `/dashboard` (full-page error + Retry via `refetch`), `/learn` topics + mock papers (inline error + Retry), `/learn/mastery` (inline error — retry button pending)
- [x] Root error boundary now logs via `console.error` — `src/app/error.tsx` (route errors)
- [x] Global error boundary added — `src/app/global-error.tsx` (uncaught render/nav errors, reload button)
- [x] Silent query errors surfaced: `/settings/profile` (error state + Retry instead of infinite spinner), `/learn/explorer` (inline banner for subject-tree/technique failures), `/play/duel` (inline banners for setup + session), `/learn/practice` (error card + Back to Learn/Retry)
- [ ] Network failure / permission failure / session expiry / unexpected exception (remaining sweeps)

---

## 18. 🕳️ Empty States
- [~] New user / no records: `/dashboard` (empty-safe defaults — fabricated `FALLBACK_*` no longer shown on loading/error), `/learn` ("No topics yet. Add a prep to get started." + "No papers yet for X"), `/learn/mastery` ("No mastery data yet. Complete a sprint…")
- [~] No friends / no activity / no pending requests — `/dashboard/friends` now shows icon + title + subtitle per tab (previously blank list on `friends`/`activity` tabs)
- [ ] No search results / no notifications / no history / no uploads — each with icon + explanation + next action (remaining sweeps)

---

## 19. 🖼️ Images & Media
- [~] Missing/broken/slow/large/very-small images — **`loading="lazy"` + `decoding="async"`** added to app-route `<img>` (feed stories/videos/hero, clubs covers); fixed-dimension containers (no CLS); alt text present
- [ ] WebP/AVIF support audit in static assets

---

## 20. ♿ Accessibility
- [x] Skip link (`layout.tsx`), semantic structure, `lang="en"`
- [~] Keyboard navigation & visible focus (axe `keyboard-navigation` rule not enforced — axe only checks name/aria/contrast)
- [~] Proper headings / labels / alt text / accessible buttons & dialogs
- [~] Screen reader compatibility (axe semantic checks on `/`, `/auth`, `/onboarding`; full app-route sweep pending)
- [~] Color not sole indicator; sufficient contrast (automated axe scan on public routes passing)
- [x] **Reduced-motion gating (this branch):** CSS rule in `globals.css:129` covers CSS animations/transitions; JS-driven GSAP entrances now gated behind `prefers-reduced-motion` via `src/lib/use-entrance-animations.ts` (`useEntranceAnimations()` → `headerRef`/`animateSection`/`staggerIn`/`reduced`). Applied to all app-route header/section entrances, data-load staggers (achievements, reports, planner, mastery, feed, clubs, friends, history rows, leaderboard, help cards, notifications) and result reveals (sprint results, history detail). Landing loops already gated via `usePrefersReducedMotion()` (constellation-coach, ai-scan-line, rank-signal). Modal open/close fades and user-answer feedback pops (brief, intent-carrying) intentionally left animated.
- [ ] Text scaling; touch targets ≥44px

**Verified so far (axe, serious+critical = 0 on public routes):**
- `aria-command-name` fixed on `constellation-coach.tsx:126` — interactive star `<g role="button">` now labelled `Mechanics — Strength`, `Algebra — Needs work`, etc.

---

## 21. 🎞️ Animation
- [ ] Purpose / not excessive / not blocking / smooth
- [~] GSAP in app-shell, dashboard page (stagger, entrance) + animejs + motion deps
- [~] Mobile perf; reduced-motion; no frozen loaders; modal/page transitions
- [x] **reduced-motion now honored on landing loops:** `constellation-coach`, `ai-scan-line`, `rank-signal` gate their rAF/setInterval behind `usePrefersReducedMotion()` (`src/lib/use-reduced-motion.ts`) — no perpetual re-render for users/axe with `prefers-reduced-motion: reduce`. Other GSAP/`motion` entrances not yet gated.

---

## 22. 📐 Content Edge Cases
- [ ] Short/very-long/one-word/paragraph text, Unicode, emoji, Hindi (if supported), numbers, dates, currency, long usernames/emails
- [ ] `WWWWWWWW...` and `iiiiiiii...` wrap tests

---

## 23. 📅 Date & Time
- [ ] Picker / invalid / min / max / same start=end / start>end / timezone / midnight / month & year boundary / leap year / past / future
- [ ] Zuzumik: Start Date < End Date enforced everywhere (planner, sprint config)

---

## 24. 💾 State Management
Stores (14): `src/stores/*` (auth, theme[dropped], network, onboarding, settings, plans, resume, sprint, adaptive, habit, paywall, referral, rate, walkthrough, template).
- [ ] Initial / loading / updated / reset / persisted / logout / refresh / navigation / stale / race states
- [ ] No unnecessary global state; single source of truth
- [ ] Store reset on logout; version-safe persistence; no sensitive persisting

---

## 25. 🗄️ Local Storage / IndexedDB
- [~] Dexie offline DB (`services/offline/db.ts`); zustand persist via `safeLocalStorage`
- [ ] First install / existing / corrupted / migration / unavailable / quota exceeded
- [ ] Logout clears required data; user switching; multi-tab; stale cache / invalidation

---

## 26. 📤 File Upload
- [ ] Valid/invalid, wrong ext/MIME, empty, huge, duplicate, corrupted
- [ ] Cancel / retry / network interruption / progress / multiple / preview / removal
- [~] Where? profile edit / reports — inventory

---

## 27. 🔄 Refresh & Persistence
- [ ] Enter data → refresh
- [ ] Login → refresh (auth persists; nav restore)
- [ ] Open form → navigate away → return
- [ ] Open APK → kill → reopen

---

## 28. 🌐 Browser Compatibility
- [ ] Chrome / Edge / Firefox / Safari / Android Chrome / iOS Safari (if applicable)
- [ ] CSS, animations, dialogs, upload, localStorage, IndexedDB, auth, responsive

---

## 29. 🚀 Production Build
- [~] Build chain: `prebuild` clean-export → `next build` → fix-asset-paths; `output: "export"`
- [ ] Env separation (no localhost/dev URLs; `NEXT_PUBLIC_API_URL` default empty)
- [ ] No console debugging / TODO / placeholder text / mock data leaks / broken links / unused routes / dev banners
- [ ] Error tracking + analytics configured
- [ ] Favicon / app icon / splash / metadata / OG (`layout.tsx` has metadata; icon assets verify)

---

## 30. 📈 SEO
- [~] title, description, canonical, OG, Twitter, JSON-LD (schema.org WebApplication)
- [~] sitemap (`src/app/sitemap.ts`), robots (`src/app/robots.ts`)
- [~] semantic HTML, 404 page (`not-found.tsx`)
- [ ] Heading hierarchy, alt text, clean URLs, redirects, structured data per-page

---

## 31. 📊 Analytics
- [ ] Page view / login / signup / search / filter / button / form / exam started/completed / question answered / payment init/completed / error / logout
- [ ] No sensitive tracking; provider decision (Firebase Analytics exists in deps)

---

## 32. 🧪 Testing Strategy
- [x] **Harness installed (Phase 0 done):** vitest + @testing-library (unit), Playwright + @axe-core (e2e + automated a11y), configured with `npm run test` / `npm run test:e2e`.
  - `vitest.config.ts` + `vitest.setup.ts` (jsdom, jest-dom); unit: `src/lib/utils.test.ts` (3 passing).
  - `playwright.config.ts`: static-export served via `serve out -p 3210` (next start incompatible w/ `output: export`); projects `chromium` + `mobile-chrome` (Pixel 7); `workers: CI ? 1 : 4`.
  - Specs: `landing.spec.ts` (title, 404, protected redirect), `a11y.spec.ts` (`/`, `/auth`, `/onboarding` axe scan, reduced-motion emulation, 90s timeout, serious+critical only), `debug-redirect.spec.ts` (redirect regression).
  - **Known flake:** the `/` axe scan intermittently times out under parallel load (`>90s`); passes solo in ~7-10s. Left as-is per user directive; landing rAF/interval loops now respect `prefers-reduced-motion` (`constellation-coach`, `ai-scan-line`, `rank-signal`) which removed the perpetual main-thread renders during scans.
  - Suite status: unit green; e2e 14/14 passing when no `/`-scan timeout hits.
- [ ] Component tests (Button, Input, Modal, Card, Dropdown, Table)
- [ ] Integration (Login→Dashboard, Search→Filter→Results, Create→Save→Display)
- [ ] E2E (Signup→Login→Select exam→Start→Answer→Submit→Result)
- [ ] Device (desktop/tablet/Android; iOS pending workspace)

---

## 33. 🧑‍💻 Code Quality
- [ ] Reusable components / no huge components / no duplicated logic
- [ ] Consistent naming / TS types correct / no unnecessary `any` / no unused imports/states/dead code
- [ ] No magic numbers/colors, no hardcoded API URLs, centralized env
- [ ] Shared components/constants; centralized error handling (`api.ts` ApiError); API layer separated from UI (`services/*` vs components)

---

## 34. 🧠 UX Edge Cases (every feature)
- [ ] Double click / very fast click / no internet / internet returns / 30s API / empty / invalid data / refresh / back / close app / rotate / theme change / size change / huge content / no data / thousands of rows / session expiry / unauthorized / same page two tabs / retry after failure

---

## 35. 🏆 Final Release Gate

| Area | Pass |
|---|---|
| UI consistency | ☐ |
| Design system | ☐ |
| Responsive | ☐ |
| Mobile | ☐ |
| Tablet | ☐ |
| Desktop | ☐ |
| Navigation | ☐ |
| Forms | ☐ |
| Validation | ☐ |
| API states | ☐ |
| Error handling | ☐ |
| Empty states | ☐ |
| Loading states | ☐ |
| Offline behavior | ☐ |
| Authentication | ☐ |
| Accessibility | ☐ |
| Performance | ☐ |
| SEO | ☐ |
| Security | ☐ |
| Capacitor | ☐ |
| Android lifecycle | ☐ |
| Keyboard | ☐ |
| Storage | ☐ |
| File upload | ☐ |
| Browser compatibility | ☐ |
| Analytics | ☐ |
| Production build | ☐ |
| E2E testing | ☐ |
| Code quality | ☐ |

---

## Key pre-existing findings (from route code audit)
1. **Test infra absent** — no jest/vitest/playwright/cypress; no `test` script (Phase 0).
2. **Mock-first** — `IS_MOCK` defaults true (`config.ts:4`); most screens render mock data. Real API-state verification (401/403/429/500/timeout) needs the mock layer to simulate failures, or a real backend.
3. **Token in localStorage** — `auth-store` persists via `safeLocalStorage`; native builds should use `@capacitor/preferences` to avoid WebView storage exposure. (Phase 5.)
4. **Dark-default, light-opt-in** — light theme is scoped to `[data-theme-scope]` subtrees (AppShell + app-internal modal portals incl. onboarding-modal, habit-tracker-modal, and the 8 onboarding intro overlays) via Settings → APPEARANCE; landing/onboarding/auth never flip. FOUC mitigation: `html.loading #main-content{opacity:0}` until `AppEntry` removes `loading`. Browser FOUC-prevention can't pre-apply `.light` before React mounts; minor dark→light flash acceptable on in-app reload.
5. **No `ios/` Capacitor workspace** — iOS device/after-build checks blocked until `npx cap add ios`.
6. **No analytics/error tracking** — Firebase SDK present but not wired for analytics/crashlytics in frontend. (Phases 6/31.)
7. **No route-level loading/error boundaries** — only `AppEntry` splash + `not-found`; per-route `loading.tsx`/`error.tsx` absent. (Phases 16/17.)
8. **No reduced-motion handling** — GSAP entrances (app-shell, dashboard page) ignore `prefers-reduced-motion`. (Phase 20/21.)

> Note: Phase 1 (light theme) ships as a scoped app-shell opt-in (Settings → APPEARANCE); landing/onboarding/auth remain permanently dark per user directive. All `GLASS_*` JS tokens are now `var(--glass-*)` refs (incl. `GLASS_BORDER`, `GLASS_02/025/06`) so they flip in light mode; landing SVG-attr usage resolves to dark `:root` values (landing never flips), so no literal tokens remain. `DEEP_BLACK` stays literal — solid surface, not glass. Dead `.light .dark-scene` block (~289 lines) and the html `data-theme` pre-hydration script removed (both unreferenced); `error.tsx`/`not-found.tsx` use only flip-safe tokens and need no scoping. The `.light` scope uses `[data-theme-scope]` + `.keep-white` (globals.css ~489-492) to re-assert white-alpha on keep-dark chrome (image covers, fixed CTAs, console chips).