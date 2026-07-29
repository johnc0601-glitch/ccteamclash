# Project Baseline

Recorded on 2026-07-17 after the project foundation stabilization work.

## Source Control

- Current branch: `codex/project-foundation`
- Last commit before this baseline work: `9161f2c40afb05ac2b7ed28bb1424814f147e787`
- Current commit after this baseline commit: `1020175113a5e61c60bdbcef77bced371e48c0be`

## Runtime

- Node.js: `v24.18.0`
- npm: `11.16.0`
- Next.js: `16.2.10`

## Routes

- Application route definitions: 7
- Build route entries: 8, including the generated `/_not-found` route
- Concrete generated URLs: 10, including 3 static story URLs produced by `/stories/[slug]`
- Static pages generated during the build: 12, including Next.js internal pages

Application routes:

- `/`
- `/admin`
- `/schedule`
- `/standings`
- `/stories`
- `/stories/[slug]`
- `/teams`

## Verification

- Build status: PASS (`npm run build`, exit code 0)
- Lint status: PASS (`npm run lint`, exit code 0; 0 errors and 3 warnings)

## Known Warnings

- `app.js`: one `@typescript-eslint/no-unused-vars` warning for `player`.
- `src/components/PostEditor.tsx`: two `@next/next/no-img-element` warnings for local object URL previews.
- npm reported that install scripts for `sharp` and `unrs-resolver` are not covered by the current `allowScripts` configuration.

## Outstanding Vulnerabilities

`npm audit --json` reports 2 moderate vulnerabilities, with 0 high and 0 critical vulnerabilities:

- `postcss` before `8.5.10`: XSS risk in CSS stringify output (`GHSA-qx2v-qp2m-jg93`).
- `next`: reported because Next.js `16.2.10` includes the affected transitive `postcss` version.

npm currently proposes an incompatible Next.js downgrade as the available automated fix, so no automatic audit fix was applied.

## Foundation Change Summary

The foundation change set immediately preceding this baseline changed 56 files with 1,676 insertions and 515 deletions. It:

- Moved the application from the nested `ccteamclash/` directory to the repository root.
- Added the project audit, master plan, and shared-module documentation.
- Added shared constants, types, utilities, and a documented hooks location.
- Standardized shared data types, site constants, the slug utility, and related import paths.
- Regenerated `package-lock.json` from the configured npm registry.
- Stabilized the post editor lint behavior without changing its UI or routes.
- Pinned the Turbopack root to the repository so production builds are deterministic in this workspace.
- Added this `docs/BASELINE.md` record.
