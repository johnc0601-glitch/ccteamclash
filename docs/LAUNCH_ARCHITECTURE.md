# Launch Architecture

## Decision

Phase 1 should build only the operational pieces required to launch the league.

Do not migrate every existing feature to the database at once.

## Phase 1 Goal

Support league signup, player claiming, captain access, matchday rosters, event pages, public photos, and public comments.

Keep the current public website, historical records, rankings, standings, stories, and course pages working mostly as they are until Phase 2.

## Phase 1 In Scope

- Supabase Auth
- Google login
- Email magic link login
- Pending profiles
- Player claim requests
- Commissioner claim approval
- Captain/team assignment
- Scheduled event records
- Event roster submission
- Event roster lock/reopen
- Public event pages
- Public event photo upload
- Public event comments

## Phase 1 Out Of Scope

- Full CMS
- Full publishing workflow
- Story migration to database
- Course migration to database
- Historical rankings migration
- Historical standings migration
- Results import rewrite
- Automated scoring validation
- Automated standings recalculation
- Comment/photo moderation queue
- Custom password login
- Additional social login providers beyond Google

## Why This Reduces Coding

The current site already displays the public league well enough for launch.

The missing operational workflow is:

```text
people join league
  -> commissioner approves/links them
  -> captains submit match rosters
  -> event pages show rosters/photos/comments
```

Building only that path avoids rewriting stable public pages before the league needs it.

## Phase 1 Tables

Build only these tables first:

```text
profiles
player_claims
players
teams
team_captains
events
event_rosters
event_roster_players
event_photos
event_comments
```

## Temporary Static Data

Keep these static/file-backed during Phase 1:

```text
historical records
rankings
standings
stories
courses
course photos
team logos
schedule display, until events are generated
```

The database may duplicate enough team/player/event data to support auth and rosters, but public pages do not need to be fully rebuilt immediately.

## Status Rules

Use simple statuses only.

### profiles

```text
Pending
Approved
Suspended
Rejected
```

### player_claims

```text
Pending
Approved
Rejected
Cancelled
```

### events

```text
Scheduled
Final
Cancelled
```

### event_rosters

```text
Open
Submitted
Locked
```

### event_photos

```text
Visible
Removed
```

### event_comments

```text
Visible
Removed
```

No draft status for rosters.

No moderation queue in Phase 1.

## Phase 1 User Flows

### League Signup

```text
User logs in with Google or email magic link
  -> pending profile is created
  -> user enters name and optional PDGA number
  -> user searches existing player record
  -> user requests claim
  -> commissioner approves claim
  -> profile becomes approved
```

### Captain Setup

```text
Commissioner approves profile
  -> links profile to player record
  -> assigns captain permission for a team
  -> captain can access roster tools
```

### Captain Roster Submission

```text
Captain opens upcoming event
  -> selects players from approved player pool
  -> submits roster
  -> commissioner can lock roster
```

### Public Event Page

```text
Visitor opens event page
  -> sees match header, scoreboard placeholder, rosters, photos, comments
  -> can upload photo or comment
  -> submission appears immediately
```

## Matchday Page Layout

Use this order:

```text
1. Match Header
2. Scoreboard
3. Rosters
4. Photos
5. Comments
```

Match header includes:

- home team logo
- away team logo
- team names
- date
- time
- course
- directions link

Do not show UDisc on matchday pages in Phase 1.

Do not add a separate location section or location photo.

## Phase 1 Implementation Order

1. Create Supabase project and environment configuration.
2. Add database schema migration for Phase 1 tables.
3. Add Supabase server/client utilities.
4. Add login/signup pages with Google and magic link.
5. Add profile creation after login.
6. Add player search and claim request flow.
7. Add Commissioner members page for approvals.
8. Add captain assignment.
9. Add event records from current schedule.
10. Add captain roster submission.
11. Add public event page.
12. Add public photo upload.
13. Add public comments.

## Phase 2 Candidates

After Phase 1 is stable:

- story database migration
- course database migration
- media library migration
- results import rewrite
- match history from imported official results
- standings/rankings generated from results
- public upload moderation
- event recaps
- notification emails

## Related Documents

- `docs/AUTH_MODEL.md`
- `docs/ROSTER_MODEL.md`
- `docs/PUBLISHING_MODEL.md`
