# Matchday and CI estimate review

Captain-facing estimates use model version `ci-model-estimates-v2`: venue-neutral roster strengths feed expected point share (scale 105), with the existing +8 CI applied once for a registered home course. Expected margin is 36 × (2 × share − 1); probability is logistic(.20 × margin), capped at 95%, with complementary percentages and whole-percent display. A projected 1–8 point advantage displays approximately 55, 60, 65, 69, 73, 77, 80, 83%. No projected score is shown. These are intentionally conservative estimates, not a newly validated calibration claim. V1 retrospective curves remain unchanged.

Matchday switches to results-first at 6 PM America/New_York on its scheduled date, or earlier on official publication. The clock does not publish. Cancellation, postponement and rain delay do not become finals from elapsed time. Open scheduled pages refresh once per minute on matchday. Pending results retain the verified TCWhiteboard link. Published finals retain matchups and score first, with collapsed supporting sections and both mobile result sections initially open.

Prediction visibility remains restricted to approved captains and commissioners. On or after matchday, only persisted prematch snapshots may be shown; the conservative cutoff excludes captures on matchday. Older missing forecasts remain missing. The existing snapshot cron must be running to capture future estimates. Saved estimates are never reconstructed from updated CI.

TCWhiteboard final JSON now stages clean matches directly into one review screen. Unmatched identities can be resolved against the official side's roster. Fuzzy aliases and uncertain adjustments require review. Successfully saved identity mappings are remembered only in that browser and are rechecked against the current official roster. Changed files reset review. Existing draft/finalization and duplicate-CI guards remain in place. No unverified TCWhiteboard API or embedded scoring is introduced.

The additive migration stores optional source round, card, starting hole, result text and stroke totals separately from league outcomes and points. New final snapshots copy this metadata. Existing locked snapshots are not rewritten. Legacy score fields remain null for imported contests. The migration must be applied before the new importer is used.

## Verification

- 105 team-strength/saved-prediction tests pass.
- 19 Matchday, source-link and import tests pass.
- 5 result integration and 18 final-scoreboard tests pass.
- Application typecheck passes (`npx tsc --noEmit -p tsconfig.review.json`). The unrestricted root typecheck includes pre-existing incompatible test files.
- Local production build passes using staging publishable credentials only, with no service-role key.
- Desktop and 390px mobile fixture preview checked in the browser, including the expanded estimate and retained dropdowns. `/dev/matchday-preview` returns 404 in production.
- New components and services lint without errors; the gauge follows the existing site image convention, which produces the existing Next image-optimization warning.

## Remaining before production

The migration has not been applied to staging or production. Test draft save, reload, finalization, source metadata freezing and duplicate finalization against a staging database after applying the migration. Browser review used illustrative fixture data, not authenticated commissioner imports. Confirm the existing prediction snapshot schedule operates before the next matchday; historical missing snapshots must not be backfilled. Production deployment requires explicit approval.
