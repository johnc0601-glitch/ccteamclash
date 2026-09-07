import assert from 'node:assert/strict';
import test from 'node:test';
import {CCTEAMCLASH_LEAGUE_ID} from '@/domain/league/League';
import {SeasonService} from '@/domain/season/SeasonService';
import {MockSeasonRepository} from '@/test-fixtures/MockSeasonRepository';

test('existing, new, and duplicated seasons retain league ownership', async () => {
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
