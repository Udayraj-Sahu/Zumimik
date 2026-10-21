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
├── components/             one folder per surface — PascalCase component,
│   │                       kebab-name.module.css, kebab-name.test.tsx
│   ├── ui/                 primitives: button, dialog, glass-card, toaster…
│   ├── shell/              app frame: shell, splash, walkthrough, offline, rate
│   ├── landing/            marketing page sections
│   ├── onboarding/         first-run flow (see onboarding-flow.md)
│   │   ├── onboarding-modal.tsx   entry point + step machine
│   │   ├── intros/                full-screen intro screens + carousel
│   │   ├── slides/                bodies rendered by the carousel
│   │   └── auth/                  auth-modal, auth-panel
│   ├── dashboard/          dashboard-only modals and cards
│   ├── renderers/          question-type renderers (answer input, matrices…)
│   └── <feature>/          arena, pitch, trial-timeline, trap-results,
│                           stall-timer, review-carousel, paywall, …
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
- **Barrels keep call sites short.** Import from `@/lib/text`, `@/lib/theme`,
  `@/lib/platform`, `@/lib/content`, `@/lib/utils`; the folder's `index.ts`
  re-exports its modules.
- **Hooks live in `hooks/`** — including UI hooks such as
  `use-entrance-animations`, `use-feedback`, `use-reduced-motion`.
- **Tests sit next to their subject** and are named after it, not after the
  edge-case theme they exercise.
- **Route folders never hold logic**; they import from `components/` and
  `hooks/`.
