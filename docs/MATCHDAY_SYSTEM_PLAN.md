# CC Team Clash Matchday System Plan

Status: locked implementation design for later Codex execution.

## 1. Goal

Create one reusable webpage for every published match and use that page for attendance, captain roster confirmation, official matchday roster snapshots, roster export, the scoreboard, and later comments/photos.

Public route:

```text
/matches/[matchId]
```

The route is always keyed by the stable match ID. Team names and player names are display values only.

## 2. Non-negotiable identity rule

Use stable IDs for all relationships, authorization, database constraints, queries, exports, snapshots, and results:

```text
matchId
teamId
playerId
seasonId
roundId
```

Never use team names, player names, slugs, logos, colors, or labels as identifiers.

Example:

```text
match.homeTeamId = team01
match.awayTeamId = team06
```

The match page resolves the current display data from those IDs.

Locked historical snapshots preserve both stable IDs and the names displayed that day:

```text
team_id
team_name_snapshot
player_id
player_name_snapshot
```

## 3. One reusable match template

Do not create separate static page files for each match. Once the schedule is published, every match automatically has a permanent page at `/matches/[matchId]`.

The same template changes by lifecycle stage:

```text
Scheduled
→ Attendance Open
→ Captain Confirmed
→ Locked Snapshot
→ Completed
```

One code change must update all match pages for every season.

## 4. Three roster layers

### 4.1 Live team roster

Before matchday, use the current active roster tied to each stable team ID.

Do not copy all players into every match when the schedule is published.

### 4.2 Match attendance

Store only match-specific changes:

```text
Unconfirmed
Playing
NotPlaying
```

A missing attendance row means `Unconfirmed`.

Player permissions before lock:

- Player may update only their own attendance.
- Captain may update any active player on their assigned team.
- Commissioner may update either team.

### 4.3 Official matchday snapshot

At 3:00 PM America/New_York on match day, create the official historical snapshot from the latest playing roster.

The snapshot becomes the source of truth for:

- official match roster
- roster copy/export
- scoreboard player selection
- player match history
- permanent historical match page
- later statistics

After lock, players and captains cannot change the roster. Commissioners may still add or remove players from either official snapshot.

## 5. Captain confirmation behavior

Captain confirmation publishes the current `Playing` list. It does not lock it.

Flow:

```text
Draft attendance
→ Captain confirms roster
→ Public page shows confirmed playing roster
→ Captain may edit and update before 3:00 PM
→ Official snapshot created at 3:00 PM
→ Commissioner corrections only
```

Captain controls:

```text
Confirm Match Roster
Edit Confirmed Roster
Update Roster
Copy Player List
```

No reason field is required for late additions or removals.

## 6. Public page behavior

### Before confirmation

Show the full active roster for each team with attendance labels.

### After one team confirms

Show that team’s confirmed playing roster. The other side remains full-roster or displays `Roster awaiting confirmation`.

### After both teams confirm

Show both confirmed playing rosters.

### After 3:00 PM lock

Show only the official snapshot rosters.

### After results

Move the final score and scoreboard above the official roster while retaining the permanent matchday record.

## 7. Captain page design

The approved captain dashboard design is locked.

Captain Home remains a summary page, not a second independent roster editor.

Each match card should show:

```text
opponent
match date/time/course
playing count
not playing count
unconfirmed count
roster confirmation state
lock time
```

Primary action:

```text
Manage Match Roster
```

This links to:

```text
/matches/[matchId]?manage=roster
```

The actual roster editor must be shared with the matchup page so permission and business logic exist only once.

## 8. Database design

### 8.1 match_attendance

```text
id
match_id
team_id
player_id
status
updated_by
created_at
updated_at
```

Constraints:

```text
unique(match_id, player_id)
status in ('Playing', 'NotPlaying')
```

Missing row means `Unconfirmed`.

### 8.2 match_rosters

One row per team per match.

```text
id
match_id
team_id
status
confirmed_by
confirmed_at
updated_at
```

Statuses:

```text
Draft
Confirmed
```

Do not store `Locked`; calculate lock state from the match date and 3:00 PM Eastern.

Constraint:

```text
unique(match_id, team_id)
```

