# CC Team Clash Master Plan

Plan date: 2026-07-17

This plan designs CC Team Clash as a modular Next.js system and breaks development into dependency-based modules. It assumes the long-term target is one canonical Next.js App Router application, with legacy static functionality migrated or archived rather than maintained as a second product.

## Architecture Principles

- One application shell: Next.js App Router is the long-term runtime.
- One data model: league, story, schedule, result, player, course, and team types live in shared modules.
- One rendering model: React components render public and admin surfaces.
- One publishing flow: static files first, database later only when multi-device editing and direct publishing are required.
- Security by default: validate imported data, avoid `innerHTML`, constrain URLs, and protect live admin capabilities before enabling writes.
- Incremental migration: stabilize structure first, extract pure logic second, migrate UI third, then retire legacy assets.

## Proposed Modular System

```text
src/
  app/
    page.tsx
    admin/
    schedule/
    standings/
    teams/
    players/
    stories/
  components/
    layout/
    ui/
    league/
    stories/
    admin/
  data/
    league.ts
    stories.ts
    history.ts
  lib/
    league/
    content/
    storage/
    security/
  styles/
    tokens.css
    globals.css
```

## Module Dependency Map

```text
M01 Repository Baseline
  -> M02 Build and Deployment Baseline
  -> M03 Domain Types and Validation
      -> M04 League Calculations
      -> M05 Static Data Layer
      -> M06 UI Foundation
          -> M07 Public Layout and Navigation
          -> M08 Story System
          -> M09 League Public Pages
          -> M10 Admin Draft Publishing
          -> M11 Commissioner League Admin
      -> M12 Legacy Migration and Retirement
  -> M13 Security Hardening
  -> M14 Performance and Asset Strategy
  -> M15 Test Strategy
  -> M16 Documentation and Operations
```

## M01 Repository Baseline

Goal: Correct the repository shape so development, builds, docs, and deployment all refer to the same project root.

Dependencies: None.

Files to create:

- None expected.

Files to modify:

- Repository layout, moving project files out of nested `ccteamclash/` if the repository root is chosen as app root.
- Or Vercel/project settings and docs if `ccteamclash/` remains the app root.
- `README.md`
- `AGENTS.md`

Acceptance criteria:

- Local `main` has a valid `HEAD` commit.
- `rg --files` from the active project root lists application files.
- `npm install`, `npm run lint`, and `npm run build` can be run from the documented app root.
- README clearly states the app root and local setup steps.

Estimated complexity: Medium.

Estimated implementation order: 1.

## M02 Build and Deployment Baseline

Goal: Align package scripts, Vercel configuration, and Next.js runtime expectations.

Dependencies: M01.

Files to create:

- None expected.

Files to modify:

- `package.json`
- `package-lock.json`
- `next.config.ts`
- `vercel.json`
- `.gitignore`

Acceptance criteria:

- Vercel config no longer skips dependency install/build for the Next.js app.
- `npm run build` produces a valid Next.js production build.
- Static legacy deployment behavior is either intentionally preserved under a known route or removed from production.
- Framework and output settings match the chosen architecture.

Estimated complexity: Low to Medium.

Estimated implementation order: 2.

## M03 Domain Types and Validation

Goal: Establish one canonical type system and validation layer for all league and content data.

Dependencies: M01.

Files to create:

- `src/lib/league/types.ts`
- `src/lib/league/validation.ts`
- `src/lib/content/types.ts`
- `src/lib/content/validation.ts`
- `src/lib/shared/slug.ts`
- `src/lib/shared/date.ts`
- `src/lib/security/url.ts`

Files to modify:

- `src/lib-data.ts`
- `src/components/PostEditor.tsx`
- Future data import/export code.

Acceptance criteria:

- Team, player, course, match, result, story, and link types are defined once.
- Story links reject empty labels, empty URLs, and unsafe protocols.
- Imported backup/story data can be validated before use.
- Slug and date formatting helpers replace ad hoc regex/date logic in new code.

Estimated complexity: Medium.

Estimated implementation order: 3.

## M04 League Calculations

