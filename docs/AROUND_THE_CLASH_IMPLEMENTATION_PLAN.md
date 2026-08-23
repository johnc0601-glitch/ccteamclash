# Around the Clash implementation plan

Status: preview only. Do not deploy or apply migrations to production yet.

## Important finding from current ResultsService

`ResultsService.publish()` currently performs multiple independent repository writes: it may save a draft parent, replace contests, then save Published. `SupabaseResultsRepository.replaceContests()` itself deletes contests, inserts contests, then inserts contest players as separate calls. That is adequate for ordinary result persistence but is not atomic enough for CI updates.

Do **not** bolt CI writes directly into those existing calls. A failure after updating some player CIs could leave a partially rated match.

## Target design: one database publication transaction

Add a server-only Supabase/Postgres RPC such as `publish_match_with_clash_index(...)`. It should own the final publication boundary.

Transaction sequence:

1. Lock the match result / reject an already-published match.
2. Validate that the supplied contest set is complete.
3. Resolve participant names, teams, current CI and provisional state from canonical tables. Never trust names/CI supplied by the browser.
4. Freeze one pre-match snapshot for every rated participant.
5. Persist/replace the final contest rows and contest-player rows.
6. Calculate CI deltas using the canonical CI update rules, while using the frozen match snapshot as every contest's starting state.
7. Persist one `clash_contest_rating_facts` row per rated player/contest.
8. Aggregate each player's contest deltas for the team match.
9. Update each player's current CI once.
10. Mark the parent match result Published.
11. Commit everything together.

Any error rolls back all eleven steps.

## Idempotency / reopen rule

Publishing the same match twice must never double-apply CI. The existing published lock remains, plus snapshot/fact primary keys provide database protection.

Reopen needs special handling before this ships. Preferred first-season rule: reopening a CI-rated published result should **not** silently reverse ratings. Commissioner correction should use a dedicated `rerate match` workflow that reverses/rebuilds all later affected CI in chronological order. Until that exists, keep rating publication behind commissioner preview/testing.

## Rating facts vs story facts

`clash_contest_rating_facts` is the immutable numerical source. Story rankings are derived views, not duplicated truth.

Adapter mapping should produce `StoryFact` from rating facts plus schedule/event context:

- `winProbability` <- stored pre-match probability
- `expectedPoints` <- stored expected points
- `actualPoints` <- stored actual points
- `won` <- outcome = W
- `side`, `format`, player/team names <- stored facts
- `ciDeficit` <- effective opposing CI minus player's/pair effective CI, floored only when a ranking specifically wants deficits overcome
- `eventId`, `seasonId`, opponent team <- schedule context

## Ranking scopes

The same ranking functions should accept filtered fact sets:

- Match: `match_id`
- Round: event/round identifier
- Season: season identifier
- All-Time: all compatible model/history facts

Do not store rank numbers permanently. Calculate ranks from facts so corrected/imported history can reorder them.

## First commissioner Stats Desk categories

Keep the first UI broad and sortable:

- Lowest win probability wins
- Largest CI deficit overcome
- Highest performance above expectation
- Road wins ranked by probability
- Home wins ranked by probability
- Singles upset wins
- Doubles upset wins
- Closest projected contests
- Largest positive CI changes
- Largest negative CI changes
- Favorite conversion / losses by probability
- Player expected points vs actual points
- Team expected points vs actual points

No editorial filtering in the data layer.

## Player profile integration

Do not redesign Previous Matches. Join the existing published contest history to `clash_contest_rating_facts` by `(contest_id, player_id)` and expose only `ci_delta` when desired, preserving the existing compact row.

## Implementation order from here

1. Finish pure ranking/aggregation adapters and tests without touching production.
2. Locate the canonical CI update calculator and make it the only provider of `ciDelta`.
3. Design/test the atomic Supabase RPC locally/preview migration.
4. Add repository interface for snapshot/fact reads.
5. Add commissioner-only Stats Desk preview.
6. Run historical/fixture simulations and verify totals manually.
7. Only after validation: apply migrations and wire Matchday Publish to the RPC.
8. Around the Clash presentation comes after the stats prove useful.
