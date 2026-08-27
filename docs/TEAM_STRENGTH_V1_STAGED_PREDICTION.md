# Team Strength V1 — staged prediction

## Core principle

The percentage should get sharper as the model learns more. V1 therefore keeps the underlying strength label and probability calibration tied to the information actually available.

## Stage 1 — Active Roster Strength

Input: every current active roster player with an effective CI.

Strength is venue-neutral. Matchup prediction applies +8 only when the scheduled home team is actually on its home course.

Historical closest proxy: reconstructed season roster, **27/34 (79.4%)** regular-season winner calls with +8. Direct strength-difference probability slope: **0.088**.

The proxy is intentionally labeled as such because the old archive does not preserve exact roster membership timing.

## Stage 2 — Confirmed Available Roster Strength

Input: only players explicitly marked `Playing`. `Unconfirmed` and `NotPlaying` are excluded.

There is no historical point-in-time attendance archive, so V1 does **not** invent a separate calibration. It retains the conservative **0.088** strength-difference curve until the new season provides enough attendance snapshots.

## Stage 3 — Match Lineup Strength

Input: official locked roster snapshot player IDs.

Historical actual participant pools are the correct proxy here: **30/34 (88.2%)** regular-season winner calls with +8. Direct strength-difference slope: **0.117**.

This stage can produce a sharper probability even before exact singles or doubles pairings are available.

## Stage 4 — Known singles, doubles still unknown

Once actual singles matchups and scoring slots are known, switch to Expected Points. Unknown doubles teams use the deterministic all-plausible-pairs 80/20 model.

Historical regular-season result: **32/34 (94.1%)**. Expected Point Margin uses the **0.43** probability slope.

## Stage 5 — Actual doubles pairings known

Replace pooled doubles expectations with actual 80/20 pair strengths. Exact pairings improved score calibration in the broader backtest, although the all-match winner count stayed 38/41 in both versions.

## Data quality and confidence

- Missing CI is resolved with the established new-player seed rule: PDGA if available, otherwise Open 825 / Women 700.
- Existing provisional CI is preserved and flagged provisional.
- Any provisional input prevents `Full` confidence.
- Any unresolved/omitted player forces `Low` confidence.
- Predictions compare like with like; do not compare Active Roster Strength directly against Confirmed Available Roster Strength.
- The prediction source and label travel with the calculated value.

## Home

Home is context, not team identity:

`neutral strength → +8 matchup adjustment → prediction`

The +8 is never stored inside Active Roster Strength, Confirmed Available Roster Strength, or Match Lineup Strength.