### 8.3 match_roster_snapshot_players

```text
id
match_id
team_id
team_name_snapshot
player_id
player_name_snapshot
created_at
updated_by
updated_at
```

Constraint:

```text
unique(match_id, team_id, player_id)
```

### 8.4 attendance_notifications

```text
id
match_id
player_id
status
provider_message_id
sent_at
created_at
```

Constraint:

```text
unique(match_id, player_id)
```

Do not add detailed change-history or reason tables for version one. Basic `updated_by` and `updated_at` are sufficient.

## 9. Lock rule

Centralize this rule in one domain module:

```text
match date at 3:00 PM America/New_York
```

All pages, actions, exports, snapshot creation, and permission checks must call the same function.

Required tests:

- before 3:00 PM
- exactly 3:00 PM
- after 3:00 PM
- daylight-saving boundaries
- rescheduled matches

## 10. Snapshot reliability

Do not rely only on one scheduled task.

Use both:

### Scheduled creation

A production job finds matches whose lock time passed and creates missing snapshots.

### Lazy fallback

When a match page or export is opened after lock:

```text
if locked and snapshot missing
→ create snapshot immediately
```

Snapshot creation must be idempotent.

If a captain never confirms, create the snapshot from the current `Playing` statuses and flag the roster for commissioner review rather than breaking the page.

## 11. Permissions

Reuse the existing Supabase profile roles and `captainTeamId`.

### Player

Can:

- view matchup page
- set own attendance before lock

Cannot:

- change another player
- confirm a team roster
- edit after lock

### Captain

Can:

- edit attendance for assigned team before lock
- confirm assigned team roster
- revise confirmed roster before lock
- copy confirmed player list
- see unavailable/unconfirmed players

Cannot:

- edit opponent roster
- edit after lock
- manage league-wide settings or results

### Commissioner

Can:

- edit either team before lock
- add/remove players after lock
- correct or rebuild official snapshots
- inspect failed reminders
- run test reminder actions

Authorization must be enforced in server actions/services and Supabase RLS. Hidden buttons are not security.

Captain checks must compare IDs:

```text
profile.captainTeamId === targetTeamId
```

Never compare team names.

## 12. Page and component architecture

Public route:

```text
src/app/matches/[matchId]/page.tsx
```

Components:

```text
src/components/matches/
  MatchHero.tsx
  MatchStateBanner.tsx
  MatchRosterBoard.tsx
  TeamRosterColumn.tsx
  PlayerAttendanceRow.tsx
  PersonalAttendanceCard.tsx
  CaptainRosterPanel.tsx
  ConfirmedRosterList.tsx
  RosterExportButtons.tsx
  MatchScoreboard.tsx
```

Do not create a second independent roster editor inside `/captain`.

## 13. Domain architecture

```text
src/domain/match-roster/
  MatchAttendance.ts
  MatchRoster.ts
  MatchRosterSnapshot.ts
  MatchRosterRepository.ts
  SupabaseMatchRosterRepository.ts
  MatchRosterService.ts
  MatchRosterPermissions.ts
  MatchRosterLock.ts
```

Core operations:

```text
getMatchRoster(matchId)
setOwnAttendance(userId, matchId, status)
setTeamAttendance(userId, matchId, playerId, status)
confirmTeamRoster(userId, matchId, teamId)
createLockedSnapshot(matchId)
commissionerAddSnapshotPlayer(userId, matchId, teamId, playerId)
commissionerRemoveSnapshotPlayer(userId, matchId, teamId, playerId)
getRosterExport(matchId, teamId)
```

Follow existing repository/service conventions. Do not make direct Supabase calls throughout route components.

## 14. Roster export

Version one requires only `Copy Player List`.

Output:

```text
Will Deering
Chad Sullivan
Dillon Blunier
```

Do not include PDGA number, rating, attendance status, email, or account details.

Export source:

- before lock: latest confirmed `Playing` list
- after lock: official snapshot

CSV may be added later only if the scoring application needs it.

## 15. Attendance email automation

Resend and the verified sending domain are already configured externally. Vercel has:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_SITE_URL
```

Create:

```text
src/services/email/
  EmailClient.ts
  ResendEmailClient.ts
  AttendanceReminderEmail.ts
