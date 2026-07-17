import {PLAYER_MOCK_DATA} from '@/data/players';
import type {Player} from '@/models/Player';

export interface PlayerRepository {
  getAll(): Promise<Player[]>;
  getById(id: string): Promise<Player | undefined>;
  create(player: Player): Promise<Player>;
  update(player: Player): Promise<Player | undefined>;
  archive(id: string): Promise<Player | undefined>;
  delete(id: string): Promise<boolean>;
}

function clonePlayer(player: Player): Player {
  return {...player};
}

export class MockPlayerRepository implements PlayerRepository {
  private players: Player[] = PLAYER_MOCK_DATA.map(clonePlayer);

  async getAll(): Promise<Player[]> {
    return this.players.map(clonePlayer);
  }

  async getById(id: string): Promise<Player | undefined> {
    const player = this.players.find((candidate) => candidate.id === id);
    return player ? clonePlayer(player) : undefined;
  }

  async create(player: Player): Promise<Player> {
    const storedPlayer = clonePlayer(player);
    this.players.push(storedPlayer);
    return clonePlayer(storedPlayer);
  }

  async update(player: Player): Promise<Player | undefined> {
    const index = this.players.findIndex((candidate) => candidate.id === player.id);
    if (index === -1) return undefined;

    this.players[index] = clonePlayer(player);
    return clonePlayer(this.players[index]);
  }

  async archive(id: string): Promise<Player | undefined> {
    const player = this.players.find((candidate) => candidate.id === id);
    if (!player) return undefined;

    player.active = false;
    player.updatedAt = new Date().toISOString();
    return clonePlayer(player);
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.players.length;
    this.players = this.players.filter((player) => player.id !== id);
    return this.players.length < initialLength;
  }
}
