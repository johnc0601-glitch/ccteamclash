import assert from 'node:assert/strict';
import test from 'node:test';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {MockPlayerRepository} from '@/repositories/PlayerRepository';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {PublicPlayerService} from '@/services/public/PublicPlayerService';
import {TeamService} from '@/services/TeamService';
import {MockStatisticsRepository, StatisticsEngine} from '@/services/statistics';

function createService() {
  const teams = new TeamService(new MockTeamRepository());
  const players = new PlayerService(new MockPlayerRepository(), teams);
  const seasons = new SeasonService(new MockSeasonRepository());
  const statistics = new StatisticsEngine(new MockStatisticsRepository());
  return new PublicPlayerService(players, teams, seasons, statistics);
}

test('roster identity selection preserves historical career stats when historical teamId is blank', async () => {
  const service = createService();
  const views = await service.getForPlayerIdentities([
    {id: 'abel-jimenez', name: 'Abel Jimenez'},
  ]);

  assert.equal(views.length, 1);
  assert.equal(views[0].player.id, 'abel-jimenez');
  assert.equal(views[0].player.teamId, '');
  assert.equal(views[0].careerStatistics.seasonId, 'historical');
  assert.equal(views[0].careerStatistics.matchesPlayed, 7);
  assert.deepEqual(views[0].careerStatistics.overallRecord, {wins: 5, losses: 1, ties: 1});
});

test('roster identity selection retains normalized-name fallback for canonical id changes', async () => {
  const service = createService();
  const views = await service.getForPlayerIdentities([
    {id: 'current-roster-id-for-abel', name: '  Abel   Jimenez  '},
  ]);

  assert.equal(views.length, 1);
  assert.equal(views[0].player.id, 'abel-jimenez');
  assert.deepEqual(views[0].careerStatistics.overallRecord, {wins: 5, losses: 1, ties: 1});
});
