import type {Player} from '@/models/Player';
import type {Team} from '@/models/Team';
import type {PlayerRepository} from '@/repositories/PlayerRepository';
import {PlayerService} from '@/services/PlayerService';
import assert from 'node:assert/strict';
import test from 'node:test';

class TestPlayerRepository implements PlayerRepository {
  players: Player[] = [];

  async getAll() { return this.players.map((player) => ({...player})); }
  async getById(id: string) { return this.players.find((player) => player.id === id); }
  async create(player: Player) { this.players.push({...player}); return {...player}; }
  async update(player: Player) {
    const index = this.players.findIndex((candidate) => candidate.id === player.id);
    if (index === -1) return undefined;
    this.players[index] = {...player};
    return {...player};
  }
  async archive(id: string) {
    const player = this.players.find((candidate) => candidate.id === id);
    if (!player) return undefined;
    player.active = false;
    return {...player};
  }
  async delete(id: string) {
    const length = this.players.length;
    this.players = this.players.filter((player) => player.id !== id);
    return this.players.length < length;
  }
}

const team = {id: 'team-1'} as Team;
const teams = {async getById(id: string) { return id === team.id ? team : undefined; }};

test('PlayerService validates team and PDGA data', async () => {
  const service = new PlayerService(new TestPlayerRepository(), teams);
  const result = await service.create({
    name: 'Test Player',
    teamId: 'missing-team',
    pdgaNumber: 'ABC',
    pdgaRating: -1,
    gender: 'Female',
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.fieldErrors?.teamId);
    assert.ok(result.fieldErrors?.pdgaNumber);
    assert.ok(result.fieldErrors?.pdgaRating);
  }
});

test('PlayerService creates and filters active players', async () => {
  const repository = new TestPlayerRepository();
  const service = new PlayerService(repository, teams);
  const created = await service.create({
    name: 'Test Player',
    teamId: 'team-1',
    pdgaNumber: '12345',
    pdgaRating: 950,
    gender: 'Female',
  });

  assert.equal(created.ok, true);
  const players = await service.getAll({status: 'active', teamId: 'team-1'});
  assert.equal(players.length, 1);
  assert.equal(players[0].gender, 'Female');
});
