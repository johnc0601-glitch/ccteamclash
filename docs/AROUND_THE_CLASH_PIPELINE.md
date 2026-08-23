# Around the Clash result pipeline

Status: preview branch only. Commissioner/internal feature; no public UI.

## Fixed 2026-27 model assumptions

- Singles prediction: +15 CI to the home player for expectation only.
- Doubles prediction: stronger/weaker player weighted 80/20.
- Doubles home adjustment: 0.
- Current displayed CI is never changed merely because a player is home.

## Matchday publication sequence

The Matchday result is the single source of entry. The intended publication transaction is:

1. Validate the complete team result and all singles/doubles contests.
2. Load every contest participant and their current CI.
3. Freeze one `clash_match_rating_snapshots` row per rated participant before applying any contest from the match.
4. Calculate every contest from that same frozen state. Do not allow contest order to change another contest's starting CI within the team match.
5. Persist each player's CI delta/result facts needed by player history and analytics.
6. Apply the aggregate CI updates to `launch_players.clash_index`.
7. Publish the parent `launch_match_results` row.
8. The existing player-history query reads the published contests automatically; no duplicate manual player-history entry is created.
9. Around the Clash derives probabilities, expected points, upsets and rankings from the frozen snapshot plus the published contests.

If any step fails, the CI update/publication unit must fail rather than leave a partially rated match.

## Why the snapshot is mandatory

A post-match CI cannot be used to reconstruct the probability of the match that produced it. The frozen snapshot is the historical source of truth for:

- win probability at the time of play;
- lowest-probability wins / upset rankings;
- CI gap overcome;
- performance versus expected points;
- home/away analysis;
- doubles 80/20 analysis;
- Match, Round, Season and All-Time rankings;
- future model validation.

## Existing player profile

Do not redesign the player profile for this work. Published `launch_result_contests` and `launch_result_contest_players` already form the canonical current-season player-history source. New Matchday contests should flow into the existing Previous Matches presentation automatically. CI change can be added to that existing row when the rating-delta persistence is wired, without adding the deeper prediction data to the profile.

## Next implementation slice

Before wiring production publication, add a durable per-player/per-contest rating fact record containing at minimum:

- match and contest IDs;
- player ID;
- CI before;
- expected probability/score;
- actual result;
- CI delta;
- CI after;
- model version.

That record should power both the small `W/L +/-CI` player-history value and the much richer commissioner-only Stats Engine.
