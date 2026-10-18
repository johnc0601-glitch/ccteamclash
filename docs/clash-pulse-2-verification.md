# Clash Pulse 2.0 verification — October 18, 2026

The commissioner selects a season and round, generates a private fact library from canonical published data, reviews facts, and copies a factual briefing. Approved short facts can be explicitly featured through the existing homepage table.

## Verified

- Production was queried read-only. No production schema, result, CI, snapshot, story, or homepage row was changed.
- Captured Round 1 public statistics produce **270 facts**, including four final scores, 21 individual contest upsets, 159 player CI summaries, individual achievements, team and round totals, six recorded historical meetings, and four upcoming matches.
- Acceptance figures: **21 upsets / 105 played contests (20.0%)**, **31 both-format winners**, **8 perfect performers on losing teams**, **Hastin McGill +25**, **Beast Mode +40 combined player CI**, **4 home wins**.
- Ten generator/export tests pass. Missing or duplicate ratings, invalid probabilities, partial rounds, snapshot mismatches, unplayed contests, tied fifth-place movers, and missing forecast freezes are covered.
- Combined focused regression run: **43/43 pass**, covering the new engine, results locks/validation, final scoreboard, adjustment breakdown, upset verification, frozen roster predictions, and CI movement.
- Two stale ResultsIntegration assertions were updated: invalid team scores now use a quarter point, and the singles validation assertion checks the error category rather than old wording. A valid half-point assertion was added. ResultsService and all scoring behavior remain unchanged.
- Changed/new library files pass ESLint. The repository-wide standalone TypeScript command still reports errors in unchanged legacy test files (including missing vitest). Next's production build completes compilation, its TypeScript phase, static page generation, and build tracing with staging public connection settings.
- Production build: `node node_modules/next/dist/bin/next build --webpack` **passes**. Existing warnings concern HEIC bundling, the missing staging podcast table, and a third-party course page too large for the data cache.
- Built local API: signed-out **GET, POST, PATCH all return 401**, `Commissioner sign-in required.`

## Staging database

The additive migration was applied and recorded on **ccteamclash-staging** as `20261018151349_clash_pulse_fact_library`. It is idempotent and does not modify legacy pulse items or source records.

`supabase/tests/clash_pulse_library.sql` passes against staging with all test writes rolled back. It verifies:

- Generated facts start pending and unpublished.
- Feature requires approval; the linked existing homepage row becomes active only after explicit Feature.
- Identical regeneration keeps approval and creates no duplicate revision.
- Corrections reset approval and deactivate stale homepage highlights.
- Removed facts are retired with prior data retained.
- Older in-flight generations are rejected.
- Source-change triggers enqueue durable retries and invalidate stale highlights.
- Noncommissioners cannot read the private library or review facts; anonymous roles lack table and RPC privileges.

Security advisors did not flag the new library objects. Existing unrelated staging advisories were left unchanged.

## Completed signed-in staging verification

Staging source prerequisites were added from the existing CI snapshot/fact, venue, structural-point, and forecast migrations. Publication functions, roster backfills and player CI updates were deliberately excluded. The missing nullable historical match reference was added. Source-change triggers were attached to the newly present tables.

An isolated **Pulse QA — Coastal Clash 2026-2027** season contains exact copies of public Round 1 scores, contests, frozen ratings, locked payloads, and roster memberships, with `pulse-qa-` IDs. Original staging matches were not overwritten. Staging-specific points-available columns were populated using staging's existing `persist_team_points_available` formula; those fields are not used by the fact generator. The QA season, schedule and rounds remain unpublished and inactive.

The user signed into the local staging-connected preview. The real browser workflow passed:

1. Select the QA season and Round 1; Generate produces **270 current facts**, complete 4/4 analysis and **no warnings**.
2. Approve Hastin McGill's +25 fact. Featuring was disabled while pending and became available after approval.
3. Feature the fact; the existing public homepage Pulse bar displayed the short highlight. Hide removed it. No QA highlight remains active.
4. Copy Round Facts showed the success message. The browser integration's clipboard read returned an empty value, so an inspectable report preview was added. The exact UI-generated report was verified from that preview: hidden facts excluded, all six acceptance figures present after restoring the private approval, both CI mover directions with ties, supported forecasts, historical comparisons and upcoming matchups.
5. Expand Source and calculation: Hastin's +16 and +9 contest contributions and both source IDs are visible.
6. Add an editorial workflow note: it appears as pending and Commissioner supplied. Hide excludes that test note from exports.

Automated approval review rejected publishing the QA schedule because it would expose copied rosters publicly. No publishing occurred. The user explicitly approved the narrower staging-only read policies in `scripts/staging/pulse-qa-private-roster-reads.sql`: only approved Commissioners can read `pulse-qa-` roster rows. SQL assertions verify Commissioner access to 165 copied roster rows and zero access for noncommissioners and anonymous users. Real-season permissions are unchanged.

Before/after hashes are identical for all original staging results, locked snapshots, stories and homepage highlights. The screenshot is in `docs/evidence/clash-pulse-staging.jpg`.

## Review and production rollout

Staging verification is complete. Production database migrations and deployment have not been performed. The linked local Vercel configuration points to a project in the `cfdt` scope; the available connector returns 403 for that scope, so no cloud deployment target has been assumed. Review the PR and establish the authorized production project before release.

Historical discovery currently exports exact-name recorded prior meetings with dates or earlier-season evidence. It deliberately does not claim exhaustive all-time records, longest streaks, or unusual cross-season performances; those discoveries remain a later extension after the core library rollout.

Automatic generation runs after successful Office finalization/reopening. Database source-change triggers also retire stale facts and enqueue a retry. If generation fails or a correction occurs outside the Office flow, the library displays the queue marker and requires Generate / refresh; no scheduled background queue worker is configured in this change.

The sample briefing is at `tmp/Clash-Pulse-2026-27-Round-1.txt` in this checkout. It is generated from the captured public dataset, clearly labels pending review, and is not published to the site.
