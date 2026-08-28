# Team Strength V1 — prediction snapshot plan

## Why this exists

The historical archive is strong at result-level reconstruction but weak at early prediction stages. It stores actual participants and contest facts, not exact point-in-time season rosters or attendance states.

That forced the V1 backtest to use proxies for Active Roster Strength and Confirmed Available Roster Strength. It also means a later retrospective replay must not look up a player's newer Clash Index.

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
- exact selected player IDs on both sides;
- **the exact per-player Clash Index used for every selected ID**;
- an explicit `null` CI when a selected player could not be resolved at capture time;
- total selected player count;
- female, male and unknown/unresolved gender counts;
- raw shortfall from the standard 18-player structure;
- provisional, fallback and omitted-player counts.

The per-player CI pair is the critical calibration lock. A future replay must use the captured value, including fallback CI, and must never substitute a player's current rating for a captured `null`.

The gender counts are constrained to sum to the selected player count. A selected ID with no current player record is counted as unknown for composition purposes rather than disappearing from the snapshot.

The raw shortfall field is a **diagnostic**, not an automatic-points award. Structural scoring remains separate from roster strength.

This is enough to reproduce the published roster-stage prediction later without looking up today's roster or today's CI values.

## Post-match calibration

Actual singles/doubles pairings are not captured as a pre-match stage. After the match, `ResultContest` assignments are combined with the frozen **Match Lineup** player-CI snapshot.

Ordinary complete contests are replayed from frozen CI. The official team score remains the scoring truth; any residual between ordinary CI-rated contest points and the official score is retained separately as structural scoring (automatic points, women bonus points, penalties, or another official adjustment).

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
- the official structural-score residual associated with short rosters;
- women bonus opportunity frequency by female-count differential;
- whether matchup-level frozen CI predicts how often those opportunities are converted;
- how the post-match actual-pairing model compares with the three public roster stages.

That will replace the current Active/availability proxy assumptions with real point-in-time evidence.
