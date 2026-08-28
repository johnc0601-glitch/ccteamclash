import {describe, expect, it} from 'vitest';
import type {Season} from '@/domain/season/Season';
import type {Player} from '@/models/Player';
import type {Team} from '@/models/Team';
import type {PlayerStatistics} from '@/services/statistics';
import {StatsQueryService} from '@/services/stats/StatsQueryService';

const activePlayer: Player = {
  id: 'p1',
  name: 'Player One',
  teamId: 'team-a',
  pdgaNumber: '12345',
  pdgaRating: 950,
  clashIndex: 1012,
  gender: 'Male',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const historicalPlayer: Player = {
  id: 'lizzie-goddard',
  name: 'Lizzie Goddard',
  teamId: '',
  pdgaNumber: '',
  pdgaRating: null,
  clashIndex: null,
  gender: 'Female',
  active: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const inactiveCurrentPlayer: Player = {
  id: 'p2',
  name: 'Player Two',
  teamId: '',
  pdgaNumber: '67890',
  pdgaRating: 920,
  clashIndex: 980,
  gender: 'Female',
  active: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const teamA: Team = {
  id: 'team-a',
  name: 'Team A',
  shortName: 'A',
  city: '',
  state: '',
  captain: '',
  homeCourse: '',
  logo: '',
  primaryColor: '',
  secondaryColor: '',
  website: '',
  facebook: '',
  description: '',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const teamB: Team = {...teamA, id: 'team-b', name: 'Team B', shortName: 'B'};

const season: Season = {
  id: 'season-1',
  leagueId: 'league-1',
  name: 'Coastal Clash 2026-2027',
  year: 2026,
  description: '',
  startDate: '2026-09-01',
  endDate: '2027-03-01',
  registrationOpen: false,
  active: true,
  published: true,
  archived: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const statistics: PlayerStatistics = {
  playerId: 'p1',
  playerName: 'Player One',
  seasonId: 'season-1',
  teamIds: ['team-a'],
  matchesPlayed: 3,
  finalsQualified: false,
  singlesRecord: {wins: 2, losses: 0, ties: 0},
  doublesRecord: {wins: 0, losses: 1, ties: 0},
  overallRecord: {wins: 2, losses: 1, ties: 0},
  winPercentage: 66.6666666667,
  pointsEarned: 2,
  currentStreak: 'W1',
};

const inactiveStatistics: PlayerStatistics = {
  ...statistics,
  playerId: 'p2',
  playerName: 'Player Two',
  teamIds: ['team-b'],
  matchesPlayed: 1,
  overallRecord: {wins: 1, losses: 0, ties: 0},
  singlesRecord: {wins: 1, losses: 0, ties: 0},
  doublesRecord: {wins: 0, losses: 0, ties: 0},
  winPercentage: 100,
  pointsEarned: 1,
};

describe('StatsQueryService', () => {
  it('loads players once, preserves canonical historical genders, and snapshots all player ids', async () => {
    let playerLoads = 0;
    let snapshotCalls = 0;
    const service = new StatsQueryService(
      {
        getAll: async (query) => {
          playerLoads += 1;
          expect(query).toEqual({status: 'all'});
          return [activePlayer, historicalPlayer];
        },
      },
      {getAll: async () => [teamA]},
      {getActive: async () => season},
      {
        getPlayerSeasonStatisticsSnapshot: async (playerIds, seasonId) => {
          snapshotCalls += 1;
          expect(playerIds).toEqual(['p1', 'lizzie-goddard']);
          expect(seasonId).toBe('season-1');
          return {
            statistics: [statistics],
            ciMovements: new Map([['p1', {
              playerId: 'p1',
              seasonId: 'season-1',
              ciGain: 6,
              singlesCiGain: 8,
              doublesCiGain: -2,
              ratedContests: 3,
            }]]),
          };
        },
      },
    );

    const snapshot = await service.getSnapshot();

    expect(playerLoads).toBe(1);
    expect(snapshotCalls).toBe(1);
    expect(snapshot.genderByPlayerId.get('lizzie-goddard')).toBe('Female');
    expect(snapshot.playerViews).toHaveLength(1);
    expect(snapshot.playerViews[0]).toMatchObject({
      player: {id: 'p1', clashIndex: 1012},
      teamName: 'Team A',
      currentSeasonId: 'season-1',
      currentSeasonName: 'Coastal Clash 2026-2027',
      currentStatistics: {matchesPlayed: 3},
      currentCiGain: 6,
      currentSinglesCiGain: 8,
      currentDoublesCiGain: -2,
    });
  });

  it('keeps inactive players who already have published current-season results', async () => {
    const service = new StatsQueryService(
      {getAll: async () => [inactiveCurrentPlayer]},
      {getAll: async () => [teamB]},
      {getActive: async () => season},
      {
        getPlayerSeasonStatisticsSnapshot: async () => ({
          statistics: [inactiveStatistics],
          ciMovements: new Map(),
        }),
      },
    );

    const snapshot = await service.getSnapshot('team-b');

    expect(snapshot.playerViews).toHaveLength(1);
    expect(snapshot.playerViews[0]).toMatchObject({
      player: {id: 'p2', active: false},
      teamName: 'Team B',
      currentStatistics: {matchesPlayed: 1},
    });
  });

  it('attributes a transferred active player to both result teams and the current team', async () => {
    const transferredPlayer: Player = {...activePlayer, teamId: 'team-b'};
    const service = new StatsQueryService(
      {getAll: async () => [transferredPlayer]},
      {getAll: async () => [teamA, teamB]},
      {getActive: async () => season},
      {
        getPlayerSeasonStatisticsSnapshot: async () => ({
          statistics: [statistics],
          ciMovements: new Map(),
        }),
      },
    );

    const fromOldTeam = await service.getSnapshot('team-a');
    const fromCurrentTeam = await service.getSnapshot('team-b');

    expect(fromOldTeam.playerViews[0]?.teamName).toBe('Team A / Team B');
    expect(fromCurrentTeam.playerViews[0]?.teamName).toBe('Team A / Team B');
  });
});
