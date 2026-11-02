# OpenCode workflow

- Start with `git status` and targeted `glob`/`grep`; read only relevant files or line ranges. Reuse findings already gathered in the session.
- Prefer focused commands and tests (`npm run test -- <pattern>`, `npm run test:e2e -- <spec>`); broaden checks only when requested or the change warrants them.
- Playwright serves the static `out/` export, so run `npm run build` before E2E when source changes need to be reflected there.
- Avoid repository-wide audits, dependency scans, and repeated full-file reads unless the task requires them.
- Before finishing, run `git diff --check` and report only changed files, executed checks, and remaining issues.
