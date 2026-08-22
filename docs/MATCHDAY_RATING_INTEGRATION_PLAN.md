# Matchday rating integration plan

Status: PREVIEW ONLY. Do not deploy or apply migrations to production yet.

## Current finding

`ResultsService.publish()` currently validates, optionally persists contests, and then marks the parent result Published through separate repository calls. `SupabaseResultsRepository.replaceContests()` also performs delete/insert operations separately. This is adequate for result entry but is **not atomic enough** for CI updates.

Therefore we should not bolt CI writes directly into `ResultsService.publish()` as a chain of ordinary Supabase calls. A failure after some player ratings changed could leave the match partially rated.

## Production-safe boundary

Create one server-side database transaction/RPC for final publication. Conceptually:

`publish_match_with_clash_rating(match_id, scores, contests, expected_model_version)`

The transaction must:

1. Lock/check the parent match result so an already-published match cannot be rated twice.
2. Validate that every submitted participant belongs to the scheduled home/away team.
3. Load all participating `launch_players` and freeze their CI before any contest is rated.
4. Insert `clash_match_rating_snapshots` once per rated participant.
5. Replace/persist the final contest rows and contest-player rows.
6. Calculate CI deltas using the canonical CI update formula and the locked model version.
7. Insert `clash_contest_rating_facts` for every rated player/contest.
8. Aggregate all contest deltas by player and update `launch_players.clash_index` once per player.
9. Mark `launch_match_results` Published.
10. Commit everything together. Any error rolls the entire operation back.

## Important calculation rule

Every contest in a team match uses the same frozen starting CI snapshot. A player appearing in multiple contests does not carry an updated CI from an earlier contest into a later contest from the same Matchday result.

The final player CI is:

`CI after match = frozen CI + sum(all contest CI deltas for that player)`

The per-contest fact's `clash_index_after` should therefore be interpreted as the isolated effect of that contest, not necessarily the player's final post-match CI when they played multiple contests. If the UI ever needs the final post-match CI, calculate/store the aggregate separately.

## Reopen/correction policy

Do not implement silent re-rating on `reopen()`.

Before production, choose and test an explicit correction flow:

- reverse the original match's aggregate deltas;
- remove/void its analytical facts and snapshot as one transaction;
- republish from the original pre-match state;
- then replay later rated matches if chronology requires it.

Because CI is sequential, editing an old published result can affect every later CI. For the first season, safest behavior is commissioner-only correction tooling with a clear warning and a deterministic replay function.

## Player Previous Matches

No duplicate history table is needed. Existing published `launch_result_contests` + `launch_result_contest_players` remain the match-history source. Join the player's `clash_contest_rating_facts` row to show the compact CI delta beside the existing W/L result.

## Around the Clash

The ranking engine reads immutable rating facts rather than current `launch_players.clash_index`.

Ranking scopes:

- Match: one scheduled match;
- Round: all matches sharing `roundId`;
- Season: all matches sharing `seasonId`;
- All-Time: all compatible recorded model facts.

Store `algorithm_version` on every fact. Cross-version All-Time rankings remain possible, but model-dependent comparisons should be visibly version-aware if the prediction formula materially changes later.

## Next safe coding step

Before writing the RPC, locate and reuse the **canonical CI update/K-factor/provisional formula already used by the site**. Prediction probability and rating movement are related but must not accidentally become two competing implementations.
