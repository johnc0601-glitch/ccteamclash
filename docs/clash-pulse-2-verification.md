# Clash Pulse 2.0 verification — October 18, 2026

The commissioner selects a season and round, generates a private fact library from canonical published data, reviews facts, and copies a factual briefing. Approved short facts can be explicitly featured through the existing homepage table.

## Verified

- Production was queried read-only. No production schema, result, CI, snapshot, story, or homepage row was changed.
- Captured Round 1 public statistics produce **270 facts**, including four final scores, 21 individual contest upsets, 140 player CI summaries, individual achievements, team and round totals, six recorded historical meetings, and four upcoming matches.
- Acceptance figures: **21 upsets / 105 played contests (20.0%)**, **31 both-format winners**, **8 perfect performers on losing teams**, **Hastin McGill +25**, **Beast Mode +40 combined player CI**, **4 home wins**.
- Ten generator/export tests pass. Missing or duplicate ratings, invalid probabilities, partial rounds, snapshot mismatches, unplayed contests, tied fifth-place movers, and missing forecast freezes are covered.
- Combined focused regression run: **38/38 pass**, covering the new engine, final scoreboard, adjustment breakdown, upset verification, frozen roster predictions, and CI movement.
- The existing ResultsIntegration suite has **two pre-existing failures**: a score-validation assertion expects an error for a now-valid score, and another expects wording that differs from the implementation. Both the suite and ResultsService are identical to origin/main; this change only adds supplemental generation in the office action.
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

## Remaining rollout work

**Do not deploy production yet.** Staging does not have the current `clash_contest_rating_facts`, `clash_match_rating_snapshots`, `clash_match_publications`, and forecast source schema/data used by production. Bring those dependencies to parity through their existing migrations before exercising the signed-in Commissioner page against staging. Rerun this idempotent migration afterward so source-change triggers attach to tables added later. No source tables or statistical records were fabricated to conceal that gap.

The source adapter, generator, and persistence were verified separately; a signed-in browser run through Generate → Approve → Feature → Hide → Copy has **not** been completed. That is the remaining end-to-end staging gate.

Historical discovery currently exports exact-name recorded prior meetings with dates or earlier-season evidence. It deliberately does not claim exhaustive all-time records, longest streaks, or unusual cross-season performances; those discoveries remain a later extension after the core library rollout.

Automatic generation runs after successful Office finalization/reopening. Database source-change triggers also retire stale facts and enqueue a retry. If generation fails or a correction occurs outside the Office flow, the library displays the queue marker and requires Generate / refresh; no scheduled background queue worker is configured in this change.

The sample briefing is at `tmp/Clash-Pulse-2026-27-Round-1.txt` in this checkout. It is generated from the captured public dataset, clearly labels pending review, and is not published to the site.
