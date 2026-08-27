import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';

import {
  calculateRosterBasedMatchPrediction,
  rosterStageChanceOfVictoryFromExpectedMargin,
} from './MatchPrediction';
import {calculateRosterStageStrength} from './RosterStrength';

test('equal neutral roster strengths start at 50 percent', () => {
  const team = strength('activeRoster', 900);
  const opponent = strength('activeRoster', 900);
  assert.ok(team && opponent);

  const prediction = calculateRosterBasedMatchPrediction({
    team,
    opponent,
    maximumPoints: 36,
    venue: 'Neutral',
  });

  assert.ok(prediction);
  assert.equal(prediction.expectedPointShare, 0.5);
  assert.equal(prediction.teamExpectedPoints, 18);
  assert.equal(prediction.opponentExpectedPoints, 18);
  assert.equal(prediction.expectedPointMargin, 0);
  assert.equal(prediction.regularSeasonChanceOfVictory, 0.5);
});

test('home advantage is applied in the matchup layer, not the strength result', () => {
  const team = strength('activeRoster', 900);
  const opponent = strength('activeRoster', 900);
  assert.ok(team && opponent);

  const neutral = calculateRosterBasedMatchPrediction({team, opponent, maximumPoints: 36});
  const home = calculateRosterBasedMatchPrediction({team, opponent, maximumPoints: 36, venue: 'Home'});

  assert.ok(neutral && home);
  assert.equal(team.activeRosterStrength, 900);
  assert.equal(opponent.activeRosterStrength, 900);
  assert.ok(home.teamExpectedPoints > neutral.teamExpectedPoints);
  assert.ok(home.regularSeasonChanceOfVictory > neutral.regularSeasonChanceOfVictory);
});

test('refuses to compare different roster-information stages', () => {
  const active = strength('activeRoster', 900);
  const confirmed = strength('confirmedAvailableRoster', 900);
  assert.ok(active && confirmed);

  assert.equal(
    calculateRosterBasedMatchPrediction({
      team: active,
      opponent: confirmed,
      maximumPoints: 36,
    }),
    undefined,
  );
});

test('locked lineup strength must use the contest-level model', () => {
  const team = strength('matchLineup', 900);
  const opponent = strength('matchLineup', 900);
  assert.ok(team && opponent);

  assert.equal(
    calculateRosterBasedMatchPrediction({team, opponent, maximumPoints: 36}),
    undefined,
  );
});

test('roster-stage win curve is symmetric and deliberately conservative', () => {
  const plusOne = rosterStageChanceOfVictoryFromExpectedMargin(1);
  const minusOne = rosterStageChanceOfVictoryFromExpectedMargin(-1);

  assert.ok(plusOne > 0.58 && plusOne < 0.59);
  assert.ok(Math.abs(plusOne + minusOne - 1) < 1e-12);
});

test('prediction confidence is limited by the weaker side', () => {
  const fullPlayers = players(18, 900, false);
  const partialPlayers = players(18, 900, false);
  partialPlayers[17] = player('p-17', 900, true);

  const full = calculateRosterStageStrength(
    'activeRoster',
    fullPlayers,
    fullPlayers.map((candidate) => candidate.id),
  );
  const partial = calculateRosterStageStrength(
    'activeRoster',
    partialPlayers,
    partialPlayers.map((candidate) => candidate.id),
  );
  assert.ok(full && partial);

  const prediction = calculateRosterBasedMatchPrediction({
    team: full,
    opponent: partial,
    maximumPoints: 36,
  });

  assert.ok(prediction);
  assert.equal(prediction.confidence, 'Partial');
});

function strength(
  source: 'activeRoster' | 'confirmedAvailableRoster' | 'matchLineup',
  ci: number,
) {
  const pool = players(18, ci, false);
  return calculateRosterStageStrength(source, pool, pool.map((candidate) => candidate.id));
}

function players(count: number, ci: number, provisional: boolean): LaunchPlayer[] {
  return Array.from({length: count}, (_, index) =>
    player(`p-${index}`, ci, provisional),
  );
}

function player(id: string, ci: number, provisional: boolean): LaunchPlayer {
  return {
    id,
    name: id,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex: ci,
    clashIndexProvisional: provisional,
    currentTeamId: 'team',
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  };
}
