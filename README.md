# Zuzumik ⚔️ — "Arena of Champions"

Not a coaching app. **A competitive battlefield** where India's sharpest minds fight, rank, and rise.

Zuzumik is a mobile-first **exam prep & skill-training app** built with **Next.js 14 (App Router) + Capacitor** for Android, featuring a dark glassmorphism design, gamified sprints, habit tracking, adaptive learning, live-friendly rankings, and a "scan to login" device-pairing flow — all wrapped in a shared design system.

> **Branch**: `feature/frontend-standards-improvements`
> **Repo**: https://github.com/Udayraj-Sahu/Zuzumik.git

---

## Table of Contents

1. [Overview](#-overview)
2. [Tech Stack](#-tech-stack)
3. [Feature Map](#-feature-map)
4. [Project Structure](#-project-structure)
5. [Routing](#-routing)
6. [State Management (Zustand stores)](#-state-management-zustand-stores)
7. [Data Layer — Mocks & Queries](#-data-layer--mocks--queries)
8. [Design System & Theyming](#-design-system--theming)
9. [Key Screens & Interactions](#-key-screens--interactions)
10. [Local Development](#-local-development)
11. [Building the Android APK](#-building-the-android-apk)
12. [Capacitor Plugins](#-capacitor-plugins)
13. [Backend Handoff](#-backend-handoff)
14. [Contributing / Convention Notes](#-contributing--convention-notes)

---

## 📖 Overview

Zuzumik turns exam preparation into a game:

- **Learn** — choose an exam prep, browse topics, and track mastery.
- **Sprint** — timed, exam-style competitive bursts (single-domain and full-mock).
- **Practice** — guided technique templates with step-by-step renderers.
- **Habits** — daily check-in reminders with streaks (native notifications on Android).
- **Analytics / Reports / Achievements** — deep-dive performance metrics.
- **Social** — friends, clubs, duels, leaderboards, feed.
- **Pairing login** — WhatsApp-Web-style "scan to login" device pairing UI.

The app is designed for a **static export** (`out/`) consumed by Mobile native shells (Capacitor) and is heavily **mock-first**: every domain has a typed mock data layer so the whole app runs without a backend.

---

## 🧰 Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 14** (App Router, client components) |
| UI | **React 18 + TypeScript + Tailwind CSS** |
| Motion | **GSAP** (springs via the `motion` lib for slider, `gsap` tween for reveals) |
| State | **Zustand 5** with `persist` middleware (localStorage) |
| Server state | **TanStack React Query 5** |
| Mobile shell | **Capacitor 8** (Android), widgets: `app`, `device`, `preferences`, `local-notifications`, `share` |
| Notification engine | **@capacitor/local-notifications 8.3.1** (native, Java 21 toolchain) |
| PWA | **Serwist** (`@serwist/next`) |
| Static export | `next build` + `scripts/fix-asset-paths.js` → `out/` |

---

## 🧩 Feature Map

| Area | Routes | What it does |
|---|---|---|
| **Onboarding** | `/onboarding` | Landing/auth + multi-step profile setup (name, persona, goal, triggers, details). Persisted, resumable. Goal maps to `targetExam`. |
| **Dashboard** | `/dashboard` | Welcome header (streak/XP), swipeable carousel (profile status, stats, week/habits, practice), quick-access grid, topic mastery + recent activity, cognitive radar, upcoming events, leaderboard, referral/invite card. |
| **Learn** | `/learn` | "Choose Your path" — S-curve animated mode selector (Explore / Adaptive / Mock). Exam Prep tabs limited to **onboarding exam + added preps** (`Add Prep` modal). |
| **Explorer** | `/learn/explorer` | Topic tree + technique library. Unlocks once `targetExam` is set (onboarding). |
| **Sprint** | `/play/sprint`, `/play/configure-sprint`, `/play/sprint/results`, `/play/sprint/results/analysis` | Timed exam-style sprints, results, analysis. |
| **Practice** | `/learn/practice` | Technique templates via a renderer registry (division, multiplication, squares, number-line). |
| **Technique** | `/learn/technique/[id]` | Step-by-step technique lessons. |
| **Habits** | via dashboard | `HabitTrackerModal` — daily reminders with native notifications + compact time picker. |
| **Analytics** | `/dashboard/analytics` | Weekly activity, scorecards, session insights. |
| **Mastery** | `/learn/mastery` | Topic mastery heatmap/bars. |
| **Planner** | `/settings/planner` | Training plan/calendar. |
| **Reports / Stats** | `/settings/reports`, `/settings/history` | Performance history & reports. |
| **Social** | `/dashboard/friends`, `/dashboard/clubs`, `/play/duel`, `/settings/leaderboard`, `/dashboard/feed` | Friends, clubs, 1v1 duels, leaderboard, feed. |
| **Profile** | `/settings/profile`, `/settings/profile/edit` | Profile view & editing. |
| **Meta** | `/settings`, `/settings/notifications`, `/settings/help`, `/settings/linked-devices`, `/settings/achievements`, `/settings/history` | Settings, notifications, help, linked devices, achievements, history. |
| **Auth/Web Login** | `/auth` | WhatsApp-Web-style scan-to-login pairing UI (mock pairing for now). |

---

## 🗂️ Project Structure

```
src/
├─ app/                       # Next.js App Router — routes only
│  ├─ (app)/                  # signed-in shell: dashboard, learn, play, settings
│  ├─ onboarding/page.tsx     # first-run wizard
│  ├─ auth/page.tsx           # scan-to-login pairing screen
│  ├─ page.tsx                # marketing landing
│  └─ globals.css             # design tokens (:root / .light) + base styles
├─ components/                # one folder per surface, kebab-case files
│  ├─ ui/                     # design-system primitives
│  ├─ shell/                  # app-shell, dashboard-shell, splash, walkthrough
│  ├─ landing/                # marketing page sections
│  ├─ brand/                  # mark + wordmark
│  ├─ onboarding/
│  │  ├─ intros/              # intro screens + carousel shell
│  │  ├─ slides/              # every carousel body
│  │  └─ ads/                 # sponsor reel
│  ├─ auth/                   # sign-in modal/panel
│  ├─ dashboard/              # dashboard cards, modals, mascot
│  ├─ adaptive/               # adaptive plan/dashboard/re-prompt
│  ├─ exam/                   # exam shell + question navigator
│  ├─ explorer/               # topic tree / mind map
│  ├─ learn/                  # learn-only modals
│  ├─ paywall/                # paywall modal + clearance tiers
│  ├─ technique/              # technique lesson UI
│  └─ renderers/              # question-type renderers
├─ hooks/                     # all hooks
│  └─ queries/                # React Query hooks (typed, mock-backed)
├─ stores/                    # Zustand stores
├─ services/                  # one <domain>.ts per API surface
├─ lib/
│  ├─ types/                  # domain types + zod schemas
│  ├─ mock/                   # typed mock data per domain
│  ├─ text/  theme/  platform/  content/  utils/
│  ├─ adaptive/  native/  story/  firebase/  notifications/
├─ providers/                 # React context providers
├─ registry/                  # shadcn/magicui registry components
└─ styles/                    # shared non-global stylesheets
```

See [`docs/project-structure.md`](docs/project-structure.md) for the full map
and conventions.

---

## 🧭 Routing

Routes are declared as folders under `src/app` (App Router).
- `/` root → marketing landing
- `/onboarding` — auth + onboarding flow (**client**)
- `/auth` — scan-to-login pairing (**client**)
- `/dashboard`, `/learn`, `/play`, `/settings` — signed-in surfaces, gated by
  `DashboardShell` (`src/components/shell/dashboard-shell.tsx`), which redirects
  unauthenticated users to `/onboarding`

Each surface follows the pattern `src/app/(app)/<surface>/<feature>/page.tsx`
plus a matching React Query hook in `src/hooks/queries/`.

---

## 🎛️ State Management (Zustand stores)

Stores live in `src/stores/`. All use `persist` (localStorage) except where ephemeral.

| Store | Purpose |
|---|---|
| `auth-store` | `user`, `token`, `refreshToken`, `isAuthenticated`, login/logout, Firebase login, token setters. |
| `onboarding-store` | `firstName`, `persona`, `goal`, `sex`, `dob`, `triggers`, `targetExam`, `currentStep`, `isOnboarded`, `activePreps`; resume + `setTargetExam` (drive explorer unlock); goal→exam mapping. |
| `habit-store` | Daily habits + completion logs, streaks, completion rate. |
| `referral-store` | Per-user referral code + counters (`invitesSent`, `friendsJoined`). |
| `sprint-store` | Sprint session config/state. |
| `template-store` | Technique render mode / active template. |
| `settings-store` | User settings. |
| `theme-store` | Theme/appearance. |
| `walkthrough-store` | First-run walkthrough state. |
| `network-store` | Offline/network status. |
| `rate-store` | Store rating prompts. |

**Key rules**
- `targetExam` set during onboarding unlocks the explorer topic tree (`useSubjectTree` is `enabled: !!targetExam`).
- A persist `merge` back-fills `targetExam` from the saved goal for already-onboarded users.
- `activePreps` accumulates exams added via the **Add Prep** modal; the Learn page's Exam Prep tabs = `activePreps ∪ {targetExam}`.

---

## 📊 Data Layer — Mocks & Queries

Everything is **mock-first**. `src/lib/mock/*` exports typed fixture data per domain; React Query hooks in `src/hooks/queries/` consume them. `apiUrl()` / `IS_MOCK` in `src/lib/platform/config.ts` (barrel: `@/lib/platform`) gate real HTTP calls:

```ts
// src/lib/platform/config.ts
export const IS_MOCK = process.env.NEXT_PUBLIC_API_MOCK !== "false";
```

- When `IS_MOCK` is truthy (default), hooks/fetchers return mock data immediately (with a small delay).
- When falsy, they call `apiUrl("/v1/...")` with `Authorization: Bearer <token>`.

Representative query hooks: `use-dashboard`, `use-analytics`, `use-sprint`, `use-practice`, `use-explorer`, `use-friends`, `use-duel`, `use-leaderboard`, `use-planner`, `use-history`, `use-notifications`, `use-profile`, `use-reports`, `use-technique`, `use-help`, `use-achievements`, `use-sprint-session`.

---

## 🎨 Design System & Theming

**Dark glassmorphism** throughout. Design tokens live in `src/app/globals.css` (`:root`):

- `--background: #0A0C0A` (near-black, slight green tint)
- `--card: #14170F`
- `--primary: #C8FF5A` (neon lime — the brand accent)
- `--foreground: #ffffff`, `--muted-foreground: #8B8B8B`
- `--border: #24281F`, `--ring: #C8FF5A`
- Choreographed charts: `#C8FF5A`, `#3B82F6`, `#F59E0B`, `#8B5CF6`, `#FF4444`

**Fonts** (via global CSS): headings use `--font-space-grotesk`, body uses `--font-inter`.

**Common patterns**
- Glass cards: `rounded-3xl border backdrop-blur-xl` with `background: rgba(255,255,255,0.04)` (`GLASS_BG`) and border `rgba(255,255,255,0.08)` (`GLASS_BORDER`).
- Section label: `text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/40 uppercase`.
- Active pill tabs: `bg-gradient-to-r from-primary to-[#a8e62e]` on dark text.
- Mobile-first: `max-w-5xl mx-auto`, snap carousels, bottom-sheet modals.
- Animation signature: GSAP `power2.out`/`power3.out` (0.3–0.45s), plus spring sliders via `motion`.

---

## 🖥️ Key Screens & Interactions

### Onboarding (`/onboarding`)
- Auth landing with Google/Phone buttons (mock).
- Multi-step modal: Name → Persona → Goal → Triggers → Details (sex/DOB).
- **Resumable**: reopening resumes at `store.currentStep`; partial data persisted on close.
- Completing sets `targetExam` from the goal (CAT→`cat`, GMAT→`gmat`, GRE→`gre`, else `vedic-math`).

### Dashboard (`/dashboard`)
- Ambient glow header, streak + XP pills, "Welcome back, {name}".
- **Swipeable carousel** with dot indicators + GSAP card reveal:
  1. Profile status (setup progress ring OR "all set")
  2. Your Stats (accuracy, questions, percentile, speed)
  3. This Week + Daily Habits (streak week, habit progress, native reminder)
  4. Practice + Technique cards
  5. Coming-soon placeholder
- Quick Access grid, Topic mastery bars, Cognitive radar, Upcoming, Leaderboard, **Invite/referral card** at the bottom.

### Learn (`/learn`)
- Header "Choose Your path".
- **S-curve mode selector** animating between Explore / Adaptive Learning / Mock (fill is a sheen gradient, white 1px stroke).
- **Exam Prep** tabs = onboarding `targetExam` + exams added via **Add Prep** (`AddPrepModal`).
- Topic mastery cards per domain, Sensei Insight (auto-generated coaching tip), "Explore Techniques" CTA.

### Habit Tracker (`HabitTrackerModal`)
- Create habits, complete daily check-ins, view streaks.
- **Daily Reminder** panel with a compact `type="time"` picker + "Set reminder".
- Native scheduling via `@capacitor/local-notifications` (Android, Java 21 build).
- AndroidManifest includes `RECEIVE_BOOT_COMPLETED` + `POST_NOTIFICATIONS` (survives `cap sync`).

### Invite / Referral (`InviteCard`)
- Dedicated affiliate code (e.g. `ARENA-X7K2M9QD`) generated client-side + persisted.
- Copy code (clipboard) and Share (Capacitor `Share` on native, Web Share API on web).
- Tracks `invitesSent` / `friendsJoined` locally until backend wiring exists.

### Scan-to-Login (WhatsApp-style device pairing)
- **Web side** — `/auth` (`src/app/auth/page.tsx`): creates a pairing session on mount, renders a QR-style frame + copyable 8-char code, live ~2-min expiry countdown, and polls the session every 2.5s until `approved` (shows "Device detected" when the app scans, and `expired` with a "New code" retry).
- **App side** — `/dashboard/scan-to-login`: the phone flow where the user enters the code, confirms the detected device, and links the browser.
- **Device management** — `/dashboard/settings/linked-devices`: lists linked sessions (with "This device" badge), revokes/logs out devices, and links new ones.
- **Mock** — `src/lib/mock/pairing.ts` holds an in-memory coordinator shared by the web + app screens, so the whole flow is testable locally in one browser. In `NEXT_PUBLIC_API_MOCK=false` the service hits the real endpoints (see `BACKEND_HANDOFF.md`).

---

## 🚀 Local Development

```bash
# 1. Install deps
npm install

# 2. Run the dev server (mock mode by default)
npm run dev
# open http://localhost:3000

# 3. Lint
npm run lint

# 4. Type-check (no emitted files)
npx tsc --noEmit

# 5. Production build + static export
npm run build
# outputs to ./out
```

> **Note**: `tsconfig.tsbuildinfo` is a tracked build artifact. Run `git checkout tsconfig.tsbuildinfo` before/after builds and `tsc` to avoid noise, or just ignore it in your local flow.

**Mock vs real backend**: set `NEXT_PUBLIC_API_MOCK=false` (and `NEXT_PUBLIC_API_URL`) to point the app at a real API. See `src/lib/platform/config.ts`.

---

## 📦 Building the Android APK

One-time prerequisites:
- **JDK 21** is required (the `@capacitor/local-notifications@8.3.1` plugin compiles against the Java 21 toolchain). The known-good install is Temurin 21, e.g. `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`.
- Android SDK + Android Studio configured.

Pipeline:

```bash
# 1. Build the web app (static export to ./out)
npm run build

# 2. Sync web assets + native plugins into the android project
npx cap sync android

# 3. Build the debug APK with JDK 21
#  (from the repo root, using the call operator for the path)
$env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
cd android
.\gradlew.bat assembleDebug
```

**Output**: `android/app/build/outputs/apk/debug/app-debug.apk`

> Always `git checkout tsconfig.tsbuildinfo` before builds. `cap sync` recognizes 5 plugins: `app`, `device`, `local-notifications`, `preferences`, `share`.

---

## 🔌 Capacitor Plugins

- `@capacitor/app` — app lifecycle.
- `@capacitor/device` — device info.
- `@capacitor/preferences` — key/value native storage.
- `@capacitor/local-notifications` — native habit reminders (Android).
- `@capacitor/share` — native share sheets (invite card).

App identity: `appId: "com.zuzumik.app"`, `appName: "Zuzumik"`, `webDir: "out"` (see `capacitor.config.ts`).

---

## 🔗 Backend Handoff

**`BACKEND_HANDOFF.md`** is the single canonical handoff — it documents **every** frontend feature and its API contract (auth, pairing/linked-devices, referral, dashboard, sprint, practice, mock exam, flashcards, explorer, techniques, templates, duel, history/reports, analytics, profile/settings, social, notifications/planner/help/achievements, content feedback, offline sync) plus shared type shapes, conventions, and a suggested build order.

Highest-priority items to build first (full contract in `BACKEND_HANDOFF.md`):

1. **Auth (Firebase)** — `POST /auth/google`, `POST /auth/phone`, `POST /auth/refresh`. Blocks everything else in non-mock mode.
2. **Scan-to-login pairing + Linked Devices** — the frontend (web `/auth`, app `/dashboard/scan-to-login`, `settings/linked-devices`) is **fully built and mock-testable**. The backend team implements `POST /pairing/session`, `GET /pairing/session/:id`, `POST .../scan`, `POST .../approve`, `POST .../revoke`, `GET /pairing/sessions` (short-lived ~120s sessions, web polls every 2.5s, approve issues a fresh web-bound token, cap ~5 device sessions per user). See `BACKEND_HANDOFF.md` §2.
3. **Referral / Invite** — `POST /referral/code`, `GET /referral/me`, `POST /referral/redeem`, `GET /referral/notification`. See `BACKEND_HANDOFF.md` §1.

---

## 📝 Contributing / Convention Notes

- **Language**: respond in English only (project-level agent rule).
- **Every verified change** is committed + pushed to `feature/frontend-standards-improvements`.
- **Run `npx tsc --noEmit` (must be COUNT=0) before each commit**; then `git checkout tsconfig.tsbuildinfo`.
- Fonts: no per-element overrides — use the global `--font-space-grotesk` (headings) / `--font-inter` (body).
- No inline secrets/keys; never commit credentials.
- Reuse `GLASS_BG` / `GLASS_BORDER` and the design tokens above for consistency.
- DOMAIN_LABELS (in `src/lib/types/template.ts`) is the source of truth for exam ids/names (`vedic-math`, `gmat`, `cat`, `gre`, `banking`).
