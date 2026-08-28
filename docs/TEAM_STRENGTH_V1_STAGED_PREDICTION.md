# Team Strength V1 — staged prediction

## Core principle

The public percentage should get sharper only as roster information improves. V1 keeps the underlying strength label and probability calibration tied to the information actually available before play.

The website does **not** draft singles or doubles matchups. Captains draft in person on event day, so actual pairings are not a public pre-match prediction stage.

## Stage 1 — Active Roster Strength

Input: every current active roster player with an effective CI.

Strength is venue-neutral. Matchup prediction applies +8 only when the scheduled home team is actually on its registered home course.

Historical closest proxy: reconstructed season roster, **27/34 (79.4%)** regular-season winner calls with +8. Direct strength-difference probability slope: **0.088**.

The proxy is intentionally labeled as such because the old archive does not preserve exact roster membership timing.

## Stage 2 — Confirmed Available Roster Strength

Input: only players explicitly marked `Playing`. `Unconfirmed` and `NotPlaying` are excluded.

There is no historical point-in-time attendance archive, so V1 does **not** invent a separate calibration. It retains the conservative **0.088** strength-difference curve until the new season provides enough attendance snapshots.

## Stage 3 — Match Lineup Strength

Input: official locked roster snapshot player IDs.

Historical actual participant pools are the correct proxy here: **30/34 (88.2%)** regular-season winner calls with +8. Direct strength-difference slope: **0.117**.

This is the **final public pre-match stage**. It remains roster-based even though captains may already be drafting pairings in person.

## Post-match retrospective analysis — not a public stage

After the match, actual `ResultContest` singles opponents and doubles pairs can be combined with the **frozen Match Lineup CI snapshot**. That replay is used for retrospective analytics and future model calibration only.

Known singles with pooled doubles produced the historical **32/34 (94.1%)** regular-season winner result. Once actual result pairings are available, exact doubles use the locked **80/20** pair strength rule.

The known-matchup retrospective model uses **Expected Point Margin** with slope **0.43**, capped at **95% / 5%**.

Official team scores remain the truth. Any difference between ordinary CI-rated contest points and the official score is retained as a structural scoring adjustment rather than pushed into CI strength.

## Data quality and confidence

- Missing CI is resolved with the established new-player seed rule: PDGA if available, otherwise Open 825 / Women 700.
- Existing provisional CI is preserved and flagged provisional.
- Any provisional input prevents `Full` confidence.
- Any unresolved/omitted player forces `Low` confidence.
- Predictions compare like with like; do not compare Active Roster Strength directly against Confirmed Available Roster Strength.
- The prediction source and label travel with the calculated value.
- Prediction snapshots freeze each selected player's exact CI value, including an explicit `null` when it was unresolved. Retrospective analysis must never substitute a newer CI.

## Home

Home is context, not team identity:

`neutral strength → +8 matchup adjustment → prediction`

The +8 is never stored inside Active Roster Strength, Confirmed Available Roster Strength, or Match Lineup Strength.
