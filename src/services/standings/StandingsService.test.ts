import type {Team} from '@/models/Team';
import {StandingsService} from '@/services/standings/StandingsService';
import type {
  StandingsStatisticsProvider,
  StandingsTeamProvider,
} from '@/services/standings/StandingsTypes';
import type {TeamStatistics} from '@/services/statistics';
import assert from 'node:assert/strict';
import test from 'node:test';

function createTeam(id: string, name: string, active = true): Team {
  return {
    id,
    name,
    shortName: id.toUpperCase(),
    city: '',
    state: 'NC',
    captain: '',
    homeCourse: '',
    logo: '',
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    website: '',
    facebook: '',
    description: '',
    active,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createStatistics(
  teamId: string,
  wins: number,
  pointsPercentage: number,
  pointDifferential: number,
  pointsFor: number,
): TeamStatistics {
  return {
    teamId,
    seasonId: 'season-1',
    matchesPlayed: wins,
    record: {wins, losses: 0, ties: 0},
    homeRecord: {wins, losses: 0, ties: 0},
    awayRecord: {wins: 0, losses: 0, ties: 0},
    pointsFor,
    pointsAgainst: pointsFor - pointDifferential,
    pointDifferential,
    pointsPercentage,
    currentStreak: wins ? `W${wins}` : '-',
    lastFive: [],
  };
}

class TestTeamProvider implements StandingsTeamProvider {
  async getAll(): Promise<Team[]> {
    return [
      createTeam('team-a', 'Alpha'),
      createTeam('team-b', 'Bravo'),
      createTeam('team-c', 'Charlie'),
      createTeam('team-archived', 'Archived', false),
    ].filter((team) => team.active);
  }
}

class TestStatisticsProvider implements StandingsStatisticsProvider {
  private readonly statistics = new Map<string, TeamStatistics>([
    ['team-a', createStatistics('team-a', 2, 52, 4, 38)],
    ['team-b', createStatistics('team-b', 3, 49, 2, 36)],
    ['team-c', createStatistics('team-c', 2, 55, 1, 40)],
  ]);

  async getTeamStatistics(teamId: string): Promise<TeamStatistics> {
    const statistics = this.statistics.get(teamId);
    if (!statistics) throw new Error(`Missing statistics for ${teamId}.`);
    return statistics;
  }
}

test('StandingsService ranks active teams using the league tiebreak order', async () => {
  const service = new StandingsService(new TestTeamProvider(), new TestStatisticsProvider());
  const standings = await service.getSeasonStandings('season-1');

  assert.deepEqual(
    standings.map((entry) => [entry.rank, entry.team.id]),
    [[1, 'team-b'], [2, 'team-c'], [3, 'team-a']],
  );
});

test('StandingsService retrieves one team with its calculated rank', async () => {
  const service = new StandingsService(new TestTeamProvider(), new TestStatisticsProvider());
  const standing = await service.getTeamStanding('team-c', 'season-1');

  assert.equal(standing?.rank, 2);
  assert.equal(standing?.statistics.pointsPercentage, 55);
});
