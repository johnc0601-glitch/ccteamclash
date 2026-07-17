# CC Team Clash Project Audit

Audit date: 2026-07-17

Scope note: the local working tree currently has no checked-out application files and the local `main` branch has no `HEAD` commit. The application source was reviewed from `origin/main`, where the project is stored under the top-level `ccteamclash/` directory.

## 1. Project Summary

CC Team Clash is a disc golf league website with stories, schedule, standings, teams, player/history views, and commissioner publishing tools.

The repository currently contains two overlapping products:

- A newer Next.js App Router site under `ccteamclash/src`.
- A legacy static/hash-routed site under `ccteamclash/index.html`, `admin.html`, and plain JavaScript/CSS files.

The README describes the intended direction as a low-cost Next.js news site with static publishing and no database at first. The legacy static app, however, already contains a broader commissioner office and localStorage-backed league management system.

## 2. Tech Stack

- Next.js `16.2.10`
- React `19.2.4`
- TypeScript `5`
- Tailwind CSS `4` via PostCSS, though most styling is hand-written CSS
- ESLint `9` with Next core web vitals and TypeScript config
- Vercel configuration currently set for static output from the repository directory, not a standard Next.js build
- Plain HTML, CSS, and browser JavaScript for the legacy public site and commissioner office
- Browser `localStorage` for legacy league data and Next.js draft story storage
- Static TypeScript data module for the Next.js site

## 3. Folder Structure

Remote project tree:

```text
ccteamclash/
  README.md
  AGENTS.md
  CLAUDE.md
  package.json
  package-lock.json
  next.config.ts
  tsconfig.json
  eslint.config.mjs
  postcss.config.mjs
  vercel.json
  index.html
  admin.html
  app.js
  admin.js
  team-import.js
  team-icons.js
  team-icons-ui.js
  history-data.js
  history-ui.js
  styles.css
  office.css
  history.css
  history-stats.css
  team-icons.css
  assets/teams/
  public/
  src/
    app/
      layout.tsx
      page.tsx
      admin/page.tsx
      schedule/page.tsx
      standings/page.tsx
      teams/page.tsx
      stories/page.tsx
      stories/[slug]/page.tsx
      globals.css
    components/
      PostEditor.tsx
      SiteHeader.tsx
    lib-data.ts
```

The checked-out repository root is one level above the actual project folder in `origin/main`. That nesting should be corrected before normal development continues.

## 4. Routing Architecture

Next.js routes:

- `/` from `src/app/page.tsx`
- `/admin` from `src/app/admin/page.tsx`
- `/schedule` from `src/app/schedule/page.tsx`
- `/standings` from `src/app/standings/page.tsx`
- `/teams` from `src/app/teams/page.tsx`
- `/stories` from `src/app/stories/page.tsx`
- `/stories/[slug]` from `src/app/stories/[slug]/page.tsx`

The dynamic story route uses `generateStaticParams()` from `stories` in `src/lib-data.ts`.

Legacy routes:

- `index.html` renders into `#app`.
- `app.js` uses `location.hash` for `#home`, `#stories`, `#schedule`, `#results`, `#standings`, `#teams`, `#players`, `#team/:id`, and `#story/:id`.
- `admin.html` is a tabbed commissioner UI, not URL-routed.

The two route systems are independent and do not share components, data access, or navigation conventions.

## 5. Database/Data Model

There is no server database.

Next.js data lives in `src/lib-data.ts`:

- `stories`: slug, title, excerpt, category, date, image class, body paragraphs, optional links
- `teams`: name, record, differential
- `matches`: date, time, course, home, away

Legacy localStorage data uses key `tc-league-v1`:

- `teams`: id, symbol, name, captain
- `players`: id, name, teamId
- `courses`: id, name, address, mapUrl
- `matches`: id, date, home, away, courseId
- `results`: id, matchId, home, away, date, courseId, scores, attendance arrays, note
- `stories`: id, title, summary, body, category, date, image, link

