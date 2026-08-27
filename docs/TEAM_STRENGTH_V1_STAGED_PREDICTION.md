# Team Strength V1 — staged prediction

## Why the probability curve changes with information

A percentage should reflect how much the model actually knows. Active Roster Strength is useful early, but it does not know attendance, singles matchups, or doubles teams. Once matchup information arrives, the expected-point margin becomes more informative.

For that reason V1 does **not** use one Chance of Victory calibration blindly at every stage.

## Historical regular-season calibration

The current archive has 35 home-venue regular-season matches, 34 of them decided.

| Information stage | Historical winner calls | Accuracy | Log-loss fitted margin slope |
| --- | ---: | ---: | ---: |
| Roster-strength proxy (35/35/30 +8 matchup home effect) | 30 / 34 | 88.2% | 0.33 |
| Actual singles matchups + pooled unknown doubles | 32 / 34 | 94.1% | 0.43 |
| Actual singles + actual doubles pairings | 31 / 34 | 91.2% | 0.48 |

The locked-pairing row should not be read as evidence that knowing pairings is harmful. Exact doubles pairings improved projected-score calibration in the broader backtest. With only 34 decided regular-season matches, one result can change winner accuracy materially.

## V1 rules

### Active Roster Strength

Use the **0.33** expected-margin slope. This is the earliest and least certain stage.

### Confirmed Available Roster Strength

Use the same **0.33** curve for now. The historical archive does not contain point-in-time attendance snapshots, so fitting a separate availability curve would manufacture precision. Refit this stage after the new season creates enough attendance history.

Only players explicitly marked **Playing** belong in Confirmed Available Roster Strength. `Unconfirmed` and `NotPlaying` do not.

### Known singles / doubles still unknown

Use the **0.43** curve already implemented by the expected-points service. Doubles are estimated deterministically across plausible 80/20 pairs; no Monte Carlo is required.

### Locked lineup

Do not collapse a locked lineup back into one roster-strength number for prediction. Use the contest-level expected-points model. V1 keeps the conservative 0.43 regular-season probability curve rather than introducing a separate 0.48 locked-lineup curve from a tiny sample.

## Calibration stability warning

The pooled 0.43 known-matchup slope is materially more stable than pretending either individual season is enough to calibrate probability. Fitting the two regular seasons separately produced very different log-loss slopes (about 2.09 for 2024-25 and 0.30 for 2025-26). That is a sample-size warning, not a reason to chase either season-specific value.

The regular-season display remains capped at 95% / 5%.

## Data-quality rules

- A roster-strength result carries its source and label with it.
- Predictions compare the same information stage on both teams; Active Roster Strength is not compared directly with Confirmed Available Roster Strength.
- Missing CI values are not silently removed. When CI is absent, the roster adapter uses the established season-start seed rule: PDGA when available, otherwise Open 825 / Women 700.
- Existing provisional CI values are preserved as current values and flagged provisional; they are not overwritten by the fallback baseline inside the model.
- Any provisional input lowers a full roster calculation to Partial confidence. Any unresolved/omitted player lowers it to Low confidence.
- Home advantage is never stored inside roster strength. The +8 CI home effect is applied once, inside matchup prediction.
