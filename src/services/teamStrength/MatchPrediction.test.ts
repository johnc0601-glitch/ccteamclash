import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';

import {
  ACTIVE_ROSTER_WIN_STRENGTH_SLOPE,
  calculateRosterBasedMatchPrediction,
  MATCH_LINEUP_WIN_STRENGTH_SLOPE,
  rosterStageChanceOfVictoryFromStrengthDifference,
} from './MatchPrediction';
import {calculateRosterStageStrength} from './RosterStrength';

test('equal neutral active roster strengths start at 50 percent', () => {
  const team = strength('activeRoster', 900);
  const opponent = strength('activeRoster', 900);
  assert.ok(team && opponent);

  const prediction = calculateRosterBasedMatchPrediction({team, opponent});

  assert.ok(prediction);
  assert.equal(prediction.matchupStrengthDifference, 0);
  assert.equal(prediction.expectedPointShare, 0.5);
  assert.equal(prediction.regularSeasonChanceOfVictory, 0.5);
  assert.equal(prediction.calibrationSlope, ACTIVE_ROSTER_WIN_STRENGTH_SLOPE);
});

test('home advantage is applied in the matchup layer, not the strength result', () => {
  const team = strength('activeRoster', 900);
  const opponent = strength('activeRoster', 900);
  assert.ok(team && opponent);

  const neutral = calculateRosterBasedMatchPrediction({team, opponent});
  const home = calculateRosterBasedMatchPrediction({team, opponent, venue: 'Home'});

  assert.ok(neutral && home);
  assert.equal(team.baseStrength, 900);
  assert.equal(opponent.baseStrength, 900);
  assert.equal('activeRosterStrength' in team, false);
  assert.equal(home.teamBaseStrength, 900);
  assert.equal(home.opponentBaseStrength, 900);
  assert.equal(home.matchupStrengthDifference, 8);
  assert.ok(home.expectedPointShare > neutral.expectedPointShare);
  assert.ok(home.regularSeasonChanceOfVictory > neutral.regularSeasonChanceOfVictory);
});

test('refuses to compare different roster-information stages', () => {
  const active = strength('activeRoster', 900);
  const confirmed = strength('confirmedAvailableRoster', 900);
  assert.ok(active && confirmed);

  assert.equal(
    calculateRosterBasedMatchPrediction({team: active, opponent: confirmed}),
    undefined,
  );
});

test('official match lineup uses the stronger participant-pool calibration', () => {
  const activeTeam = strength('activeRoster', 908);
  const activeOpponent = strength('activeRoster', 900);
  const lineupTeam = strength('matchLineup', 908);
  const lineupOpponent = strength('matchLineup', 900);
  assert.ok(activeTeam && activeOpponent && lineupTeam && lineupOpponent);

  const active = calculateRosterBasedMatchPrediction({team: activeTeam, opponent: activeOpponent});
  const lineup = calculateRosterBasedMatchPrediction({team: lineupTeam, opponent: lineupOpponent});

  assert.ok(active && lineup);
  assert.equal(lineup.calibrationSlope, MATCH_LINEUP_WIN_STRENGTH_SLOPE);
  assert.ok(lineup.regularSeasonChanceOfVictory > active.regularSeasonChanceOfVictory);
});

test('stage-specific win curves are symmetric and capped', () => {
  for (const source of ['activeRoster', 'confirmedAvailableRoster', 'matchLineup'] as const) {
    const plusEight = rosterStageChanceOfVictoryFromStrengthDifference(8, source);
    const minusEight = rosterStageChanceOfVictoryFromStrengthDifference(-8, source);
    assert.ok(Math.abs(plusEight + minusEight - 1) < 1e-12);
    assert.equal(rosterStageChanceOfVictoryFromStrengthDifference(1000, source), 0.95);
    assert.ok(
      Math.abs(rosterStageChanceOfVictoryFromStrengthDifference(-1000, source) - 0.05) < 1e-12,
    );
  }
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

  const prediction = calculateRosterBasedMatchPrediction({team: full, opponent: partial});

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