Next.js `PostEditor` stores a separate browser draft under `cc-draft` and exports JSON for manual insertion into `src/lib-data.ts`.

## 6. Component Hierarchy

Next.js:

```text
RootLayout
  page-specific <main>
    SiteHeader
    page sections
    Footer

/admin
  SiteHeader
  PostEditor
  Footer
```

Shared React components are limited to:

- `SiteHeader`
- `Footer`
- `PostEditor`

Legacy static UI is composed by imperative rendering functions in `app.js` and `admin.js`, for example `home()`, `storiesPage()`, `teamsPage()`, `renderDashboard()`, `renderSeason()`, and `renderStories()`.

## 7. State Management

Next.js:

- Mostly server-rendered static imports from `src/lib-data.ts`.
- `PostEditor` uses local React component state, `useMemo`, refs, and `localStorage`.
- No global state, context, reducers, query client, or server actions.

Legacy static app:

- Global mutable `league` object.
- `localStorage` persistence through `tc-league-v1`.
- DOM event handlers mutate `league`, save it, and re-render sections.
- `MutationObserver` is used by enhancement scripts for historical stats and team logos.

## 8. Reusable UI Components

Current reusable React UI:

- Header/footer branding and navigation.
- Post editor/publishing tool.

Current reusable legacy concepts:

- Card/table/list patterns in CSS.
- Team icon registry.
- Standings and player record calculations duplicated as functions.

There is no formal design system, no shared button/input/card React components, and no shared data formatting utilities.

## 9. Areas of Duplicated Code

- Two application shells: Next.js pages and static HTML/hash app.
- Two admin/editor flows: Next `/admin` post editor and legacy `admin.html` commissioner office.
- Two data models: static `src/lib-data.ts` versus localStorage `tc-league-v1`.
- Standings calculation duplicated in `app.js` and `admin.js`.
- Player record calculation duplicated in `app.js` and `admin.js`.
- Slug generation duplicated across `PostEditor`, `admin.js`, `team-import.js`, and `team-icons-ui.js`.
- Header/footer/nav branding duplicated between React and static HTML/CSS.
- Story card/list rendering duplicated across Next pages and legacy JavaScript.
- Styling duplicated across `globals.css`, `styles.css`, and related legacy CSS files.

## 10. Technical Debt

- The repository checkout is misaligned with `origin/main`; the app is nested under `ccteamclash/` and local `main` has no commit.
- Vercel config disables install/build and serves the directory statically, which conflicts with the Next.js package and App Router source.
- Large minified/compressed historical dataset is committed in `history-data.js`, making review and future edits difficult.
- Several TSX files are compressed into single-line components, reducing readability and review quality.
- The legacy JavaScript uses global variables and imperative string templates throughout.
- Data validation is minimal; imported/restored localStorage data is accepted with only light shape normalization.
- README describes the Next.js publishing path, while the legacy commissioner office provides a different, richer local-only workflow.
- No tests were found for routing, data transforms, standings, player records, or editor export.

## 11. Bugs or Fragile Code

- `src/app/page.tsx` assumes `stories[0]` and `matches[0]` always exist.
- `src/app/schedule/page.tsx` uses `key={m.home}`, which will collide if a team has multiple home matches.
- `src/app/stories/[slug]/page.tsx` types `params` as a `Promise`; this may be version-specific, but it should be verified against the installed Next 16 docs before changing.
- `PostEditor` creates object URLs for selected images but never revokes them.
- `PostEditor` exports related links even when a line is malformed, producing entries with missing labels or URLs.
- `PostEditor.copy()` writes a different shape than `download()`: copied JSON keeps `body` and `links` as raw strings.
- Legacy `app.js` and `admin.js` render user-controlled values with `innerHTML`, creating XSS risk from restored backups, story bodies, names, map links, and image URLs.
- Legacy localStorage can grow quickly because uploaded story images are stored as base64 data URLs.
- Legacy `fmtDate()` can produce invalid dates if saved values are empty or malformed.
- Legacy `team-import.js` mutates existing saved team data automatically on page load, which can surprise administrators.

