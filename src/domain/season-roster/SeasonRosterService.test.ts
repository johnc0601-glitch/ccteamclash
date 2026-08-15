import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AddSeasonRosterMembershipInput,
  SeasonRosterCaps,
  SeasonRosterMembership,
  SeasonTeam,
} from '@/domain/season-roster/SeasonRosterMembership';
import type {SeasonRosterRepository} from '@/domain/season-roster/SeasonRosterRepository';
import {SeasonRosterService} from '@/domain/season-roster/SeasonRosterService';

test('counts active Men, Women, and Junior memberships and excludes dropped members', async () => {
  const repository = new FakeSeasonRosterRepository({
    memberships: [
      membership({playerId: 'man-1', rosterCategory: 'Men'}),
      membership({playerId: 'woman-1', rosterCategory: 'Women'}),
      membership({playerId: 'junior-1', rosterCategory: 'Junior'}),
      membership({playerId: 'dropped-man', rosterCategory: 'Men', status: 'Dropped'}),
      membership({playerId: 'other-team', teamId: 'team-away', rosterCategory: 'Men'}),
    ],
  });

  const counts = await new SeasonRosterService(repository).getRosterCounts('season-one', 'team-home');

  assert.deepEqual(counts, {Men: 1, Women: 1, Junior: 1});
});

test('reports finite remaining capacity and preserves null as unlimited', async () => {
  const repository = new FakeSeasonRosterRepository({
    caps: {Men: 2, Women: null, Junior: 1},
    memberships: [
      membership({playerId: 'man-1', rosterCategory: 'Men'}),
      membership({playerId: 'woman-1', rosterCategory: 'Women'}),
      membership({playerId: 'junior-1', rosterCategory: 'Junior'}),
    ],
  });

  const capacity = await new SeasonRosterService(repository)
    .getRemainingCapacity('season-one', 'team-home');

  assert.deepEqual(capacity, {Men: 1, Women: null, Junior: 0});
});

test('season-team reads and memberships remain separated by stable season ID', async () => {
  const repository = new FakeSeasonRosterRepository({
    seasonTeams: [seasonTeam()],
    memberships: [membership({})],
  });
  const service = new SeasonRosterService(repository);

  assert.deepEqual(await service.listSeasonTeams('season-one'), [seasonTeam()]);
  assert.equal((await service.listMemberships('season-one'))[0].seasonId, 'season-one');
  assert.deepEqual(repository.requestedSeasonIds, ['season-one', 'season-one']);
});

test('friendly add validation does not call or replace the database mutation boundary', async () => {
  const repository = new FakeSeasonRosterRepository();
  const service = new SeasonRosterService(repository);
  const invalid = await service.addMembership({
    seasonId: '',
    teamId: 'team-home',
    playerId: 'player-one',
    rosterCategory: 'Men',
  });

  assert.deepEqual(invalid, {ok: false, message: 'Choose a season.'});
  assert.equal(repository.addCalls, 0);

  const valid = await service.addMembership(addInput());
  assert.equal(valid.ok, true);
  assert.equal(repository.addCalls, 1);
});

test('does not infer or accept an unsupported roster category', async () => {
  const repository = new FakeSeasonRosterRepository();
  const service = new SeasonRosterService(repository);
  const result = await service.addMembership({
    ...addInput(),
    rosterCategory: 'Unknown',
  } as unknown as AddSeasonRosterMembershipInput);

  assert.deepEqual(result, {ok: false, message: 'Choose a valid roster category.'});
  assert.equal(repository.addCalls, 0);
});

test('friendly drop validation leaves authoritative drop decisions to the repository RPC', async () => {
  const repository = new FakeSeasonRosterRepository();
  const service = new SeasonRosterService(repository);

  assert.deepEqual(
    await service.dropMembership({seasonId: 'season-one', playerId: ''}),
    {ok: false, message: 'Choose a player.'},
  );
  assert.equal(repository.dropCalls, 0);

  const result = await service.dropMembership({seasonId: 'season-one', playerId: 'player-one'});
  assert.equal(result.ok, true);
  assert.equal(repository.dropCalls, 1);
});

class FakeSeasonRosterRepository implements SeasonRosterRepository {
  readonly requestedSeasonIds: string[] = [];
  addCalls = 0;
  dropCalls = 0;

  constructor(private readonly values: {
    seasonTeams?: SeasonTeam[];
    memberships?: SeasonRosterMembership[];
    caps?: SeasonRosterCaps;
  } = {}) {}

  async listSeasonTeams(seasonId: string): Promise<SeasonTeam[]> {
    this.requestedSeasonIds.push(seasonId);
    return this.values.seasonTeams ?? [];
  }

  async listMemberships(seasonId: string): Promise<SeasonRosterMembership[]> {
    this.requestedSeasonIds.push(seasonId);
    return this.values.memberships ?? [];
  }

  async getRosterCaps(): Promise<SeasonRosterCaps | undefined> {
    return this.values.caps ?? {Men: 25, Women: null, Junior: null};
  }

  async addMembership(input: AddSeasonRosterMembershipInput): Promise<SeasonRosterMembership> {
    this.addCalls += 1;
    return membership(input);
  }

  async dropMembership(): Promise<SeasonRosterMembership> {
    this.dropCalls += 1;
    return membership({status: 'Dropped'});
  }
}

function seasonTeam(): SeasonTeam {
  return {
    id: 'season-team-id',
    seasonId: 'season-one',
    teamId: 'team-home',
    addedBy: 'commissioner-profile',
    createdAt: '2026-08-15T12:00:00Z',
  };
}

function addInput(): AddSeasonRosterMembershipInput {
  return {
    seasonId: 'season-one',
    teamId: 'team-home',
    playerId: 'player-one',
    rosterCategory: 'Men',
  };
}

function membership(
  overrides: Partial<SeasonRosterMembership> = {},
): SeasonRosterMembership {
  const dropped = overrides.status === 'Dropped';
  return {
    id: `membership-${overrides.playerId ?? 'player-one'}`,
    seasonId: 'season-one',
    teamId: 'team-home',
    playerId: 'player-one',
    rosterCategory: 'Men',
    status: 'Active',
    addedBy: 'captain-profile',
    addedAt: '2026-08-15T12:00:00Z',
    droppedBy: dropped ? 'captain-profile' : null,
    droppedAt: dropped ? '2026-08-16T12:00:00Z' : null,
    createdAt: '2026-08-15T12:00:00Z',
    updatedAt: dropped ? '2026-08-16T12:00:00Z' : '2026-08-15T12:00:00Z',
    ...overrides,
  };
}
