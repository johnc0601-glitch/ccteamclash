# Implementation Rethink

## Decision

Phase 1 should use the smallest database shape that supports the real launch workflow.

Avoid building future flexibility until the league proves it needs it.

## Simplification

Use a launch spine instead of the full long-term model.

```text
Auth
  -> Profile
    -> Player claim
      -> Captain team access
        -> Event roster
          -> Event page
            -> Posts
```

## Fewer Tables

Use these Phase 1 tables:

```text
profiles
player_claims
players
teams
events
event_rosters
event_roster_players
event_posts
```

This removes these Phase 1 tables:

```text
team_captains
event_photos
event_comments
```

## Why

### team_captains is not needed at launch

For launch, assume a captain profile manages one team.

Store that directly:

```text
profiles.captainTeamId
```

If the league later needs multiple captains per team or one person managing multiple teams, add `team_captains` in Phase 2.

### event_photos and event_comments can be one table

Photos and comments are both public event posts.

Use:

```text
event_posts
```

with:

```text
type: Comment | Photo
```

This gives one upload/display/removal path instead of two.

## Phase 1 Table Purpose

### profiles

Account permission record.

```text
id
userId
displayName
role
status
playerId
captainTeamId
createdAt
updatedAt
```

Role:

```text
Player
Captain
Commissioner
```

Status:

```text
Pending
Approved
Suspended
Rejected
```

### player_claims

Manual approval workflow for linking a login to an imported player.

```text
id
profileId
requestedPlayerId
submittedName
submittedPdgaNumber
status
createdAt
reviewedAt
reviewedBy
```

### players

League player identity.

Use the historical import to seed this table.

```text
id
name
gender
pdgaNumber
pdgaRating
currentTeamId
homeArea
active
createdAt
updatedAt
```

### teams

Team identity required for captain assignment, events, and rosters.

Seed from current team data.

```text
id
name
shortName
logo
active
createdAt
updatedAt
```

### events

Scheduled matchday page source.

```text
id
seasonLabel
homeTeamId
awayTeamId
courseName
directionsUrl
date
time
status
createdAt
updatedAt
```

Status:

```text
Scheduled
Final
Cancelled
```

### event_rosters

One roster per team per event.

```text
id
eventId
teamId
submittedByProfileId
status
submittedAt
lockedAt
createdAt
updatedAt
```

Status:

```text
Open
Submitted
Locked
```

### event_roster_players

Selected players for the event roster.

```text
id
eventRosterId
playerId
createdAt
updatedAt
```

Do not track source in Phase 1 unless needed.

### event_posts

Public comments and photos for an event.

```text
id
eventId
type
authorName
body
imageUrl
status
createdAt
removedAt
removedBy
```

Type:

```text
Comment
Photo
```

Status:

```text
Visible
Removed
```

No moderation queue in Phase 1.

## Removed Complexity

Do not build these in Phase 1:

- multiple captain/team assignments
- separate photo/comment pipelines
- post moderation queue
- source tracking for roster player selection
- automated standings from event results
- full event result tables
- public event recap publishing

## Implementation Order

1. Add Supabase project/env config.
2. Add schema for the 8 Phase 1 tables.
3. Seed teams and players from existing static data.
4. Seed events from existing schedule data.
5. Add auth utilities.
6. Add login/signup.
7. Add profile and player claim flow.
8. Add Commissioner member approval.
9. Add `captainTeamId` assignment.
10. Add captain roster submission.
11. Add public event page.
12. Add `event_posts` comments/photos.

## Guardrail

If implementation requires a ninth Phase 1 table, stop and justify it before building.

The default answer should be: can this fit the launch spine?

## Phase 2 Additions

Add later only when needed:

```text
team_captains
event_photos
event_comments
event_results
match_results
media_assets
moderation_queue
notifications
```

## Related Documents

- `docs/LAUNCH_ARCHITECTURE.md`
- `docs/AUTH_MODEL.md`
- `docs/ROSTER_MODEL.md`
