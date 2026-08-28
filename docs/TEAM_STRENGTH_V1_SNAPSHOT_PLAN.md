# Team Strength V1 — prediction snapshot plan

## Why this exists

The current historical archive is strong at result-level reconstruction but weak at early prediction stages. It stores actual participants and contest facts, not exact point-in-time season rosters or attendance states.

That forced the V1 backtest to use proxies for Active Roster Strength and Confirmed Available Roster Strength. It also makes old automatic-point and women-bonus reconstruction less reliable than it should be.

The new snapshot model prevents both problems from repeating.

## Fixed lifecycle captures

Each match can store one immutable prediction per side, source and model version at three defined checkpoints:

1. **PreMatch** → Active Roster Strength
2. **AttendanceFinal** → Confirmed Available Roster Strength
3. **RosterLock** → Match Lineup Strength

The database constraint ties each source to its correct capture reason so a caller cannot relabel a later player pool as an earlier one.

## What is frozen

Every snapshot stores:

- match/team/opponent and side;
- exact source and canonical label;
- model version and capture time;
- venue classification;
- base neutral strengths and venue-adjusted matchup difference;
- expected point share and Chance of Victory;
- calibration slope and confidence;
- exact selected player IDs on both sides, including selected IDs whose CI cannot be resolved;
- total selected player count;
- female, male and unknown/unresolved gender counts;
- raw shortfall from the standard 18-player structure;
- provisional, fallback and omitted-player counts.

The gender counts are constrained to sum to the selected player count. A selected ID with no current player record is counted as unknown for composition purposes rather than disappearing from the snapshot.

The raw shortfall field is a **diagnostic**, not an automatic-points award. The rules layer decides when a lineup shortfall is sufficiently known to turn into deterministic structural points.

This is enough to reproduce the published roster-stage prediction later without looking up today's roster or today's CI values, and to study structural scoring with the information that actually existed before the match.

## Storage policy

The table is internal analytical history. RLS is enabled and no public/authenticated policy is created. The server-side lifecycle writer uses the service-role client.

The migration is staged with Team Strength V1 but should not be applied to production until the feature is approved for integration.

## Future calibration

After a full season of snapshots, we can fit and compare probability curves independently for:

- Active Roster Strength;
- Confirmed Available Roster Strength;
- Match Lineup Strength.

We can also test, without reconstruction bias:

- how often a Friday attendance shortfall becomes a true locked-lineup shortfall;
- the actual automatic-point effect of locked short rosters;
- women bonus opportunity frequency by female-count differential;
- whether matchup-level CI can predict how often those bonus opportunities are converted.

That will replace the current Active/availability proxy assumptions with real point-in-time evidence.
