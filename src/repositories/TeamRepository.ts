import type {Team} from '@/models/Team';

export interface TeamRepository {
  getAll(): Promise<Team[]>;
  getById(id: string): Promise<Team | undefined>;
  search(text: string): Promise<Team[]>;
  create(team: Team): Promise<Team>;
  update(team: Team): Promise<Team | undefined>;
  archive(id: string): Promise<Team | undefined>;
  delete(id: string): Promise<boolean>;
  getAliases?(): Promise<TeamAlias[]>;
  saveAlias?(alias: TeamAlias): Promise<TeamAlias>;
}

export type TeamAlias = {alias: string; teamId: string};
