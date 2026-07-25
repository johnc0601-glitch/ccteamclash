# Auth Model

## Decision

CC Team Clash will use Supabase Auth.

Launch login methods:

```text
Google
Email magic link
```

Do not build a custom password system for launch.

Yahoo and other email users are supported through email magic link.

## Auth Purpose

Accounts exist for league participation and permissions.

Public visitors can still browse the website without logging in.

League players, captains, and commissioners need accounts for actions tied to identity.

## Access Levels

### Public Visitor

Can:

- view public website
- view teams
- view players
- view courses
- view schedule
- view event pages
- view results
- submit public matchday photos/comments if enabled

Does not need login.

### Player

Can:

- manage own profile
- claim an existing player record
- upload/comment on matchday pages when logged in
- appear in the approved player pool

Cannot:

- submit team rosters
- edit teams
- edit schedules
- edit results
- manage standings
- manage stories

### Captain

Captain is a permission tied to a team.

Can:

- submit rosters for assigned team
- edit assigned team roster while open
- select approved players from the league pool
- add a basic player record when needed

Cannot:

- manage another team's roster
- edit results
- edit standings
- publish stories
- change schedules
- change league settings

### Commissioner

Can:

- approve signups
- approve player claims
- link accounts to player records
- assign captain permissions
- manage all league data
- import results
- lock/reopen rosters
- remove public photos/comments later when moderation tools exist

## Account Layers

Use three separate concepts.

### Supabase Auth User

The login identity.

```text
auth.users.id
email
provider
createdAt
```

Answers: who is signed in?

### Profile

The website permission record.

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

Answers: what can this signed-in user do?

### Player

The league/stat identity.

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

Answers: who is this person in league history?

## Profile Status

Use these statuses:

```text
Pending
Approved
Suspended
Rejected
```

New signups start as `Pending`.

Only `Approved` profiles can be selected by captains as normal league players.

## Player Claiming

Most signups are expected to match an imported historical player.

Signup should prioritize claiming an existing player record.

```text
User logs in
  -> enters name and optional PDGA number
  -> system shows likely player matches
  -> user requests a claim
  -> Commissioner approves claim
  -> profile links to player record
```

If no match exists, the Commissioner can create a new player record.

## Claim Rules

- One approved account can be linked to one player record.
- A player record can exist without an account.
- A profile can be pending without a linked player.
- Commissioner resolves claim conflicts manually.
- Automatic matching can suggest likely matches but should not auto-approve claims.

## Player Claims Table

```text
id
userId
requestedPlayerId
submittedName
submittedPdgaNumber
status
createdAt
reviewedAt
reviewedBy
```

Allowed claim statuses:

```text
Pending
Approved
Rejected
Cancelled
```

## Signup Flow

```text
Sign in with Google or email magic link
  -> create pending profile
  -> ask for name and optional PDGA number
  -> search existing player records
  -> request claim or create new player request
  -> Commissioner reviews
  -> profile becomes Approved
```

## Commissioner Management

Future Commissioner Office page:

```text
/office/members
```

Sections:

- Pending Signups
- Pending Claims
- Approved Members
- Captains
- Unclaimed Historical Players
- Suspended Members

Actions:

- approve profile
- reject profile
- suspend profile
- approve claim
- reject claim
- link to different player
- create new player
- assign captain
- remove captain
- assign current/default team

## Captain Assignment

Phase 1 assigns captains directly on the profile.

```text
profiles.captainTeamId
```

This assumes one captain profile manages one team at launch.

A user can be:

```text
Player
Captain of one team
Commissioner
```

If the league later needs multiple captains per team or one user managing multiple teams, add a `team_captains` table in Phase 2.

## Launch Scope

Phase 1 is governed by `docs/LAUNCH_ARCHITECTURE.md`.

Build first:

1. Supabase Auth setup.
2. Google login.
3. Email magic link login.
4. Pending profile creation.
5. Player claim request.
6. Commissioner approval screen.

Defer:

- custom password login
- multi-provider social login beyond Google
- automatic claim approval
- full public comment/photo moderation
- player self-service team transfers

## Security Rules

- Use Supabase Row Level Security.
- Public visitors can read public data.
- Approved users can read their own profile.
- Users can update only their own profile fields allowed by service rules.
- Captains can manage only assigned team rosters.
- Commissioners can manage all records.
- Do not expose service role keys to the browser.

## Related Documents

- `docs/IMPLEMENTATION_RETHINK.md`
- `docs/LAUNCH_ARCHITECTURE.md`
- `docs/ROSTER_MODEL.md`
- `docs/PUBLISHING_MODEL.md`
