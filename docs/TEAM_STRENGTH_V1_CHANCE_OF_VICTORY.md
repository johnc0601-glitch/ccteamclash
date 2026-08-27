# Chance of Victory calibration — Team Strength V1

## Scope

V1 uses different regular-season probability calibrations as information improves. One curve is not applied blindly to every stage.

Home advantage is always handled upstream as the single +8 CI matchup effect. No probability function adds home a second time.

## Active Roster Strength

The archive does not preserve exact historical point-in-time active rosters. A season-wide reconstructed roster proxy is the closest available test.

Regular-season result with +8: **27/34 (79.4%)** versus **24/34 (70.6%)** without home.

The log-loss-optimal direct strength-difference slope for that proxy is approximately **0.088**:

`P(win) = 1 / (1 + exp(-0.088 × matchup strength difference))`

where:

`matchup strength difference = neutral team strength - neutral opponent strength + venue adjustment`

Confirmed Available Roster Strength uses this same conservative curve for V1 because historical attendance snapshots do not exist.

## Match Lineup Strength

Historical actual participant pools are a direct proxy for the official participant stage. The 35/35/30 participant model with +8 called **30/34 (88.2%)** decided regular-season winners.

Its direct strength-difference log-loss fit is approximately **0.117**. V1 uses that curve once the official participant pool is locked.

## Known singles matchups

Once actual singles matchups and the scoring structure are known, V1 switches from roster-strength difference to **Expected Point Margin**. Doubles can remain unknown and are estimated from the known player pools.

The known-matchup model called **32/34 (94.1%)** decided regular-season winners. Its pooled symmetric expected-margin curve remains:

`P(win) = 1 / (1 + exp(-0.43 × Expected Point Margin))`

## Probability cap

All regular-season V1 curves are capped at **95% / 5%**. The archive is too small to support public near-certainty, and major upsets exist.

## Guardrails

- Active Roster Strength is not the same information as Match Lineup Strength.
- Confirmed Available Roster Strength includes only explicit `Playing` responses.
- Keep the +8 home adjustment outside the stored strength and apply it exactly once.
- Do not use today's CI to reconstruct old predictions.
- Do not use these regular-season curves for playoffs; playoffs can later use richer scenario analysis.
- Record a new calibration/model version when enough new-season data warrants changing a slope.