Goal: Extract standings, player records, match status, and schedule derivations into pure tested functions.

Dependencies: M03.

Files to create:

- `src/lib/league/standings.ts`
- `src/lib/league/player-records.ts`
- `src/lib/league/schedule.ts`
- `src/lib/league/results.ts`

Files to modify:

- `src/app/page.tsx`
- `src/app/standings/page.tsx`
- `src/app/schedule/page.tsx`
- Future admin and team/player pages.

Acceptance criteria:

- Standings are calculated from results, not manually duplicated records.
- Player records are calculated from attendance/results.
- Open/completed/upcoming match derivations are centralized.
- Functions are deterministic and independent from React or browser APIs.

Estimated complexity: Medium.

Estimated implementation order: 4.

## M05 Static Data Layer

Goal: Replace scattered static data with structured, versioned source files and typed accessors.

Dependencies: M03, M04.

Files to create:

- `src/data/teams.ts`
- `src/data/players.ts`
- `src/data/courses.ts`
- `src/data/matches.ts`
- `src/data/results.ts`
- `src/data/stories.ts`
- `src/lib/content/loaders.ts`

Files to modify:

- `src/lib-data.ts`
- All pages importing from `@/lib-data`.

Acceptance criteria:

- Public pages read from typed data accessors instead of direct mixed arrays.
- Empty arrays are supported without runtime crashes.
- Data can be manually edited and reviewed in small focused files.
- `src/lib-data.ts` is removed or reduced to a compatibility shim during migration.

Estimated complexity: Medium.

Estimated implementation order: 5.

## M06 UI Foundation

Goal: Create reusable design primitives and layout components for the Next.js app.

Dependencies: M02, M03.

Files to create:

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/FormField.tsx`
- `src/components/ui/Table.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/PageShell.tsx`
- `src/styles/tokens.css`

Files to modify:

- `src/components/SiteHeader.tsx`
- `src/app/globals.css`
- Existing pages as they adopt shared components.

Acceptance criteria:

- Shared components cover buttons, cards, page shells, tables, form fields, and empty states.
- Header/footer move into layout-specific component paths.
- Styles use named tokens for color, spacing, typography, and borders.
- Existing visual identity remains recognizable.

Estimated complexity: Medium.

Estimated implementation order: 6.

## M07 Public Layout and Navigation

Goal: Stabilize the public app shell, metadata, navigation, footer, and mobile behavior.

Dependencies: M06.

Files to create:

- `src/components/layout/PublicShell.tsx`
- `src/components/layout/NavLink.tsx`

Files to modify:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/Footer.tsx`

Acceptance criteria:

- Public pages share consistent header/footer structure.
- Navigation covers Home, Stories, Schedule, Standings, Teams, Players when implemented, and Admin.
- Metadata is accurate and extensible.
- Mobile navigation is accessible and keyboard usable.

Estimated complexity: Low to Medium.

Estimated implementation order: 7.

## M08 Story System

Goal: Build a complete typed story publishing and rendering system.

Dependencies: M03, M05, M06, M07.

Files to create:

- `src/components/stories/StoryCard.tsx`
- `src/components/stories/StoryList.tsx`
- `src/components/stories/StoryArticle.tsx`
- `src/components/stories/StoryImage.tsx`
- `src/lib/content/story-export.ts`

Files to modify:

- `src/app/stories/page.tsx`
- `src/app/stories/[slug]/page.tsx`
- `src/app/page.tsx`
- `src/components/PostEditor.tsx`

Acceptance criteria:

- Story list, story card, and story detail rendering are reusable.
- Missing stories render empty states.
- Invalid story slugs return `notFound()`.
- Editor export and copy produce the same validated story shape.
- Related links are validated and rendered safely.

Estimated complexity: Medium.

Estimated implementation order: 8.

## M09 League Public Pages

Goal: Migrate schedule, standings, teams, players, and match history into React pages using shared domain logic.

Dependencies: M04, M05, M06, M07.

Files to create:

