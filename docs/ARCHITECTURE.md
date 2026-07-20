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

        |
        v

Application Layer
  - Team Service
  - Player Service
  - Season Service
  - Schedule Service
  - Results Service
  - Standings Service
  - Story Service
  - Course Service

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

### Public Site

- Home
- Teams
- Players
- Schedule
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
