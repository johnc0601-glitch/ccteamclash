# Roster Model

## Decision

CC Team Clash does not use a draft.

Captains select players for each event from their local area, their usual team group, or the wider league player pool. Individual players may also join the league without being permanently attached to a team.

## Core Rules

- Players are permanent league members.
- Teams are permanent league entities.
- Most players have a default/current team for display and convenience.
- Event rosters decide who is actually playing a specific match.
- Historical match records must preserve the team a player represented for that event.
- Player movement between teams should be supported without rewriting history.

## Captain Input Goal

Captain input must be fast on a phone.

Captains should not feel like they are managing a database. They should be able to open a link, choose the match, select players, and submit.

## Captain Workflow

```text
Captain opens team/captain link
  -> Selects upcoming event
  -> Checks players who are coming
  -> Searches league player pool if needed
  -> Adds a new player if needed
  -> Submits roster
  -> Roster remains editable until locked
```

## Roster Status

Use only these statuses:

```text
Open
Submitted
Locked
```

There is no Draft status.

Open means the captain can edit the roster.

Submitted means the captain has sent the roster, but it may still be edited until the Commissioner locks it.

Locked means only the Commissioner can reopen or change it.

## Captain Permissions

Captains can:

- view assigned team events
- select players for their team event roster
- search the league player pool
- add a basic new player record
- update their own submitted roster while open

Captains must be authenticated users assigned to a team through the auth model.

Captains cannot:

- edit another team's roster
- change schedules
- edit results
- edit standings
- publish stories
- change courses
- edit league settings

## Commissioner Permissions

Commissioners can:

- manage all rosters
- reopen locked rosters
- lock rosters
- resolve duplicate players
- edit player details
- assign captains
- override roster submissions

## Data Model

### players

Base player identity.

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

`currentTeamId` is for convenience only. It is not the source of historical truth.

### team_captains

Connects users to teams they can manage.

```text
id
teamId
userId
role
active
createdAt
updatedAt
```

### event_rosters

One roster per team per scheduled event.

```text
id
eventId
teamId
submittedBy
status
submittedAt
lockedAt
createdAt
updatedAt
```

### event_roster_players

Players selected for a roster.

```text
id
eventRosterId
playerId
source
createdAt
updatedAt
```

Allowed source values:

```text
Team
LeaguePool
New
Commissioner
```

## Event Page Relationship

Each scheduled event should eventually have a public event page.

```text
/events/[eventId]
```

The event page should show:

- date
- time
- course
- home team
- away team
- team logos
- submitted rosters
- matchups after they are set
- results after publication
- event story/photos after publication

## Implementation Order

1. Database schema for players, teams, events, rosters, and roster players.
2. Captain authentication and team assignment.
3. Captain roster submission screen.
4. Commissioner roster review and lock controls.
5. Public event pages.
6. Results import connected to selected roster players.

## Design Constraint

Do not build roster business logic inside React components.

Roster rules belong in a future `RosterService`.

Public event pages should read published/locked roster data through services.

## Related Documents

- `docs/AUTH_MODEL.md`
