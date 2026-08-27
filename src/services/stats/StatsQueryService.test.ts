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
  gender: 'Female',
  active: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const team: Team = {
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

describe('StatsQueryService', () => {
  it('loads players once, keeps canonical historical genders, and snapshots only active players', async () => {
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
      {getAll: async () => [team]},
      {getActive: async () => season},
      {
        getPlayerSeasonStatisticsSnapshot: async (playerIds, seasonId) => {
          snapshotCalls += 1;
          expect(playerIds).toEqual(['p1']);
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
});