## 12. Performance Concerns

- Legacy rendering rebuilds large chunks of DOM via `innerHTML` on route and admin state changes.
- `standings()` and `playerRecord()` recompute from all results repeatedly during render.
- Historical stats are stored as a large gzip base64 string and decompressed in the browser.
- `MutationObserver` enhancement scripts run after DOM changes and scan parts of the page repeatedly.
- External Unsplash and Google Fonts requests in the static site add network dependency and layout/performance variability.
- Next.js pages use CSS placeholder backgrounds rather than optimized images; if real images are added, they should use `next/image` or a clear static asset strategy.
- The current Vercel static config may prevent Next.js optimization entirely.

## 13. Security Concerns

- Legacy `innerHTML` rendering is the largest risk. Any user-controlled localStorage, imported backup, URL field, story field, team/player name, or map URL can inject markup.
- Admin tools have no authentication. That may be acceptable for local-only static tooling, but not for a deployed commissioner office.
- Backup restore trusts arbitrary JSON without schema validation.
- URL fields are not protocol-validated; unsafe schemes could be inserted into generated links.
- Uploaded images can be stored as data URLs without size/type enforcement beyond the file picker hint.
- There is no Content Security Policy documented or configured.
- The public static admin workflow stores all data in the browser, so data loss and device-specific state are expected failure modes.

## 14. Recommendations

1. Fix repository layout first. Decide whether the app root should be the repository root or `ccteamclash/`, then align the working tree, Vercel project root, and docs.
2. Pick the canonical product path. Either finish the Next.js migration or formally keep the static app as the deployed product.
3. If Next.js is the target, remove or archive legacy static pages after migrating the commissioner features.
4. Move league types and calculations into shared modules: teams, matches, results, standings, player records, slugs, dates, and validation.
5. Add schema validation for story exports, backups, and localStorage restore. Zod or a small custom validator would be enough.
6. Replace legacy `innerHTML` rendering or aggressively escape every dynamic value before interpolation.
7. Add tests for standings, player records, slug generation, story export, malformed link handling, and route assumptions.
8. Normalize publishing: either static JSON files in repo, a lightweight CMS/data file workflow, or Supabase when multi-device editing matters.
9. Update `vercel.json` to match the chosen architecture. A Next.js app should run install/build normally.
10. Split dense TSX and JavaScript into readable modules before adding features.
11. Add empty-state handling to Next pages for missing stories, matches, teams, and links.
12. Introduce reusable UI primitives gradually: `Button`, `Card`, `PageShell`, `StoryCard`, `StandingsTable`, `MatchList`, and form controls.

## 15. Proposed Long-Term Architecture

Recommended target: a single Next.js App Router application.

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
      SiteHeader.tsx
      Footer.tsx
    ui/
      Button.tsx
      Card.tsx
      FormField.tsx
      Table.tsx
    league/
      MatchCard.tsx
      StandingsTable.tsx
      TeamCard.tsx
      PlayerStats.tsx
    stories/
      StoryCard.tsx
      StoryEditor.tsx
  lib/
    league/
      types.ts
      standings.ts
      player-records.ts
      schedule.ts
      validation.ts
    content/
      stories.ts
      images.ts
    storage/
      local-draft.ts
      backup.ts
```

Data path options:

- Short term: keep static data files and export/import JSON, but validate them and centralize types.
- Medium term: store league content in versioned JSON files under `src/data/`.
- Long term: add Supabase or another managed database only when commissioner login, multi-device editing, and direct publishing are required.

Deployment target:

- Standard Next.js build on Vercel.
- Public pages statically generated where possible.
- Admin routes protected before any live write capability is introduced.
- Legacy static files removed from production once their features are migrated.

The highest-leverage architectural move is to collapse the dual-app structure into one source of truth. After that, most improvements become straightforward: shared calculations, safer rendering, real validation, better tests, and a clearer publishing workflow.
