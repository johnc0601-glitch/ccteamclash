# Chance of Victory calibration — Team Strength V1

## Scope

V1 uses different regular-season probability calibrations as roster information improves. One curve is not applied blindly to every stage.

Home advantage is always handled upstream as the single +8 CI matchup effect. No probability function adds home a second time.

The public pre-match forecast has exactly three stages: Active Roster Strength, Confirmed Available Roster Strength, and Match Lineup Strength. Actual singles/doubles pairings are post-match retrospective data only.

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

Its direct strength-difference log-loss fit is approximately **0.117**. V1 uses that curve once the official participant pool is locked. This remains the final public pre-match probability.

## Post-match known-matchup calibration

Once the match is complete, actual result contests provide the singles opponents and doubles pairs that were drafted in person. Retrospective analysis combines those pairings with the **frozen pre-match Match Lineup CI values**; it never looks up today's CI.

The historical known-singles / pooled-doubles model called **32/34 (94.1%)** decided regular-season winners. The known-matchup expected-margin curve is:

`P(win) = 1 / (1 + exp(-0.43 × Expected Point Margin))`

This **0.43** curve is for post-match retrospective analytics and future calibration. It does not replace the public Match Lineup forecast before play.

## Probability cap

All regular-season V1 probability curves are capped at **95% / 5%**. The archive is too small to support near-certainty, and major upsets exist.

## Guardrails

- Active Roster Strength is not the same information as Match Lineup Strength.
- Confirmed Available Roster Strength includes only explicit `Playing` responses.
- Keep the +8 home adjustment outside the stored strength and apply it exactly once.
- Do not use today's CI to reconstruct old predictions or actual-matchup expectations.
- Do not expose actual singles/doubles pairings as a pre-match prediction stage.
- Official team scores are the truth for structural scoring reconciliation.
- Do not use these regular-season curves for playoffs; playoffs can later use richer scenario analysis.
- Record a new calibration/model version when enough new-season data warrants changing a slope.
