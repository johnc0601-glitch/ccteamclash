# Publishing Model

## Goal

The Commissioner Office should become the place where league content is prepared, reviewed, and published.

Public pages should read only published league data. Draft edits should never appear on the public website until they are published.

## Current State

The site currently uses a mixed model:

- Static files for historical teams, players, standings, rankings, and schedule data.
- Local repository/service patterns for Commissioner Office modules.
- File-backed or storage-backed images for logos, stories, and courses.
- Vercel deployments for most durable data changes.

This is workable before launch, but it means many content changes still require code edits and a deploy.

## Target State

```text
Commissioner Office
  -> Save draft
  -> Validate
  -> Preview
  -> Publish
  -> Public website reads published data
```

## Publishable Records

### Stories

Stories need full draft publishing.

```text
Draft -> Published -> Archived
```

Required fields:

- title
- slug
- excerpt
- body
- image
- status
- publishedAt
- updatedAt

### Teams

Teams are league entities and should be active or archived, not draft content.

```text
Active -> Archived
```

Public pages should only show active teams unless viewing historical records.

### Players

Players are permanent people records.

```text
Active -> Archived
```

Current team assignment should come from season/roster records, not the base player record.

### Courses

Courses are reusable venue records.

```text
Active -> Archived
```

Teams select a home course. Multiple teams may use the same course.

### Schedules

Schedules require strict publishing because they create public expectations.

```text
Draft -> Published -> Unpublished -> Published
```

Published schedules are locked. Any public-facing schedule edit requires unpublishing first.

### Results

Results should flow through import review.

```text
Imported -> Validated -> Previewed -> Applied -> Published
```

Results should update standings, rankings, and player history only after they are applied and published.

## Storage Plan

Use one database and one durable image store.

Recommended launch stack:

- Database: Supabase Postgres
- Image storage: Supabase Storage or Vercel Blob
- Hosting: Vercel

The public site should store image URLs in the database and render from those URLs.

## Database Migration Order

1. Stories and media
2. Teams and courses
3. Players
4. Seasons and rosters
5. Schedule
6. Results imports
7. Standings and rankings generated from results

## Launch Rule

Do not move everything to the database at once.

Move the content that changes most often first:

1. Stories
2. Photos
3. Teams
4. Courses

Then move league history and results once the match-history shape is final.

## Public Website Rule

Public pages should never decide what is publishable.

They should only ask services for public-ready data:

```text
getPublishedStories()
getActiveTeams()
getActiveCourses()
getPublishedSchedule()
getPublishedStandings()
getPublishedRankings()
```

## Commissioner Office Rule

Commissioner pages can see draft and archived records, but services must enforce publishing rules.

React components should not contain publishing business logic.

## Future Audit Trail

Every publish action should eventually record:

- who changed it
- what changed
- when it changed
- previous status
- new status
- source import, when applicable
