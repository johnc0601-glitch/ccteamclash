# Team Strength V1 — staged prediction

## Why the probability model changes with information

A percentage should reflect how much the model actually knows. Active Roster Strength is useful early, but it does not know attendance, singles matchups, doubles teams, or even the final number of scoring slots. Once matchup information arrives, Expected Point Margin becomes the better input.

For that reason V1 does **not** use one Chance of Victory calculation blindly at every stage.

## Historical regular-season calibration

The current archive has 35 home-venue regular-season matches, 34 of them decided.

| Information stage | Historical winner calls | Accuracy | Probability calibration |
| --- | ---: | ---: | --- |
| Roster-strength proxy (35/35/30 +8 matchup home effect) | 30 / 34 | 88.2% | Strength-difference logistic slope 0.117 |
| Actual singles matchups + pooled unknown doubles | 32 / 34 | 94.1% | Expected-margin logistic slope 0.43 |
| Actual singles + actual doubles pairings | 31 / 34 | 91.2% | Exact pairings improve score calibration; V1 retains the 0.43 regular-season curve |

The locked-pairing row should not be read as evidence that knowing pairings is harmful. Exact doubles pairings improved projected-score calibration in the broader backtest. With only 34 decided regular-season matches, one result can change winner accuracy materially.

## V1 rules

### Active Roster Strength

Use venue-adjusted **roster strength difference directly**:

`team neutral strength - opponent neutral strength + venue adjustment`

with the regular-season +8 CI home effect applied once in that matchup difference.

Chance of Victory uses:

`1 / (1 + exp(-0.117 * matchup strength difference))`

and remains capped at 95% / 5%.

This is preferable to first converting roster strength into Expected Point Margin because, early in the week, the eventual number of scoring slots is not yet known. A direct strength-difference fit had essentially the same historical predictive quality without inventing a match size.

### Confirmed Available Roster Strength

Use the same **0.117 strength-difference curve** for now. The historical archive does not contain point-in-time attendance snapshots, so fitting a separate availability curve would manufacture precision. Refit this stage after the new season creates enough attendance history.

Only players explicitly marked **Playing** belong in Confirmed Available Roster Strength. `Unconfirmed` and `NotPlaying` do not.

### Known singles / doubles still unknown

Once actual scoring structure is known, switch to Expected Points and Expected Point Margin. Use the **0.43** expected-margin curve already implemented by the expected-points service. Doubles are estimated deterministically across plausible 80/20 pairs; no Monte Carlo is required.

### Locked lineup

Do not collapse a locked lineup back into one roster-strength number for prediction. Use the contest-level expected-points model. V1 keeps the conservative 0.43 regular-season probability curve rather than introducing another locked-lineup probability parameter from a tiny sample.

## Calibration stability warning

The data strongly warns against chasing season-specific probability parameters. For the early roster-strength model, fitting the two regular seasons separately produced strength-difference slopes of roughly 0.30 for 2024-25 and 0.080 for 2025-26. For the later known-matchup model, the separate expected-margin fits were also far apart (about 2.09 and 0.30).

That instability is why V1 uses pooled, simple calibrations and the 95% / 5% ceiling.

## Data-quality rules

- A roster-strength result carries its source and label with it.
- Predictions compare the same information stage on both teams; Active Roster Strength is not compared directly with Confirmed Available Roster Strength.
- Missing CI values are not silently removed. When CI is absent, the roster adapter uses the established season-start seed rule: PDGA when available, otherwise Open 825 / Women 700.
- Existing provisional CI values are preserved as current values and flagged provisional; they are not overwritten by the fallback baseline inside the model.
- Any provisional input lowers a full roster calculation to Partial confidence. Any unresolved/omitted player lowers it to Low confidence.
- Home advantage is never stored inside roster strength. The +8 CI home effect is applied once, inside matchup prediction.
