# Clash Pulse 2.0 implementation

Baseline: origin/main ca8b3c6b. Work is isolated from the older roster-preview checkout and its local CSS edit.

## Existing behavior

- `ClashPulseFactCandidateService` reads frozen per-player contest ratings and locked roster forecasts, but limits/diversifies suggestions. It cannot serve as a complete round export.
- `clash_pulse_items`, `/api/clash-pulse`, and `ClashPulseLiveManager` already support short homepage highlights. Preserve their records and rendering.
- Results finalization is atomic through `finalize_clash_match_result`; locked Matchday payloads and CI ledgers are authoritative. Do not change their calculations or records.
- Commissioner authorization uses approved profiles through `requireStoryCommissioner` and database `private.is_launch_commissioner()`.

## Implementation

1. Add a separate private fact table, preserving existing homepage items. Store season/round/match/team/player associations, calculations, references, version, timestamps, review state, and prior revisions.
2. A deterministic generator consumes published results, locked snapshots, frozen contest facts, structural points, saved forecasts, and recorded historical results. Count doubles contests once for upset totals; sum every played contest for each player's CI movement. No current player CI lookup.
3. Add season/round selectors, category grouping, source details, editorial facts, approval/hide/feature controls, and complete plain-text export inside the existing office.
4. Generate after successful finalization, separately from the result transaction. Failures leave results intact and are retriable from the library. Regeneration preserves unchanged approvals and retires changed/removed public highlights.
5. Verify the production Round 1 dataset read-only, run regression checks, validate the additive migration and access controls on staging. Do not deploy production until full staging verification succeeds.

## Initial discoveries

Production has four published Round 1 results and 280 per-player rating rows. Match identifiers contain historical names that differ from current opponents; use schedule team IDs and locked payloads, never parse identifiers. Staging has the final-snapshot table but lacks the newer rating and forecast source tables, so its source-data prerequisite must be addressed before a full application rollout.
