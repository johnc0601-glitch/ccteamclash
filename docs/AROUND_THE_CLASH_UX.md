# Around the Clash — commissioner UX

Status: preview planning. Keep hidden from players/public.

## Principle

The commissioner should not have to build a report. Opening Around the Clash should already show the current round's ranked statistics.

## Entry points

### Primary
Commissioner/Admin navigation -> **Around the Clash** with a `PREVIEW` badge.

Default state: current/most recently completed round.

### Secondary
Completed Matchday page -> **View match stats**. This opens the same Stats Desk scoped to that match. Do not create a separate match-stat product.

## Top controls

Keep controls to one compact row:

`Round 1`  |  `Match / Round / Season / All-Time`  |  `Singles + Doubles`

Round should be the default. Avoid requiring team/player/filter setup before useful information appears.

## Category navigation

Use horizontal category chips/tabs, not a giant dashboard:

`Upsets` `CI Gaps` `Above Expected` `Road` `Home` `Singles` `Doubles` `CI +/-` `Closest`

Opening category: **Upsets**.

Each category is simply a ranked table/list. Show enough rows that commissioners can choose many names; do not default to only a Top 3.

## Ranked row

Compact first-pass row:

`#1  Jon Smith   Wild Turkey   18%   W`

Secondary context can sit beneath or expand on tap:

`Away · Singles · -105 CI · +12 CI`

The primary scan should answer: who, team, how unusual, result.

For doubles:

`#3  Jon Smith / Sam Lee   Ninjas   27%   W`

Do not show formulas in the normal desk.

## Selection for Around the Clash

Every ranked row gets one simple action: **Add**.

When selected it goes into a small persistent `Selected stories` tray. A commissioner can move through categories and collect interesting items without losing selections.

Selected tray actions later:

- reorder;
- remove;
- add a short commissioner note;
- generate recap/social copy.

Do not make AI generation part of the stats-browsing workflow yet.

## Player expectation / team expectation

These are better as separate category views than mixed into contest rankings:

`Players vs Expected` and `Teams vs Expected`.

Columns should remain simple:

`Player | Actual | Expected | +/-`

This can surface many average players naturally because expectation is ability-adjusted.

## Mobile

This will often be used at/after an event on a phone. Prefer stacked ranked rows over wide tables. Scope/category controls should remain sticky. The selected-story tray can collapse to `Selected (4)`.

## Zero-work workflow

Ideal commissioner experience after all results are posted:

1. Open Around the Clash.
2. Current round is already selected.
3. Upsets are already ranked.
4. Tap `Add` beside interesting results.
5. Swipe/tap through other categories and add more.
6. Review Selected stories.
7. Later: generate/edit the round recap.

No copying names, entering CI, calculating probabilities, or rebuilding Matchday data.

## Guardrails

- PREVIEW / commissioner only.
- No automatic publishing.
- No automatic story suppression or forced name diversity.
- Raw ranking remains available even after items are selected.
- Show model/version details only in an info/debug panel.
- If a contest lacks a valid frozen CI snapshot, label it `Not rated` rather than inventing probability.
