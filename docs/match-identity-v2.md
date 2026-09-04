# Match Identity V2

## Goal

Separate permanent match identity from public presentation without breaking Matchday, results, rosters, feeds, predictions, media, or historical links.

## Invariants

1. `launch_schedule_matches.id` is an immutable internal key. Existing values are never renamed.
2. New match rows receive opaque UUID text IDs at the database boundary.
3. `launch_schedule_matches.public_slug` is the canonical public URL segment and is never used as a foreign key.
4. Every legacy ID and every previous slug remains resolvable through `launch_match_url_aliases`.
5. Matchday continues to operate on the internal ID. The proxy resolves/rewrites public slugs before Matchday code runs.
6. Home/away team identity is structural. Date, time, course, status, and notes are logistics.
7. Commissioner logistics saves happen through one server action and invalidate public schedule surfaces immediately.
8. Homepage card markup/layout and Matchday UI are not redesigned by this work.

## Production dependency map

The production database currently has direct dependencies on `launch_schedule_matches.id` from:

- `launch_match_attendance.match_id`
- `launch_match_feed_posts.match_id`
- `launch_match_feed_reports.match_id`
- `launch_match_results.match_id`
- `launch_match_roster_snapshots.match_id`
- `launch_match_roster_unlocks.match_id`
- `launch_match_rosters.match_id`
- `launch_playoff_games.match_id`
- `launch_stories.match_id`
- `media_assets.match_id`

Additional match-linked structures depend on those records, including result contests, roster snapshot players, homepage feed previews, Clash rating snapshots/facts/publications, and media/story services.

This dependency graph is why V2 freezes the existing primary key rather than attempting a mass primary-key rewrite.

## Public URL behavior

Canonical URL example:

`/matches/beast-mode-at-riptide-2026-r1`

Resolution rules:

- Canonical slug -> internally rewrite to the immutable match ID; browser keeps the clean slug.
- Legacy internal ID -> permanent redirect to the canonical slug.
- Previous slug -> permanent redirect to the current canonical slug.
- During staged rollout before the additive migration exists, legacy internal-ID routes continue to work normally.

## Status behavior

Homepage scheduling now consults the stored match status as well as the date:

- `Cancelled` matches are not promoted as homepage upcoming/recent cards.
- `Completed` matches are treated as recent/past, never future/upcoming solely because of their date.
- `Scheduled`, `Postponed`, and `Rain Delay` continue to use the individual match date for date grouping.

No visual card redesign is part of this change.

## Cache/mutation boundary

The commissioner spreadsheet saves match logistics through `saveMatchLogistics()` on the server. A successful save revalidates:

- homepage data
- public schedule data
- `/`
- `/schedule`
- internal and canonical Matchday paths
- both affected team pages

The write and cache invalidation therefore share one server-side boundary instead of relying on a separate client-side refresh step.

## Migration order

1. Deploy code that tolerates both pre-V2 and V2 schemas.
2. Apply additive `match_identity_v2` migration.
3. Verify all existing match rows have non-null unique `public_slug` values.
4. Verify one legacy ID redirects to its canonical slug.
5. Verify the canonical slug rewrites to Matchday while Matchday still reads the internal ID.
6. Verify Round 1 homepage cards and links.
7. Edit one logistics field in commissioner schedule and verify immediate homepage/schedule refresh.
8. Verify results, feed, roster, attendance, prediction, story/media, and playoff match references still resolve.
9. Merge to shared preview only after build/runtime validation.
10. Release to production separately; do not merge unrelated `preview/integration` work.

## Round 1 regression set

- Beast Mode @ Riptide
- Hayneous OG's @ Ninjas
- KB @ Dark Knights
- Wild Turkey @ Cougar Country

The homepage card convention remains Away | VS | Home.