```

Scheduled route:

```text
src/app/api/cron/attendance-reminders/route.ts
```

Behavior:

1. Find published matches three calendar days away.
2. Load active players from both stable team IDs.
3. Resolve approved linked profiles and email addresses.
4. Skip existing notification rows.
5. Send each player a link to `/matches/[matchId]`.
6. Record success/failure and provider message ID.

Version one requires login on the matchup page. Do not build anonymous one-click response tokens.

Secure the cron endpoint with `CRON_SECRET`.

## 16. Match page content order

Before results:

```text
Match hero
Match state / roster confirmation banner
Personal attendance card for signed-in player
Away and home roster area
Captain controls when authorized
AI preview (later patch)
Scoreboard pending
Comments/photos (later patch)
```

After results:

```text
Match hero
Final score summary
Full scoreboard
Official snapshot rosters
AI recap
Comments/photos
```

## 17. Scoreboard relationship

Do not alter the current results system in the first match-roster patches.

Later, the official snapshot player IDs become the selectable scoring pool for singles and doubles. This prevents retyping or selecting players who were not officially on the matchday roster.

## 18. Codex build sequence

### Patch 1 — Read-only dynamic match template

- create `/matches/[matchId]`
- load match by stable match ID
- resolve teams by stable team IDs
- render matchup hero
- render full active rosters
- render lifecycle banner
- render scoreboard placeholder
- link Captain Home to the match page

No new writes.

### Patch 2 — Attendance foundation

- add Supabase migrations
- add RLS policies
- add domain types/repository/service
- add centralized lock calculation
- add permission tests

### Patch 3 — Player attendance

- add signed-in personal attendance card
- allow Playing / Not Playing updates
- verify account-to-player identity server-side
- block changes after lock

### Patch 4 — Captain workflow

- allow captain editing for assigned team only
- confirm roster
- edit and update confirmed roster before lock
- show unavailable/unconfirmed players privately
- add Copy Player List

### Patch 5 — Official snapshot and commissioner override

- add scheduled and lazy snapshot creation
- read snapshot after lock
- allow commissioner add/remove after lock
- keep operation idempotent

### Patch 6 — Attendance email

- install/use Resend server-side
- add email template
- add notification log
- add secured cron route
- add dry-run/test-send support
- prevent duplicate sends

### Patch 7 — Scoreboard integration

- use official snapshot players as scoring pool
- render singles, doubles, totals, and final result

### Patch 8 — Comments/photos and AI copy

Only after roster and scoring workflows are stable.

## 19. Codex execution rules

Before changing code, Codex must review:

```text
AGENTS.md
docs/AUTH_MODEL.md
docs/ROSTER_MODEL.md
current ScheduleService and Match model
current captain page and actions
current Supabase migrations and RLS conventions
current results domain
```

Because the repository uses Next.js 16, Codex must follow `AGENTS.md` and read the relevant installed Next.js documentation in `node_modules/next/dist/docs/` before writing code.

Every patch must:

- preserve existing schedule, roster, auth, course, player, and results behavior
- use stable IDs for all identity and authorization
- include tests
- run lint, build, and relevant test suites
- state migration steps and environment requirements
- provide manual verification steps
- avoid automatic production deployment

## 20. Do not do

```text
Do not create static files for every match.
Do not route by team name or matchup slug.
Do not use names as keys or permission identities.
Do not duplicate full rosters when publishing a schedule.
Do not mix match attendance into the normal team roster table.
Do not build a separate captain roster system.
Do not use current team rosters for locked historical pages.
Do not depend only on cron for snapshot creation.
Do not include PDGA numbers or ratings in match rosters or exports.
Do not add reason fields for roster changes.
Do not build comments/photos in the first patches.
Do not alter the existing scoring system before the roster workflow is stable.
```

## 21. Final architecture

```text
Published schedule
→ /matches/[matchId]
→ teams resolved by stable IDs such as team01
→ live active rosters
→ player attendance responses
→ captain-confirmed playing lists
→ 3:00 PM official snapshots
→ commissioner corrections
→ roster export
→ scoreboard and permanent history
```
