# Project structure

One rule per folder: **a file lives next to what it is about**. If you are
looking for the code behind a URL, a screen, a hook, or a piece of data, the
map below gets you there in two steps.

```
src/
├── app/                    Next.js routes — the URL tree, nothing else
│   ├── (app)/              signed-in shell: dashboard, learn, play, settings
│   ├── auth/               sign in / sign up
│   ├── onboarding/         first-run wizard page
│   ├── globals.css         design tokens (:root / .light) + base styles
│   └── layout.tsx          fonts, providers, <html> shell
│
├── components/             one folder per surface — kebab-case files
│   ├── ui/                 primitives: button, dialog, glass-card, toaster…
│   ├── shell/              app frame: app-shell, dashboard-shell, splash,
│   │                       walkthrough, offline banner, rate prompt
│   ├── landing/            marketing page sections
│   ├── onboarding/         first-run flow (see onboarding-flow.md)
│   │   ├── onboarding-modal.tsx   entry point + step machine
│   │   ├── intros/                intro screens + carousel shell
│   │   ├── slides/                every body rendered by the carousel
│   │   └── ads/                   sponsor reel used by the intros
│   ├── auth/               sign-in modal + panel (landing and /auth)
│   ├── dashboard/          dashboard-only modals, cards and mascot
│   ├── adaptive/           adaptive plan/dashboard/re-prompt screens
│   ├── exam/               exam shell + question navigator
│   ├── explorer/           topic tree / mind map
│   ├── learn/              learn-only modals
│   ├── paywall/            paywall modal + clearance tiers
│   ├── technique/          technique lesson UI
│   ├── renderers/          question-type renderers (answer input, matrices…)
│   └── brand/              mark + wordmark
│
├── hooks/                  every hook, incl. queries/
│   └── queries/            one use-<domain>.ts per service (React Query)
│
├── stores/                 zustand stores, `<domain>-store.ts`; tests alongside
│
├── services/               one `<domain>.ts` per API surface; offline/ for
│                           IndexedDB + sync retry
│
├── lib/
│   ├── types/              zod schemas + TS types, `<domain>.ts`
│   ├── mock/               mock payloads behind the services, `<domain>.ts`
│   ├── text/               format, stats, date-time helpers (barrel: @/lib/text)
│   ├── theme/              theme-tokens (design palette) (barrel: @/lib/theme)
│   ├── platform/           browser, config, haptics, sound, reset-app-state
│   ├── content/            topic → template mapping
│   ├── utils/              cn() and small helpers
│   ├── adaptive/           adaptive engine + modes
│   ├── native/             Capacitor-only bridges (speech, bars, is-native)
│   ├── story/              onboarding story copy + speech
│   ├── firebase/           client init
│   └── notifications/      story reminder scheduling
│
├── providers/              React context providers (query, online status)
├── registry/               shadcn/magicui registry components
└── styles/                 shared non-global stylesheets
```

## Conventions

- **The domain name is the join key.** `lib/types/dashboard.ts` declares it,
  `lib/mock/dashboard.ts` fakes it, `services/dashboard.ts` fetches it,
  `hooks/queries/use-dashboard.ts` caches it, and a screen in
  `app/(app)/dashboard/` renders it. Grep one name to see the whole vertical.
- **Files are kebab-case; components are PascalCase.** `glass-card.tsx` exports
  `GlassCard`, `stall-timer.tsx` exports `StallTimer`.
- **Barrels keep call sites short.** Import from `@/lib/text`, `@/lib/theme`,
  `@/lib/platform`, `@/lib/content`, `@/lib/utils`; the folder's `index.ts`
  re-exports its modules.
- **Hooks live in `hooks/`** — including UI hooks such as
  `use-entrance-animations`, `use-feedback`, `use-reduced-motion`.
- **Tests sit next to their subject** and are named after it, not after the
  edge-case theme they exercise.
- **Route folders only hold routes.** Shared chrome lives in
  `components/shell/` (`dashboard-shell.tsx` owns the auth guard); route
  folders keep only `page`/`layout`/`loading`/`client-page` files.
- **Carousel bodies live in `onboarding/slides/`.** `onboarding/intros/` holds
  the intro screens and the carousel shell (`intro-carousel`, `steps`,
  `intro-surface`, styles); anything rendered by the carousel is a slide.
