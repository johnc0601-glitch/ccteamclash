import assert from 'node:assert/strict';
import test from 'node:test';

import {
  automaticPointsAwardedToOpponentFromSlots,
  exactAutomaticStructuralPointComponents,
  STANDARD_DOUBLES_PLAYER_SLOTS,
  STANDARD_POINTS_PER_REQUIRED_PLAYER,
  STANDARD_SINGLES_PLAYER_SLOTS,
  structuralScoringSignals,
  WOMEN_BONUS_OPPORTUNITIES_PER_EXTRA_FEMALE,
} from './StructuralScoring';

test('a normal 18-player balanced-female pool has no minimum structural signal', () => {
  const signals = structuralScoringSignals(
    {playerCount: 18, femalePlayerCount: 2},
    {playerCount: 18, femalePlayerCount: 2},
  );

  assert.ok(signals);
  assert.equal(signals.teamPlayerShortfall, 0);
  assert.equal(signals.opponentPlayerShortfall, 0);
  assert.equal(signals.teamMinimumAutomaticPoints, 0);
  assert.equal(signals.opponentMinimumAutomaticPoints, 0);
  assert.equal(signals.teamWomenBonusOpportunityCount, 0);
  assert.equal(signals.opponentWomenBonusOpportunityCount, 0);
});

test('one missing unique player guarantees at least one singles and one doubles point', () => {
  assert.equal(STANDARD_POINTS_PER_REQUIRED_PLAYER, 2);

  const signals = structuralScoringSignals(
    {playerCount: 17, femalePlayerCount: 2},
    {playerCount: 18, femalePlayerCount: 2},
  );

  assert.ok(signals);
  assert.equal(signals.teamPlayerShortfall, 1);
  assert.equal(signals.teamMinimumAutomaticPoints, 0);
  assert.equal(signals.opponentMinimumAutomaticPoints, 2);
});

test('roster shortfall is only a lower bound because 18+ players can still leave format slots empty', () => {
  const signals = structuralScoringSignals(
    {playerCount: 19, femalePlayerCount: 2},
    {playerCount: 18, femalePlayerCount: 2},
  );

  assert.ok(signals);
  assert.equal(signals.teamPlayerShortfall, 0);
  assert.equal(signals.opponentMinimumAutomaticPoints, 0);

  assert.equal(
    automaticPointsAwardedToOpponentFromSlots({
      singlesPlayerSlotsFilled: 18,
      doublesPlayerSlotsFilled: 17,
    }),
    1,
  );
});

test('exact slot audit counts missing singles and doubles player slots separately', () => {
  assert.equal(STANDARD_SINGLES_PLAYER_SLOTS, 18);
  assert.equal(STANDARD_DOUBLES_PLAYER_SLOTS, 18);

  assert.equal(
    automaticPointsAwardedToOpponentFromSlots({
      singlesPlayerSlotsFilled: 17,
      doublesPlayerSlotsFilled: 17,
    }),
    2,
  );
  assert.equal(
    automaticPointsAwardedToOpponentFromSlots({
      singlesPlayerSlotsFilled: 18,
      doublesPlayerSlotsFilled: 16,
    }),
    2,
  );
});

test('exact automatic components award each side points caused by the other side missing slots', () => {
  assert.deepEqual(
    exactAutomaticStructuralPointComponents(
      {singlesPlayerSlotsFilled: 17, doublesPlayerSlotsFilled: 18},
      {singlesPlayerSlotsFilled: 18, doublesPlayerSlotsFilled: 16},
    ),
    {
      team: {automaticPoints: 2},
      opponent: {automaticPoints: 1},
    },
  );
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
});

test('three extra women expose six bonus opportunities without assuming they are won', () => {
  const signals = structuralScoringSignals(
    {playerCount: 20, femalePlayerCount: 4},
    {playerCount: 18, femalePlayerCount: 1},
  );

  assert.ok(signals);
  assert.equal(signals.teamExtraFemaleCount, 3);
  assert.equal(signals.teamWomenBonusOpportunityCount, 6);
});

test('rejects impossible roster and slot profiles', () => {
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
  assert.equal(
    automaticPointsAwardedToOpponentFromSlots({
      singlesPlayerSlotsFilled: 17.5,
      doublesPlayerSlotsFilled: 18,
    }),
    undefined,
  );
});
