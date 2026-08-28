import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {HistoricalSeasonArchive} from '@/data/historicalSeed';
import type {StatsQuerySnapshot} from '@/services/stats/StatsQueryService';
import {InvalidStatsSeasonError, StatsPageService} from './StatsPageService';
import type {StatsGroup, StatsRow} from './StatsPageModel';

const row: StatsRow = {
  playerId: 'player-1', playerName: 'Player One', teamName: 'Team One', teamNames: ['Team One'],
  gender: 'Open', matchesPlayed: 3, wins: 2, losses: 1, ties: 0, winPercentage: 66.7,
  singlesWins: 1, singlesLosses: 1, singlesTies: 0, doublesWins: 1, doublesLosses: 0,
  doublesTies: 0, points: 2, clashIndex: 900,
};

const snapshot = {
  playerViews: [{
    player: {
      id: 'player-1', name: 'Player One', teamId: 'team-1', pdgaNumber: '', pdgaRating: null,
      clashIndex: 900, gender: 'Male', active: true, createdAt: '', updatedAt: '',
    },
    teamName: 'Team One', currentSeasonId: 'live-season', currentSeasonName: 'Coastal Clash 2026-2027',
    currentStatistics: {
      playerId: 'player-1', playerName: 'Player One', seasonId: 'live-season', teamIds: ['team-1'],
      matchesPlayed: 3, finalsQualified: false,
      singlesRecord: {wins: 1, losses: 1, ties: 0}, doublesRecord: {wins: 1, losses: 0, ties: 0},
      overallRecord: {wins: 2, losses: 1, ties: 0}, winPercentage: 66.7, pointsEarned: 2,
      currentStreak: 'W1',
    },
  }],
  genderByPlayerId: new Map([['player-1', 'Male']]),
} as StatsQuerySnapshot;

const archives = [{seasonId: 'historical-season', seasonName: 'Coastal Clash 2025-2026'}] as HistoricalSeasonArchive[];

function createService() {
  const calls = {ci: [] as Array<string | undefined>, groups: [] as Array<string | undefined>, gender: 0};
  const service = new StatsPageService({
    getSnapshot: async () => snapshot,
    getHistoricalArchives: () => archives,
    loadHistoricalCiGains: async (seasonId) => { calls.ci.push(seasonId); return new Map(); },
    loadHistoricalGenderMap: async () => { calls.gender += 1; return new Map(); },
    loadHistoricalStatsGroups: async (_ci, _gender, seasonId) => {
      calls.groups.push(seasonId);
      return [{id: 'historical-season', label: 'Coastal Clash 2025-2026', rows: [row]}] satisfies StatsGroup[];
    },
  });
  return {service, calls};
}

test('current-season Stats performs zero historical reads', async () => {
  const {service, calls} = createService();
  const result = await service.getPageData('live-season');
  assert.equal(result.selectedGroup.id, 'live-season');
  assert.deepEqual(calls, {ci: [], groups: [], gender: 0});
});

test('historical Stats scopes every historical loader to the selected season', async () => {
  const {service, calls} = createService();
  const result = await service.getPageData('historical-season');
  assert.equal(result.selectedGroup.id, 'historical-season');
  assert.deepEqual(calls, {ci: ['historical-season'], groups: ['historical-season'], gender: 1});
});

test('Overall Stats requests the complete historical archive', async () => {
  const {service, calls} = createService();
  const result = await service.getPageData();
  assert.equal(result.selectedGroup.id, 'overall');
  assert.deepEqual(calls, {ci: [undefined], groups: [undefined], gender: 1});
});

test('invalid and explicit Overall season parameters canonicalize through an invalid-season result', async () => {
  const {service} = createService();
  await assert.rejects(() => service.getPageData('missing'), InvalidStatsSeasonError);
  await assert.rejects(() => service.getPageData('overall'), InvalidStatsSeasonError);
});
