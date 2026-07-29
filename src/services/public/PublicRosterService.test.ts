import assert from 'node:assert/strict';
import test from 'node:test';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {PublicPlayerView} from '@/services/public/PublicPlayerService';
import {buildPublicTeamRoster} from '@/services/public/PublicRosterService';

const timestamp = '2026-07-27T00:00:00.000Z';

test('buildPublicTeamRoster uses current Supabase team assignments', () => {
  const publicPlayers = [publicPlayer('player-one', 'Player One')];
  const launchPlayers = [
    launchPlayer('player-one', 'Player One Corrected', 'dark-knights'),
    launchPlayer('player-two', 'Player Two', 'riptide'),
  ];

  const roster = buildPublicTeamRoster(
    launchPlayers,
    publicPlayers,
    'dark-knights',
    'Dark Knights',
    '2026-2027',
  );

  assert.equal(roster.length, 1);
  assert.equal(roster[0].player.name, 'Player One Corrected');
  assert.equal(roster[0].player.teamId, 'dark-knights');
  assert.equal(roster[0].teamName, 'Dark Knights');
  assert.equal(roster[0].careerStatistics.matchesPlayed, 4);
});

test('buildPublicTeamRoster includes a newly created player without historical statistics', () => {
  const roster = buildPublicTeamRoster(
    [launchPlayer('new-player', 'New Player', 'dark-knights')],
    [],
    'dark-knights',
    'Dark Knights',
    '2026-2027',
  );

  assert.equal(roster.length, 1);
  assert.equal(roster[0].player.name, 'New Player');
  assert.equal(roster[0].careerStatistics.matchesPlayed, 0);
});

function launchPlayer(id: string, name: string, currentTeamId: string): LaunchPlayer {
  return {
    id,
    name,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    currentTeamId,
    homeArea: '',
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function publicPlayer(id: string, name: string): PublicPlayerView {
  const record = {wins: 3, losses: 1, ties: 0};
  return {
    player: {
      id,
      name,
      teamId: '',
      pdgaNumber: '',
      pdgaRating: null,
      gender: 'Male',
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    teamName: 'Unassigned',
    currentSeasonName: 'Current season',
    careerStatistics: {
      playerId: id,
      playerName: name,
      seasonId: 'historical',
      teamIds: [],
      matchesPlayed: 4,
      finalsQualified: false,
      singlesRecord: {...record},
      doublesRecord: {wins: 0, losses: 0, ties: 0},
      overallRecord: {...record},
      winPercentage: 75,
      pointsEarned: 3,
      currentStreak: '--',
    },
    history: [],
  };
}
