import assert from 'node:assert/strict';
import test from 'node:test';
import {CCTEAMCLASH_LEAGUE_ID} from '@/domain/league/League';
import {MockLeagueRepository} from '@/domain/league/LeagueRepository';
import {LeagueService} from '@/domain/league/LeagueService';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';

test('CCTeamClash is available as the initial League', async () => {
  const service = new LeagueService(new MockLeagueRepository());

  const leagues = await service.getAll();

  assert.equal(leagues.length, 1);
  assert.equal(leagues[0].id, CCTEAMCLASH_LEAGUE_ID);
  assert.equal(leagues[0].name, 'CCTeamClash');
});

test('existing, new, and duplicated seasons retain League ownership', async () => {
  const service = new SeasonService(new MockSeasonRepository());
  const existing = await service.getById('summer-team-clash-2026');
  assert.equal(existing?.leagueId, CCTEAMCLASH_LEAGUE_ID);

  const created = await service.create({
    name: 'Winter Team Clash 2027',
    year: 2027,
    description: '',
    startDate: '2027-01-01',
    endDate: '2027-03-31',
    registrationOpen: false,
    published: false,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.data.leagueId, CCTEAMCLASH_LEAGUE_ID);

  const duplicated = await service.duplicate(created.data.id);
  assert.equal(duplicated.ok, true);
  if (!duplicated.ok) return;
  assert.equal(duplicated.data.leagueId, created.data.leagueId);
});