- `src/app/players/page.tsx`
- `src/app/teams/[id]/page.tsx`
- `src/components/league/MatchCard.tsx`
- `src/components/league/MatchList.tsx`
- `src/components/league/StandingsTable.tsx`
- `src/components/league/TeamCard.tsx`
- `src/components/league/PlayerCard.tsx`
- `src/components/league/PlayerStats.tsx`

Files to modify:

- `src/app/schedule/page.tsx`
- `src/app/standings/page.tsx`
- `src/app/teams/page.tsx`
- `src/app/page.tsx`

Acceptance criteria:

- Schedule keys are stable and collision-free.
- Standings derive from match results.
- Team pages show roster, upcoming matches, and completed match history.
- Player pages show player records from results.
- Pages work with no teams, no matches, no players, and no results.

Estimated complexity: High.

Estimated implementation order: 9.

## M10 Admin Draft Publishing

Goal: Make the Next.js story editor safe, consistent, and useful for the static publishing workflow.

Dependencies: M03, M08.

Files to create:

- `src/components/admin/StoryDraftEditor.tsx`
- `src/lib/storage/local-draft.ts`
- `src/lib/content/story-draft.ts`

Files to modify:

- `src/app/admin/page.tsx`
- `src/components/PostEditor.tsx`

Acceptance criteria:

- Draft localStorage reads/writes are isolated behind a helper.
- Selected image object URLs are revoked.
- Exported and copied JSON match the canonical story schema.
- Malformed links are rejected or clearly omitted.
- Start-over behavior clears draft and preview safely.

Estimated complexity: Medium.

Estimated implementation order: 10.

## M11 Commissioner League Admin

Goal: Rebuild the legacy commissioner office as modular React admin screens.

Dependencies: M03, M04, M05, M06, M10.

Files to create:

- `src/app/admin/league/page.tsx`
- `src/components/admin/AdminTabs.tsx`
- `src/components/admin/SeasonBuilder.tsx`
- `src/components/admin/CourseManager.tsx`
- `src/components/admin/TeamManager.tsx`
- `src/components/admin/PlayerManager.tsx`
- `src/components/admin/ResultEntry.tsx`
- `src/components/admin/BackupManager.tsx`
- `src/lib/storage/league-local-store.ts`
- `src/lib/storage/backup.ts`

Files to modify:

- `src/app/admin/page.tsx`
- `src/components/layout/SiteHeader.tsx`

Acceptance criteria:

- Legacy admin capabilities exist in React: season, courses, teams, players, scoring, stories, backup.
- Backup import validates schema before replacing local data.
- No dynamic admin content is rendered through `innerHTML`.
- Completed matches cannot be accidentally orphaned by schedule edits.
- Local-only/admin-only limitations are documented in the UI or docs.

Estimated complexity: High.

Estimated implementation order: 11.

## M12 Legacy Migration and Retirement

Goal: Remove the duplicate static product from production after its needed features are migrated.

Dependencies: M08, M09, M11.

Files to create:

- `docs/LEGACY_MIGRATION.md`

Files to modify:

- `index.html`
- `admin.html`
- `app.js`
- `admin.js`
- `team-import.js`
- `team-icons.js`
- `team-icons-ui.js`
- `history-data.js`
- `history-ui.js`
- `styles.css`
- `office.css`
- `history.css`
- `history-stats.css`
- `team-icons.css`
- `vercel.json`

Acceptance criteria:

- Every retained legacy capability has a React replacement or a documented reason to keep it.
- Static legacy files are moved to an archive path, removed, or excluded from production routing.
- Vercel serves the canonical Next.js app.
- README no longer presents conflicting app/admin workflows.

Estimated complexity: Medium to High.

Estimated implementation order: 12.

## M13 Security Hardening

Goal: Reduce browser injection, unsafe URL, backup restore, and admin exposure risks.

Dependencies: M03, M10, M11.

Files to create:

- `src/lib/security/escape.ts`
- `src/lib/security/content-security.ts`
- `docs/SECURITY.md`

Files to modify:

- `next.config.ts`
- `src/lib/security/url.ts`
- Admin import/export modules.
- Any remaining legacy files if they remain deployed.

Acceptance criteria:

