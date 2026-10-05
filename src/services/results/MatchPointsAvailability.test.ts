import assert from 'node:assert/strict';
import test from 'node:test';
import type {ResultContestInput, ResultContestPlayerInput} from '@/domain/results/MatchResult';
import {calculateMatchPointsAvailability} from './MatchPointsAvailability';

test('counts one available point per filled scoreboard player slot', () => {
  const contests = [
    contest('s1', 'Singles', [
      player('home-m', 'Home', 1),
      player('away-m', 'Away', 1),
    ]),
    contest('d1', 'Doubles', [
      player('home-m', 'Home', 1),
      player('home-m2', 'Home', 2),
      player('away-m', 'Away', 1),
      player('away-m2', 'Away', 2),
    ]),
  ];
  const result = calculateMatchPointsAvailability(contests, genders({
    'home-m': 'Male',
    'home-m2': 'Male',
    'away-m': 'Male',
    'away-m2': 'Male',
  }));
  assert.deepEqual(result, {
    homeBasePointsAvailable: 3,
    awayBasePointsAvailable: 3,
    homeGenderBonusAvailable: 0,
    awayGenderBonusAvailable: 0,
    homePointsAvailable: 3,
    awayPointsAvailable: 3,
  });
});

test('blank player slots reduce only that team points available', () => {
  const contests = [
    contest('s1', 'Singles', [
      player('home-m', 'Home', 1),
      player('', 'Away', 1),
    ]),
  ];
  const result = calculateMatchPointsAvailability(contests, genders({'home-m': 'Male'}));
  assert.equal(result.homePointsAvailable, 1);
  assert.equal(result.awayPointsAvailable, 0);
});

test('female versus male singles adds one bonus opportunity to female team', () => {
  const result = calculateMatchPointsAvailability([
    contest('s1', 'Singles', [
      player('home-f', 'Home', 1),
      player('away-m', 'Away', 1),
    ]),
  ], genders({'home-f': 'Female', 'away-m': 'Male'}));
  assert.equal(result.homeBasePointsAvailable, 1);
  assert.equal(result.homeGenderBonusAvailable, 1);
  assert.equal(result.homePointsAvailable, 2);
  assert.equal(result.awayPointsAvailable, 1);
});

test('mixed doubles versus two men adds one bonus opportunity', () => {
  const result = calculateMatchPointsAvailability([
    contest('d1', 'Doubles', [
      player('home-f', 'Home', 1),
      player('home-m', 'Home', 2),
      player('away-m1', 'Away', 1),
      player('away-m2', 'Away', 2),
    ]),
  ], genders({
    'home-f': 'Female',
    'home-m': 'Male',
    'away-m1': 'Male',
    'away-m2': 'Male',
  }));
  assert.equal(result.homeGenderBonusAvailable, 1);
  assert.equal(result.homePointsAvailable, 3);
  assert.equal(result.awayPointsAvailable, 2);
});

test('two women versus two men adds two bonus opportunities', () => {
  const result = calculateMatchPointsAvailability([
    contest('d1', 'Doubles', [
      player('home-f1', 'Home', 1),
      player('home-f2', 'Home', 2),
      player('away-m1', 'Away', 1),
      player('away-m2', 'Away', 2),
    ]),
  ], genders({
    'home-f1': 'Female',
    'home-f2': 'Female',
    'away-m1': 'Male',
    'away-m2': 'Male',
  }));
  assert.equal(result.homeGenderBonusAvailable, 2);
  assert.equal(result.homePointsAvailable, 4);
});

test('two women versus mixed doubles adds one bonus opportunity', () => {
  const result = calculateMatchPointsAvailability([
    contest('d1', 'Doubles', [
      player('home-f1', 'Home', 1),
      player('home-f2', 'Home', 2),
      player('away-f', 'Away', 1),
      player('away-m', 'Away', 2),
    ]),
  ], genders({
    'home-f1': 'Female',
    'home-f2': 'Female',
    'away-f': 'Female',
    'away-m': 'Male',
  }));
  assert.equal(result.homeGenderBonusAvailable, 1);
  assert.equal(result.awayGenderBonusAvailable, 0);
});

test('a blank opponent is not treated as a male for gender bonus', () => {
  const result = calculateMatchPointsAvailability([
    contest('d1', 'Doubles', [
      player('home-f1', 'Home', 1),
      player('home-f2', 'Home', 2),
      player('away-m', 'Away', 1),
      player('', 'Away', 2),
    ]),
  ], genders({
    'home-f1': 'Female',
    'home-f2': 'Female',
    'away-m': 'Male',
  }));
  assert.equal(result.homeGenderBonusAvailable, 1);
  assert.equal(result.homePointsAvailable, 3);
  assert.equal(result.awayPointsAvailable, 1);
});

test('Round 1 blank-slot pattern produces 36 available for full side and 35 for short side', () => {
  const contests: ResultContestInput[] = [
    ...Array.from({length: 18}, (_, index) => contest(`s${index + 1}`, 'Singles', [
      player(`home-s${index + 1}`, 'Home', 1),
      player(index === 15 ? '' : `away-s${index + 1}`, 'Away', 1),
    ])),
    ...Array.from({length: 9}, (_, index) => contest(`d${index + 1}`, 'Doubles', [
      player(`home-d${index + 1}-1`, 'Home', 1),
      player(`home-d${index + 1}-2`, 'Home', 2),
      player(`away-d${index + 1}-1`, 'Away', 1),
      player(`away-d${index + 1}-2`, 'Away', 2),
    ])),
  ];
  const playerGenders = new Map<string, 'Male' | 'Female' | 'Unknown'>();
  for (const row of contests.flatMap((entry) => entry.players)) {
    if (row.playerId) playerGenders.set(row.playerId, 'Male');
  }

  const result = calculateMatchPointsAvailability(contests, playerGenders);
  assert.equal(result.homePointsAvailable, 36);
  assert.equal(result.awayPointsAvailable, 35);
});

function contest(
  id: string,
  format: ResultContestInput['format'],
  players: ResultContestPlayerInput[],
): ResultContestInput {
  return {
    id,
    format,
    position: 1,
    homeOutcome: 'T',
    awayOutcome: 'T',
    homeScore: null,
    awayScore: null,
    players,
  };
}

function player(
  playerId: string,
  side: ResultContestPlayerInput['side'],
  slot: ResultContestPlayerInput['slot'],
): ResultContestPlayerInput {
  return {
    playerId,
    teamId: side === 'Home' ? 'home' : 'away',
    side,
    slot,
  };
}

function genders(
  entries: Record<string, 'Male' | 'Female' | 'Unknown'>,
): ReadonlyMap<string, 'Male' | 'Female' | 'Unknown'> {
  return new Map(Object.entries(entries));
}
