import type {Player} from '@/models/Player';

export interface PlayerRepository {
  getAll(): Promise<Player[]>;
  getById(id: string): Promise<Player | undefined>;
  create(player: Player): Promise<Player>;
  update(player: Player): Promise<Player | undefined>;
  archive(id: string): Promise<Player | undefined>;
  delete(id: string): Promise<boolean>;
}