- Unsafe URL protocols are blocked in all content/admin flows.
- Backup restore validates data before persistence.
- No newly migrated React paths use `innerHTML`.
- A CSP strategy is documented and, where practical, configured.
- If admin becomes remotely writable, authentication is required before launch.

Estimated complexity: Medium.

Estimated implementation order: 13.

## M14 Performance and Asset Strategy

Goal: Make images, historical data, and repeated calculations efficient and predictable.

Dependencies: M05, M08, M09, M12.

Files to create:

- `src/lib/content/images.ts`
- `src/data/history.ts` or static JSON assets if history is retained.
- `docs/ASSET_STRATEGY.md`

Files to modify:

- Story and league image components.
- Historical stats migration files.
- `next.config.ts`

Acceptance criteria:

- Public story/team imagery has a clear local or remote asset policy.
- Large historical data is split, typed, lazy loaded, or moved to a static JSON asset.
- Repeated standings/player computations are memoized where needed at component boundaries.
- External font/image dependencies are intentional and documented.

Estimated complexity: Medium.

Estimated implementation order: 14.

## M15 Test Strategy

Goal: Add enough automated coverage to protect the data model, calculations, and publishing flow.

Dependencies: M03, M04, M08, M10.

Files to create:

- `src/lib/league/standings.test.ts`
- `src/lib/league/player-records.test.ts`
- `src/lib/shared/slug.test.ts`
- `src/lib/content/story-export.test.ts`
- `src/lib/storage/backup.test.ts`
- Test configuration files if the project adopts Vitest, Jest, or another runner.

Files to modify:

- `package.json`
- `package-lock.json`
- CI/deployment configuration if added.

Acceptance criteria:

- Tests cover standings, ties, point differential, player records, slugs, story export, malformed links, and backup validation.
- `npm test` or equivalent is documented.
- Tests run without requiring a browser unless component/browser tests are intentionally added.
- Critical pure logic is covered before major UI migration continues.

Estimated complexity: Medium.

Estimated implementation order: 15, with M04 unit tests ideally added immediately after M04.

## M16 Documentation and Operations

Goal: Keep the project understandable for future maintainers and commissioners.

Dependencies: M01 through M15 as each area lands.

Files to create:

- `docs/ARCHITECTURE.md`
- `docs/PUBLISHING_WORKFLOW.md`
- `docs/DATA_MODEL.md`
- `docs/DEPLOYMENT.md`
- `docs/ADMIN_GUIDE.md`

Files to modify:

- `README.md`
- `AGENTS.md`
- Existing docs as architecture decisions change.

Acceptance criteria:

- README explains local setup, build, test, deploy, and project root.
- Architecture doc explains module boundaries and dependency direction.
- Publishing doc explains how a commissioner adds stories and league data.
- Deployment doc matches the actual Vercel configuration.
- Admin guide clearly states local-only versus authenticated/live behavior.

Estimated complexity: Low to Medium.

Estimated implementation order: 16, updated continuously during implementation.

## Recommended Delivery Phases

### Phase 1: Stabilize

Modules: M01, M02, M03, initial M15.

Outcome: the repo can be built and reasoned about, with canonical types and validation in place.

### Phase 2: Core Domain

Modules: M04, M05, M06, M07.

Outcome: shared logic, shared data access, shared UI primitives, and stable public shell.

### Phase 3: Public Product

Modules: M08, M09.

Outcome: full public Next.js site for stories, schedule, standings, teams, players, and history.

### Phase 4: Admin Product

Modules: M10, M11, M13.

Outcome: safe React-based publishing and commissioner workflows.

### Phase 5: Cleanup and Scale

Modules: M12, M14, M15 completion, M16.

Outcome: legacy app retired, performance concerns addressed, tests and documentation complete.

## Priority Risks

- Repository layout and deployment mismatch should be fixed before feature work.
- Maintaining both Next.js and legacy static apps will compound every future change.
- Legacy `innerHTML` plus localStorage/backup restore is the highest security risk.
- Lack of tests around league calculations makes standings and player records fragile.
- Admin workflow must be explicitly local-only or protected before it becomes a live editing surface.
