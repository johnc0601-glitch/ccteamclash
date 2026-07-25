# Build Sequence

## Decision

Pause public-site hardening and build the league operating system in dependency order.

The live site is not being actively used yet, so Phase 1 can prioritize the Commissioner and captain workflows over protecting every current public-page implementation detail.

## Build Principle

Build only the path required for launch:

```text
Database foundation
  -> Auth and profiles
    -> Commissioner approval
      -> Captain roster submission
        -> Public event pages
```

Do not rebuild historical rankings, standings, stories, courses, or scoring until the launch workflow is stable.

## Locked Phase 1 Scope

Phase 1 includes:

- Supabase setup
- 8 launch tables
- seeded teams
- seeded players
- seeded events
- Google login
- email magic link login
- pending profile creation
- player claim requests
- Commissioner approval
- captain team assignment
- event roster submission
- public event pages
- public comments/photos through `event_posts`

Phase 1 does not include:

- automated scoring
- generated standings
- generated rankings
- full story CMS
- full course CMS
- comment/photo moderation queue
- multiple captains per team
- one captain managing multiple teams
- UDisc data sync
- public match review system

## Commit 1: Database Foundation

Commit message:

```text
feat: add launch database foundation
```

Goal:

Create the data foundation without changing public UI behavior.

Files to create:

- Supabase migration for the 8 Phase 1 tables
- database type definitions
- Supabase client/server utilities
- seed data structure for teams, players, and events

Files to modify:

- environment documentation
- package dependencies if Supabase client is not installed
- service/container files only if needed for future database access

Acceptance criteria:

- The 8 tables are represented in a migration or schema file.
- Database access is centralized.
- No React page contains database business logic.
- Public pages still build.
- `npm run lint` passes.
- `npm run build` passes.

## Commit 2: Auth And Profiles

Commit message:

```text
feat: add league auth and profiles
```

Goal:

Allow people to sign in and create a pending league profile.

Files to create:

- login page
- auth callback route
- profile service
- profile repository
- auth utilities

Files to modify:

- navigation only where a login/account link is needed
- Commissioner Office only where profile status is shown

Acceptance criteria:

- Google login path exists.
- Email magic link path exists.
- New users create `Pending` profiles.
- No user is automatically approved.
- Public pages remain accessible without login.

## Commit 3: Commissioner Approval

Commit message:

```text
feat: add member approval workflow
```

Goal:

Let the Commissioner approve users, link players, and assign captain access.

Files to create:

- Commissioner members page
- player claim service
- player claim repository
- approval UI components

Files to modify:

- Commissioner navigation
- profile service

Acceptance criteria:

- Commissioner can view pending profiles.
- Commissioner can approve or reject a profile.
- Commissioner can link a profile to an existing player.
- Commissioner can assign `captainTeamId`.
- A captain can only manage the assigned team.

## Commit 4: Captain Roster Tool

Commit message:

```text
feat: add captain roster submission
```

Goal:

Let captains submit event rosters for their assigned team.

Files to create:

- captain roster page or Commissioner Office roster view
- event roster service
- event roster repository
- roster selection components

Files to modify:

- Commissioner routing/navigation
- event service only if needed

Acceptance criteria:

- Captain sees upcoming events for their team.
- Captain selects players from the approved player pool.
- Captain submits a roster.
- Submitted rosters can be locked or reopened by Commissioner.
- Roster rules live in services, not components.

## Commit 5: Public Event Pages

Commit message:

```text
feat: add public event pages
```

Goal:

Create matchday pages that show the real league event structure.

Files to create:

- public event route
- event page components
- event post service
- event post repository
- comment/photo upload components

Files to modify:

- schedule links
- homepage upcoming match links
- team links if they point to event context

Acceptance criteria:

- Each event has a public URL.
- Match header shows team logos side by side.
- Match header shows date, time, course, and directions.
- Rosters show once submitted or locked.
- Scoreboard area exists as a placeholder.
- Public comments/photos use `event_posts`.
- UDisc link is not shown on matchday pages.

## Current Static Data To Preserve

Keep these file-backed until later:

- historical records
- rankings
- standings
- stories
- course cards
- course photos
- team logos
- public player ranking calculations

These can be copied into seed data when useful, but the public site does not need to be fully database-driven in Phase 1.

## Guardrails

- No ninth Phase 1 table without stopping and justifying it.
- No scoring engine in Phase 1.
- No standings automation in Phase 1.
- No moderation queue in Phase 1.
- No page-level business logic.
- Repositories handle persistence.
- Services own rules.
- UI calls services.

## Next Action

Start Commit 1: Database Foundation.

Before writing implementation code:

1. Read `docs/IMPLEMENTATION_RETHINK.md`.
2. Read `docs/LAUNCH_ARCHITECTURE.md`.
3. Inspect current data files for teams, players, and schedule/events.
4. Add only the minimum Supabase foundation needed for Phase 1.

## Related Documents

- `docs/IMPLEMENTATION_RETHINK.md`
- `docs/LAUNCH_ARCHITECTURE.md`
- `docs/AUTH_MODEL.md`
- `docs/ROSTER_MODEL.md`
- `docs/PUBLISHING_MODEL.md`
