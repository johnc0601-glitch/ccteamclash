# Project Architecture

## Vision

The Commissioner Office is the single source of truth.

All public pages are generated from commissioner-managed data.

Users never edit public pages directly.

## Architecture

```text
Presentation Layer
  - Public Website
  - Commissioner Office
  - Captain Portal
  - League Signup

        |
        v

Application Layer
  - Auth Service
  - Team Service
  - Player Service
  - Season Service
  - Schedule Service
  - Results Service
  - Standings Service
  - Story Service
  - Course Service
  - Roster Service

        |
        v

Data Layer
  - Static JSON (current)
  - Future CMS
  - Future Database
```

## Folder Structure

```text
src/
  app/
  components/
  layouts/
  features/
  services/
  hooks/
  types/
  constants/
  utils/
  data/
  styles/

docs/
```

## Feature Modules

### Commissioner Office

- Dashboard
- Teams
- Players
- Seasons
- Schedule
- Results
- Standings
- Courses
- Stories
- Media
- Settings

### Captain Portal

- Upcoming Events
- Submit Roster
- Search Player Pool
- Add Player
- Submitted Rosters

### League Signup

- Google Login
- Email Magic Link
- Player Claiming
- Pending Approval

### Public Site

- Home
- Teams
- Players
- Schedule
- Events
- Results
- Standings
- Stories

## Component Hierarchy

```text
App
  -> Layout
    -> Navigation
      -> Page
        -> Feature Component
          -> Shared Components
            -> UI Elements
```

## Data Flow

```text
Commissioner edits data
  -> Service validates data
    -> Data saved
      -> Standings recalculated
        -> Statistics recalculated
          -> Public website updates automatically
```

## Design Rules

- Single source of truth.
- No duplicated data.
- No duplicated business logic.
- Reusable components.
- Reusable layouts.
- Strong TypeScript typing.
- Small focused services.
- No page should contain business logic.
- Business logic belongs inside services.

## Future Services

- `AuthService`
- `TeamService`
- `PlayerService`
- `SeasonService`
- `ScheduleService`
- `ResultsService`
- `StandingsService`
- `StatisticsService`
- `StoryService`
- `CourseService`
- `MediaService`
- `RosterService`

## Build Order

1. Foundation - complete
2. Commissioner Office
3. Team Management
4. Player Management
5. Season Engine
6. Schedule Engine
7. Results Engine
8. Standings Engine
9. Statistics
10. Stories
11. Media Library
12. Settings
13. Public Website Automation
14. Captain Portal
15. Event Pages
16. League Signup

For the reduced launch sequence, use `docs/LAUNCH_ARCHITECTURE.md`.

For the smallest Phase 1 implementation spine, use `docs/IMPLEMENTATION_RETHINK.md`.

For the active build order and commit sequence, use `docs/BUILD_SEQUENCE.md`.

## Development Rules

Before writing code:

- Read this architecture.

Before creating components:

- Search for an existing reusable component.

Before creating services:

- Search for existing services.

Always:

- Never duplicate functionality.
- If requirements are unclear, stop and ask.
- Never invent behavior.

This document is the governing architecture for the repository.
