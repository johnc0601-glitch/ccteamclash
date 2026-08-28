import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import {
  buildPublicMatchPrediction,
  resolvePublicPredictionSource,
} from './PublicMatchPrediction';

test('public prediction stage advances from active roster to availability to locked lineup', () => {
  assert.equal(
    resolvePublicPredictionSource('2026-10-03', new Date('2026-10-01T12:00:00Z')),
    'activeRoster',
  );
  assert.equal(
    resolvePublicPredictionSource('2026-10-03', new Date('2026-10-02T16:01:00Z')),
    'confirmedAvailableRoster',
  );
  assert.equal(
    resolvePublicPredictionSource('2026-10-03', new Date('2026-10-02T19:01:00Z')),
    'matchLineup',
  );
});

test('active-roster forecast includes home advantage once but remains an early estimate', () => {
  const prediction = buildPublicMatchPrediction({
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled',
    hasPublishedResult: false,
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Home',
    homePlayers: players('home', 18, 900),
    awayPlayers: players('away', 18, 900),
    now: new Date('2026-10-01T12:00:00Z'),
  });

  assert.ok(prediction && prediction.state === 'calculated');
  assert.equal(prediction.stageLabel, 'Active Roster Strength');
  assert.equal(prediction.strengthLabel, 'Active Roster Strength');
  assert.equal(prediction.readiness, 'EarlyEstimate');
  assert.equal(prediction.displayLabel, 'Early estimate');
  assert.ok((prediction.homeChanceOfVictory ?? 0) > 0.5);
  assert.ok((prediction.awayChanceOfVictory ?? 1) < 0.5);
  assert.equal(prediction.homeStrength, 900);
  assert.equal(prediction.awayStrength, 900);
  assert.match(prediction.venueNote, /Home-course advantage/);
});

test('neutral equal teams remain a 50-50 early estimate', () => {
  const prediction = buildPublicMatchPrediction({
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled',
    hasPublishedResult: false,
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Neutral',
    homePlayers: players('home', 18, 900),
    awayPlayers: players('away', 18, 900),
    now: new Date('2026-10-01T12:00:00Z'),
  });

  assert.ok(prediction && prediction.state === 'calculated');
  assert.equal(prediction.displayLabel, 'Early estimate');
  assert.equal(prediction.homeChanceOfVictory, 0.5);
  assert.equal(prediction.awayChanceOfVictory, 0.5);
});

test('confirmed available stage uses only Playing players and remains early', () => {
  const homePlayers = players('home', 18, 900);
  const awayPlayers = players('away', 18, 900);
  const prediction = buildPublicMatchPrediction({
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled',
    hasPublishedResult: false,
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Neutral',
    homePlayers,
    awayPlayers,
    homeAttendance: attendance(homePlayers, 'home'),
    awayAttendance: attendance(awayPlayers, 'away'),
    now: new Date('2026-10-02T16:01:00Z'),
  });

  assert.ok(prediction && prediction.state === 'calculated');
  assert.equal(prediction.source, 'confirmedAvailableRoster');
  assert.equal(prediction.stageLabel, 'Confirmed Available Roster Strength');
  assert.equal(prediction.strengthLabel, 'Confirmed Available Roster Strength');
  assert.equal(prediction.readiness, 'EarlyEstimate');
  assert.equal(prediction.displayLabel, 'Early estimate');
});

test('match lineup stage waits rather than falling back to an earlier player pool', () => {
  const prediction = buildPublicMatchPrediction({
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled',
    hasPublishedResult: false,
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Home',
    homePlayers: players('home', 18, 900),
    awayPlayers: players('away', 18, 900),
    now: new Date('2026-10-02T19:01:00Z'),
  });

  assert.ok(prediction && prediction.state === 'waiting');
  assert.equal(prediction.source, 'matchLineup');
  assert.equal(prediction.stageLabel, 'Match Lineup Strength');
});

test('complete match lineup is the final public pre-match prediction stage', () => {
  const homePlayers = players('home', 18, 910);
  const awayPlayers = players('away', 18, 900);
  const prediction = buildPublicMatchPrediction({
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled',
    hasPublishedResult: false,
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Neutral',
    homePlayers,
    awayPlayers,
    officialRosters: [
      officialRoster('home', homePlayers),
      officialRoster('away', awayPlayers),
    ],
    now: new Date('2026-10-02T19:01:00Z'),
  });

  assert.ok(prediction && prediction.state === 'calculated');
  assert.equal(prediction.source, 'matchLineup');
  assert.equal(prediction.stageLabel, 'Match Lineup Strength');
  assert.equal(prediction.strengthLabel, 'Match Lineup Strength');
  assert.equal(prediction.readiness, 'Ready');
  assert.equal(prediction.displayLabel, 'Chance of Victory');
  assert.ok((prediction.homeChanceOfVictory ?? 0) > 0.5);
  assert.equal('homeExpectedPoints' in prediction, false);
  assert.equal('awayExpectedPoints' in prediction, false);
});

test('a published result suppresses live recomputation of the pre-match forecast', () => {
  const prediction = buildPublicMatchPrediction({
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled',
    hasPublishedResult: true,
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Home',
    homePlayers: players('home', 18, 900),
    awayPlayers: players('away', 18, 900),
    now: new Date('2026-10-01T12:00:00Z'),
  });

  assert.equal(prediction, undefined);
});

function players(teamId: string, count: number, ci: number): LaunchPlayer[] {
  return Array.from({length: count}, (_, index) => ({
    id: `${teamId}-${index}`,
    name: `${teamId}-${index}`,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex: ci,
    clashIndexProvisional: false,
    currentTeamId: teamId,
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  }));
}

function attendance(
  roster: readonly LaunchPlayer[],
  teamId: string,
): TeamAttendanceMember[] {
  return roster.map((player) => ({
    playerId: player.id,
    playerName: player.name,
    teamId,
    status: 'Playing',
  }));
}

function officialRoster(
  teamId: string,
  roster: readonly LaunchPlayer[],
): OfficialMatchRoster {
  return {
    id: `roster-${teamId}`,
    matchId: 'match',
    teamId,
    teamNameSnapshot: teamId,
    needsCommissionerReview: false,
    createdAt: '2026-10-03T19:00:00Z',
    updatedBy: null,
    updatedAt: '2026-10-03T19:00:00Z',
    players: roster.map((player) => ({
      id: `snapshot-${player.id}`,
      matchId: 'match',
      teamId,
      teamNameSnapshot: teamId,
      playerId: player.id,
      playerNameSnapshot: player.name,
      createdAt: '2026-10-03T19:00:00Z',
      updatedBy: null,
      updatedAt: '2026-10-03T19:00:00Z',
    })),
  };
}
