# CC Team Clash Navigation Sitemap

This document is the maintenance reference for user-facing routes and role-specific navigation.

## Public

- `/` — Home
- `/schedule` — Schedule
  - `/matches/[id]` — Matchday detail
- `/standings` — Current standings
  - `/playoffs` — Published playoff bracket
- `/stats` — Players, rankings, and CI
  - `/players` — Player search and player detail state
  - `/clash-index` — CI explanation
- `/teams` — Team directory
  - `/teams/[id]` — Team detail
- `/stories` — Story archive
  - `/stories/[slug]` — Story detail
  - `/photos` — Public photo gallery
- `/courses` — Course directory
- `/history` — Historical seasons and results

## Signed-in player

- `/account` — My Profile / authentication / registration
- `/clubhouse` — Private team clubhouse when rostered

Supporting account routes:
- `/account/create`
- `/account/check-email`
- `/account/forgot-password`
- `/account/reset-password`

## Captain

- `/captain` — Captain Home
  - Team summary and roster
  - Next-match controls
  - Season requests
  - Registration editing
  - Team appearance
  - Links to `/matches/[id]?manage=roster` for match roster management

Captain authorization is team-scoped. A Captain should only manage the team in `launch_profiles.captain_team_id`.

## Commissioner

- `/office` — Commissioner dashboard
- `/office/teams`
- `/office/players`
- `/office/clubhouses`
- `/office/seasons`
- `/office/schedule`
- `/office/results`
- `/office/imports`
- `/office/standings`
- `/office/playoffs`
- `/office/courses`
- `/office/media`
  - `/office/media/photos`
  - `/office/media/moderation`
  - `/office/media/around-the-clash`
- `/office/settings`

Publishing belongs under Office → Media.

## Compatibility / redirect routes

These routes are retained for old links but should not appear in navigation:

- `/rankings` → `/stats`
- `/admin` → `/office/media`
- `/captain/free-agents` → `/captain`
- `/account/free-agency` → `/account`

## Navigation rules

- Detail pages should provide an obvious route back to their parent section.
- Public global navigation remains: Schedule, Standings, Players, Teams, Stories, Courses, History.
- Secondary pages are discovered contextually:
  - Standings → Playoffs
  - Stories → Photos
  - Players → Find Player / Clash Index
  - Schedule → Matchday
- Signed-in tools are grouped as My Clash on compact/mobile navigation.
- Do not introduce a second commissioner publishing center outside Office → Media.
- Avoid rendering duplicate responsive copies of semantic content; use one DOM representation with responsive CSS where practical.
