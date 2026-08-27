import assert from 'node:assert/strict';
import test from 'node:test';

import {
  automaticStructuralPointComponents,
  STANDARD_POINTS_PER_REQUIRED_PLAYER,
  structuralScoringSignals,
  WOMEN_BONUS_OPPORTUNITIES_PER_EXTRA_FEMALE,
} from './StructuralScoring';

test('a normal 18-player balanced-female structure has no structural adjustment', () => {
  const signals = structuralScoringSignals(
    {playerCount: 18, femalePlayerCount: 2},
    {playerCount: 18, femalePlayerCount: 2},
  );

  assert.ok(signals);
  assert.equal(signals.teamPlayerShortfall, 0);
  assert.equal(signals.opponentPlayerShortfall, 0);
  assert.equal(signals.teamAutomaticPoints, 0);
  assert.equal(signals.opponentAutomaticPoints, 0);
  assert.equal(signals.teamWomenBonusOpportunityCount, 0);
  assert.equal(signals.opponentWomenBonusOpportunityCount, 0);
});

test('one missing player exposes one singles and one doubles point to the opponent', () => {
  assert.equal(STANDARD_POINTS_PER_REQUIRED_PLAYER, 2);

  const signals = structuralScoringSignals(
    {playerCount: 17, femalePlayerCount: 2},
    {playerCount: 18, femalePlayerCount: 2},
  );

  assert.ok(signals);
  assert.equal(signals.teamPlayerShortfall, 1);
  assert.equal(signals.teamAutomaticPoints, 0);
  assert.equal(signals.opponentAutomaticPoints, 2);

  assert.deepEqual(automaticStructuralPointComponents(signals), {
    team: {automaticPoints: 0},
    opponent: {automaticPoints: 2},
  });
});

test('shortfalls work symmetrically when both sides are under eighteen', () => {
  const signals = structuralScoringSignals(
    {playerCount: 17, femalePlayerCount: 2},
    {playerCount: 16, femalePlayerCount: 2},
  );

  assert.ok(signals);
  assert.equal(signals.teamPlayerShortfall, 1);
  assert.equal(signals.opponentPlayerShortfall, 2);
  assert.equal(signals.teamAutomaticPoints, 4);
  assert.equal(signals.opponentAutomaticPoints, 2);
});

test('a 2F versus 1F structure exposes two women bonus opportunities to the 2F team', () => {
  assert.equal(WOMEN_BONUS_OPPORTUNITIES_PER_EXTRA_FEMALE, 2);

  const signals = structuralScoringSignals(
    {playerCount: 18, femalePlayerCount: 2},
    {playerCount: 18, femalePlayerCount: 1},
  );

  assert.ok(signals);
  assert.equal(signals.teamExtraFemaleCount, 1);
  assert.equal(signals.opponentExtraFemaleCount, 0);
  assert.equal(signals.teamWomenBonusOpportunityCount, 2);
  assert.equal(signals.opponentWomenBonusOpportunityCount, 0);

  // Opportunity count is deliberately not promoted to expected/automatic points.
  assert.deepEqual(automaticStructuralPointComponents(signals), {
    team: {automaticPoints: 0},
    opponent: {automaticPoints: 0},
  });
});

test('three extra women expose six bonus opportunities without assuming they are won', () => {
  const signals = structuralScoringSignals(
    {playerCount: 20, femalePlayerCount: 4},
    {playerCount: 18, femalePlayerCount: 1},
  );

  assert.ok(signals);
  assert.equal(signals.teamExtraFemaleCount, 3);
  assert.equal(signals.teamWomenBonusOpportunityCount, 6);
  assert.equal(automaticStructuralPointComponents(signals).team.automaticPoints, 0);
});

test('rejects impossible roster profiles', () => {
  assert.equal(
    structuralScoringSignals(
      {playerCount: 1, femalePlayerCount: 2},
      {playerCount: 18, femalePlayerCount: 2},
    ),
    undefined,
  );
  assert.equal(
    structuralScoringSignals(
      {playerCount: 17.5, femalePlayerCount: 2},
      {playerCount: 18, femalePlayerCount: 2},
    ),
    undefined,
  );
});
