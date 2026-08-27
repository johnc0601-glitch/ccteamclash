# Team Strength V1 — prediction snapshot plan

## Why this exists

The current historical archive is strong at result-level reconstruction but weak at early prediction stages. It stores actual participants and contest facts, not exact point-in-time season rosters or attendance states.

That forced the V1 backtest to use proxies for Active Roster Strength and Confirmed Available Roster Strength.

The new snapshot model prevents that problem from repeating.

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
- exact player IDs used on both sides;
- provisional, fallback and omitted-player counts.

That is enough to reproduce the published roster-stage prediction later without looking up today's roster or today's CI values.

## Storage policy

The table is internal analytical history. RLS is enabled and no public/authenticated policy is created. A future server-side lifecycle writer should use the service-role client.

The migration is staged with Team Strength V1 but should not be applied to production until the feature is approved for integration.

## Future calibration

After a full season of snapshots, we can fit and compare probability curves independently for:

- Active Roster Strength;
- Confirmed Available Roster Strength;
- Match Lineup Strength.

That will replace the current Active/availability proxy assumptions with real point-in-time evidence.
