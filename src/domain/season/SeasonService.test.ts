import assert from 'node:assert/strict';
import test from 'node:test';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import type {SeasonInput} from '@/domain/season/Season';

function validInput(overrides: Partial<SeasonInput> = {}): SeasonInput {
  return {
    name: 'Winter Team Clash 2028',
    year: 2028,
    description: 'Roster-rule test season.',
    startDate: '2028-01-08',
    endDate: '2028-04-29',
    registrationOpen: false,
    mensRosterCap: 25,
    womensRosterCap: null,
    juniorRosterCap: null,
    published: false,
    ...overrides,
  };
}

test('creates season roster caps with nullable unlimited categories', async () => {
  const service = new SeasonService(new MockSeasonRepository());
  const result = await service.create(validInput({mensRosterCap: 30, womensRosterCap: 12}));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.mensRosterCap, 30);
  assert.equal(result.data.womensRosterCap, 12);
  assert.equal(result.data.juniorRosterCap, null);
  assert.equal(result.data.rosterRulesLockedAt, null);
  assert.equal(result.data.rosterRulesLocked, false);
});

test('rejects zero, negative, and non-integer roster caps', async () => {
  const service = new SeasonService(new MockSeasonRepository());
  const result = await service.create(validInput({
    mensRosterCap: 0,
    womensRosterCap: -1,
    juniorRosterCap: 2.5,
  }));

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.fieldErrors?.mensRosterCap);
  assert.ok(result.fieldErrors?.womensRosterCap);
  assert.ok(result.fieldErrors?.juniorRosterCap);
});

test('allows cap changes before the first eligible match starts', async () => {
  const service = new SeasonService(new MockSeasonRepository());
  const existing = await service.getById('team-clash-2027-planning');
  assert.ok(existing);

  const result = await service.update(existing.id, {
    ...validInput(),
    name: existing.name,
    year: existing.year,
    mensRosterCap: 28,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.mensRosterCap, 28);
});

test('rejects cap changes after season roster rules are locked', async () => {
  const service = new SeasonService(new MockSeasonRepository());
  const existing = await service.getById('summer-team-clash-2026');
  assert.ok(existing);

  const result = await service.update(existing.id, {
    ...validInput(),
    name: existing.name,
    year: existing.year,
    startDate: existing.startDate,
    endDate: existing.endDate,
    mensRosterCap: existing.mensRosterCap + 1,
  });

  assert.deepEqual(result, {
    ok: false,
    message: 'Season roster caps are locked because the first match has started.',
  });
});

test('allows non-cap season edits after roster rules are locked', async () => {
  const service = new SeasonService(new MockSeasonRepository());
  const existing = await service.getById('summer-team-clash-2026');
  assert.ok(existing);

  const result = await service.update(existing.id, {
    ...validInput(),
    name: existing.name,
    year: existing.year,
    description: 'Updated without changing roster caps.',
    startDate: existing.startDate,
    endDate: existing.endDate,
    registrationOpen: existing.registrationOpen,
    mensRosterCap: existing.mensRosterCap,
    womensRosterCap: existing.womensRosterCap,
    juniorRosterCap: existing.juniorRosterCap,
    published: existing.published,
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.description, 'Updated without changing roster caps.');
});

test('season duplication copies caps but resets lock state', async () => {
  const service = new SeasonService(new MockSeasonRepository());
  const result = await service.duplicate('summer-team-clash-2026');

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.mensRosterCap, 25);
  assert.equal(result.data.womensRosterCap, null);
  assert.equal(result.data.juniorRosterCap, null);
  assert.equal(result.data.rosterRulesLockAt, null);
  assert.equal(result.data.rosterRulesLockedAt, null);
  assert.equal(result.data.rosterRulesLocked, false);
});
