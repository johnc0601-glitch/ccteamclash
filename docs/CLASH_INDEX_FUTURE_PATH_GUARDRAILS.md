# Clash Index future-path guardrails

Status: design contract for preview branch. These rules should be settled before production Matchday rating writes are enabled.

## 1. Separate four kinds of truth

Keep these concepts independent:

1. **Matchday result truth** — who played, format, score/outcome, home/away.
2. **Rating snapshot truth** — CI immediately before the team match.
3. **Rating fact truth** — probability, expected score, CI delta and model version for each contest/player.
4. **Current player CI** — a derived latest value, convenient for display but never sufficient to reconstruct history.

Around the Clash reads #1-3. Player cards primarily display #4.

## 2. Never recalculate old stories from today's CI

Historical rankings must use the frozen rating fact created for that contest. A later model change or CI change must not silently rewrite what was considered an upset at the time.

## 3. Model version is immutable per rated contest

Store model version on snapshots/facts. New seasons can use a revised model without corrupting old rankings.

For cross-model All-Time lists, retain the original pre-match probability as the comparison statistic. If model definitions become too different to compare fairly, the Stats Desk can filter by model era later without changing stored history.

## 4. Corrections are the hardest future path

A published result can affect every later CI. Therefore editing an old rated contest is not a normal CRUD update.

Preferred correction workflow:

- commissioner opens a published result;
- system warns that it is CI-rated;
- correction creates a rerating job/request rather than directly editing rating facts;
- restore player CIs to the snapshot immediately before the corrected match;
- rebuild the corrected match and every later affected rated match in chronological order;
- replace derived rating facts/current CI only after the replay succeeds;
- preserve an audit record of old/new values and who initiated the correction.

Do not ship a button that merely changes an old score while leaving downstream CI untouched.

## 5. Same-match ordering

All contests in one team Matchday use the same pre-team-match CI snapshot. A player appearing more than once in that Matchday does not receive a different starting CI in later rows merely because another row was processed first.

Aggregate all contest deltas, then update current CI once per player at the publication boundary.

## 6. Duplicate publication

Publication must be idempotent. Database uniqueness plus a published/rated marker must make a second submission a no-op/error, never a second CI application.

## 7. Partial data

Never invent ratings. A contest with missing player identity or missing required pre-match CI should be stored as a Matchday result if league rules allow, but marked unrated for analytical purposes until deliberately resolved.

Around the Clash should say `Not rated`, not estimate from current CI.

## 8. Player identity changes

Names and team names stored in rating facts are historical display snapshots. Player IDs remain the durable identity. A later profile rename should not make old facts unjoinable.

Transfers/team changes likewise must not rewrite the historical team attached to a played contest.

## 9. Doubles partner history

Store player-level rating facts and derive a pair-level `RatedResult`. This preserves each player's CI movement while allowing Around the Clash to rank the pair as one performance.

Do not create a permanent synthetic doubles-team identity; partners can change every round.

## 10. Ties

Preserve ties as 0.5 actual points. They are useful for expectation analysis but should not appear in win/upset categories.

## 11. Season rollover

Do not bake season logic into the rating engine. Rated results carry `seasonId`; current CI continuation/reset/seeding can be decided separately. Around the Clash can scope by season regardless of how the next season initializes CI.

## 12. Historical imports

2024-25 / 2025-26 imports should use the same normalized `RatedResult` contract where sufficient source data exists. Imported historical records must be labeled by source/model version and should not masquerade as frozen live snapshots when pre-match CI had to be reconstructed.

## 13. Performance and scale

Do not recompute Elo from the beginning of league history whenever a commissioner opens Around the Clash. Persist immutable rating facts once; ranking reads should operate on those facts. Add database views/indexes later if All-Time volume warrants it.

## 14. UI simplicity

None of these correction/versioning concerns belong in the normal Stats Desk. Normal flow remains:

`Open current round -> browse rankings -> Add interesting items -> write recap`

Expose technical status only when a result is unrated, corrected, or being rerated.

## Production gates

Before enabling automatic CI writes from Matchday:

- canonical CI update formula located and tested;
- atomic publication RPC tested;
- duplicate-publish test passes;
- same-match snapshot test passes;
- doubles 80/20 tests pass;
- singles home-adjustment tests pass;
- correction/rerating policy implemented or old rated-result editing disabled;
- rollback test proves failed publication changes no CI;
- player Previous Matches still populates automatically;
- Stats Desk can read rated facts without write privileges.
