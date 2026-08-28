# Team Strength V1 — Integration and CI Provenance

## Purpose

Preserve prediction accuracy history without allowing the Team Strength feature branch to overwrite newer Stats, Matchday, identity, or Clash Index work.

The architectural invariant is:

> Clash Index feeds Team Strength and Stats independently. Stats does not feed Team Strength.

Prediction snapshots must preserve both the Team Strength model version and the Clash Index model version that produced the player CI values used at capture time.

## Current integration risk

`feature/team-strength-v1` and `main` have diverged substantially. `main` contains newer Stats/Matchday work and the current Clash Index model. Therefore this feature branch must not be merged wholesale.

A concrete example is `src/domain/story-engine/ClashPrediction.ts`:

- feature branch: `2026-27-v1-d100-exp1.8-move2-28-home15-doubles80-20-move75-neutral`
- current main: `2026-27-v1-d100-exp1.8-move2-28-home15-doubles80-20-move50-neutral`

The target branch version is authoritative. Never copy the feature branch version of this file over the target during integration.

## Selective integration map

### Bring forward from Team Strength

Prefer the current feature versions of the dedicated Team Strength files, reviewing each against the target before applying:

- `src/services/teamStrength/PredictionCaptureSchedule.ts`
  - finite Match Lineup capture grace window
  - explicit Expired eligibility state
- `src/services/teamStrength/PredictionCaptureSchedule.test.ts`
- `src/services/teamStrength/PredictionCaptureCoordinator.ts`
  - propagates Expired rather than late-backfilling
- `src/services/teamStrength/PredictionCaptureCoordinator.test.ts`
- `src/services/teamStrength/PredictionSnapshotRepository.ts`
  - stage- and model-isolated frozen snapshot reads
- `src/services/teamStrength/PredictionSnapshotRepository.test.ts`
- `src/services/teamStrength/PublicMatchPrediction.ts`
  - conversion from immutable snapshot to public display model
- `src/services/teamStrength/PublicMatchPrediction.test.ts`
  - frozen CI drift regression coverage
- prediction snapshot/capture files that are absent or older on the target, after diff review

### Manually integrate, do not overwrite

- `src/app/matches/[id]/page.tsx`
  - target branch Matchday changes must win
  - add only the frozen-snapshot read/display behavior
  - retain target attendance, roster, account, and Matchday changes
- `package.json`
  - retain target scripts/dependencies
  - add Team Strength test script only if missing
- `.github/workflows/team-strength.yml`
  - reconcile with target workflow rather than blindly replacing

### Target branch is authoritative — do not replace from feature

- `src/app/stats/**`
- `src/components/stats/**`
- `src/services/stats/**`
- current `src/services/statistics/**` changes
- `src/services/public/PublicPlayerService.ts`
- `src/domain/story-engine/ClashPrediction.ts`
- `src/domain/story-engine/ClashRatingDelta.ts`
- player identity/gender-lock migrations
- current MatchRosterLock timing unless a deliberate prediction-specific adaptation is reviewed

### Database migrations

Do not apply migrations merely as part of code integration.

The prediction snapshot migration remains a separate operational release step. Confirm the target database does not already contain an equivalent table/schema before applying it.

## CI provenance contract

### Problem

`model_version` on a Team Strength snapshot currently identifies the Team Strength formula, for example `team-strength-v1`. It does not identify which Clash Index formula produced the player ratings stored in `team_player_clash_indexes` and `opponent_player_clash_indexes`.

If CI math changes while Team Strength remains 35/35/30, snapshots from the two periods are not fully comparable unless CI provenance is preserved.

### Required future fields

Add these when the prediction snapshot schema is next migrated:

- `team_strength_model_version text not null`
- `ci_model_version text not null`

The existing `model_version` can either:

1. be retained as the Team Strength version for backward compatibility, with `ci_model_version` added; or
2. be renamed in a later migration to `team_strength_model_version`.

For minimum migration risk, option 1 is preferred initially.

### Source of truth

At capture time:

- Team Strength version comes from `TEAM_STRENGTH_VERSION`.
- CI version comes from the canonical `CLASH_MODEL_VERSION` on the target/current codebase.

Do not duplicate the CI version string inside Team Strength code. Import the canonical constant so a CI model change automatically creates distinct provenance for future snapshots.

### Immutable rule

Once a prediction snapshot is written, neither version value may be updated in place.

Old snapshots remain evidence of what the model knew and believed at that point in time.

### Recommended uniqueness

Current uniqueness:

`(match_id, side, source, model_version)`

Once CI provenance exists, use:

`(match_id, side, source, team_strength_model_version, ci_model_version)`

or, during backward-compatible transition:

`(match_id, side, source, model_version, ci_model_version)`

This permits intentional replay/comparison of the same Team Strength version under a later CI model without overwriting historical records.

## Calibration record minimum

Each immutable prediction record should ultimately preserve:

- match ID
- capture stage and timestamp
- Team Strength model version
- CI model version
- home/neutral venue classification
- exact selected player IDs
- exact player CI values used
- provisional/fallback/omitted counts
- roster composition and shortfall
- home and away neutral Team Strength
- matchup strength difference after venue adjustment
- calibration slope
- predicted win probability
- eventual actual winner
- eventual actual team point totals/margin

Actual results can be joined later by match ID; they do not need to mutate the original prediction snapshot.

## Release sequence

1. Keep `feature/team-strength-v1` as the working reference branch.
2. When preview capacity is available, start from the current `preview/integration`, not from this feature branch.
3. Reconcile dedicated Team Strength service files against the target.
4. Manually add frozen-snapshot behavior to the target Matchday page.
5. Preserve target Stats and current CI model code.
6. Run Team Strength, Stats, Matchday, and relevant CI tests together.
7. Apply/verify the prediction snapshot migration only after explicit approval.
8. Validate one consolidated preview.
9. Only then consider production.

## Current release gate

As of this document, the feature-branch Team Strength test workflow is green after adding finite capture expiry, model-isolated snapshot reads, frozen public prediction behavior, and float-safe regression assertions.
