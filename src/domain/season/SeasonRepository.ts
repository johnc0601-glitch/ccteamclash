import type {Season} from '@/domain/season/Season';

export interface SeasonRepository {
  getAll(): Promise<Season[]>;
  getById(id: string): Promise<Season | undefined>;
  getActive(): Promise<Season | undefined>;
  create(season: Season): Promise<Season>;
  update(season: Season): Promise<Season | undefined>;
  archive(id: string): Promise<Season | undefined>;
  activate(id: string): Promise<Season | undefined>;
  duplicate(season: Season): Promise<Season>;
  delete(id: string): Promise<boolean>;
}
