import type {
  HistoricalImportRepository,
} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import type {
  HistoricalImportResult,
  HistoricalSeasonImportSource,
} from '@/domain/history/HistoricalRecord';
import type {Player} from '@/models/Player';
import type {Team} from '@/models/Team';
import assert from 'node:assert/strict';
import test from 'node:test';

class TestHistoricalImportRepository implements HistoricalImportRepository {
  appliedResult: HistoricalImportResult | undefined;
  private readonly sources: HistoricalSeasonImportSource[];

  constructor(sources: HistoricalSeasonImportSource[]) {
    this.sources = sources;
  }

  async getSources() {
    return this.sources;
  }

  async getAppliedResult() {
    return this.appliedResult;
  }

  async saveAppliedResult(result: HistoricalImportResult) {
    this.appliedResult = result;
    return result;
  }
}

class TestTeamService {
  teams: Team[] = [];

  async getAll() {
    return this.teams;
  }

  async create(input: Omit<Team, 'id' | 'active' | 'createdAt' | 'updatedAt'>) {
    const team: Team = {
      ...input,
      id: input.name.toLocaleLowerCase().replaceAll(' ', '-'),
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.teams.push(team);
    return {ok: true as const, data: team};
  }

  async update(id: string, input: Omit<Team, 'id' | 'active' | 'createdAt' | 'updatedAt'>) {
    const index = this.teams.findIndex((team) => team.id === id);
    if (index === -1) return {ok: false as const, message: 'Missing team.'};
    this.teams[index] = {...this.teams[index], ...input};
    return {ok: true as const, data: this.teams[index]};
  }

  async activate(id: string) {
    const team = this.teams.find((candidate) => candidate.id === id);
    if (!team) return {ok: false as const, message: 'Missing team.'};
    team.active = true;
    return {ok: true as const, data: team};
  }
}

class TestPlayerService {
  players: Player[] = [];

  async getAll() {
    return this.players;
  }

  async create(input: Omit<Player, 'id' | 'active' | 'createdAt' | 'updatedAt'>) {
    const player: Player = {
      ...input,
      id: input.name.toLocaleLowerCase().replaceAll(' ', '-'),
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    this.players.push(player);
    return {ok: true as const, data: player};
  }
}

const source: HistoricalSeasonImportSource = {
  id: 'season-1',
  name: 'Season 1',
  sourceFilename: 'source.xlsx',
  teamRecords: [
    {
      id: 'team-1',
      seasonId: 'season-1',
      teamName: 'Dark Knights',
      wins: 3,
      losses: 1,
      ties: 0,
      matchesPlayed: 4,
      pointsEarned: 75,
      pointsAvailable: 100,
    },
  ],
  playerRecords: [
    {
      id: 'player-1',
      seasonId: 'season-1',
      teamName: 'Dark Knights',
      playerName: 'Test Player',
      pdgaNumber: '',
      pdgaRating: null,
      singles: {wins: 2, losses: 1, ties: 0, matchesPlayed: 3},
      doubles: {wins: 1, losses: 0, ties: 1, matchesPlayed: 2},
    },
  ],
};

test('HistoricalImportService calculates player overall records from singles and doubles', async () => {
  const service = new HistoricalImportService(
    new TestHistoricalImportRepository([source]),
    new TestTeamService(),
    new TestPlayerService(),
  );
  const overview = await service.getOverview();
  const player = overview.previews[0].playerRecords[0];

  assert.deepEqual(player.singles, {wins: 2, losses: 1, ties: 0, matchesPlayed: 3});
  assert.deepEqual(player.doubles, {wins: 1, losses: 0, ties: 1, matchesPlayed: 2});
  assert.deepEqual(player.overall, {wins: 3, losses: 1, ties: 1, matchesPlayed: 5});
  assert.equal(player.overallWinPercentage, 0.7);
});

test('HistoricalImportService applies all historical summary records', async () => {
  const repository = new TestHistoricalImportRepository([source]);
  const teamService = new TestTeamService();
  const playerService = new TestPlayerService();
  const service = new HistoricalImportService(repository, teamService, playerService);
  const result = await service.applyHistoricalRecords();

  assert.equal(result.status, 'Applied');
  assert.equal(result.seasonsApplied, 1);
  assert.equal(result.teamRecordsApplied, 1);
  assert.equal(result.playerRecordsApplied, 1);
  assert.equal(result.teamsCreated, 1);
  assert.equal(result.playersCreated, 1);
  assert.equal(teamService.teams[0].captain, 'Test Player');
  assert.equal(playerService.players[0].teamId, '');
  assert.equal(playerService.players[0].gender, 'Unknown');
  assert.equal((await service.getOverview()).appliedResult?.status, 'Applied');
});
