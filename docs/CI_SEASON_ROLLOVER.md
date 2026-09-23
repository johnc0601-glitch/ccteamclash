# CI season rollover

Commissioner Players → Sync PDGA Ratings → Preview starting CI → Apply starting CI.

Returning players use 50% prior final CI plus 50% PDGA when the PDGA effective
date is strictly after their final prior-season match. Otherwise use 80/20.
No PDGA carries final CI forward. New players seed from PDGA, with the existing
825 Open / 700 Women provisional fallback when no rating exists. Round halves up.

The PDGA sync saves `pdga_rating_effective_date`, including when the numeric
rating is unchanged. Missing or invalid dates remain unknown, never the sync date.
Other edits that replace a rating without its date clear stale date provenance.

`clash_season_rollovers` records the input ratings, dates, rule, starting CI and
actor. It is separate from match facts, season-end snapshots and earned CI gains.
Repeated application always derives from the prior final CI, so it cannot compound.
Returning players who skipped a season use their last recorded season.

Historical matches have an optional verified `played_on` date. Older imports
only identify an event month: its final calendar day is a conservative upper
bound, explicitly labeled `MonthUpperBound`, not an invented exact match date.
A PDGA date after that bound is certainly newer. An ambiguous date within the
same month keeps 80/20 until a verified match day is supplied. Unknown dates also
keep 80/20. Current-season match dates come from the schedule and rated facts.

Rollover is commissioner-only, atomic, and restricted to the active season before
its start date. Existing frozen match ratings also block a reset. Missing final
CI for an established player fails rather than silently reseeding them as new.

Deployment order: apply database migrations, run the rolled-back SQL regression,
deploy application, verify the commissioner preview and public player record.

Jason Collet was verified directly at https://www.pdga.com/player/217998 on
2026-09-23: rating 993 effective 2026-05-12. His latest model's 2025–26 final
CI is 931 and his last recorded match is the March championship. Thus the
verified 2026–27 starting CI is 962; the earlier quoted 1006/969 was superseded
by the live PDGA record. Historical season-end CI remains 931.
