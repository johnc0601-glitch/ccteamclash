import type {Team} from '@/models/Team';
import type {TeamRepository} from '@/repositories/TeamRepository';
import type {
  TeamFieldErrors,
  TeamInput,
  TeamQuery,
  TeamServiceResult,
  TeamSortOption,
} from '@/types/team';
import {createSlug} from '@/shared/utils';

const DEFAULT_QUERY: TeamQuery = {
  search: '',
  sort: 'alphabetical',
  status: 'all',
};

type ValidatedTeamInput = {
  input: TeamInput;
  fieldErrors: TeamFieldErrors;
};

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, {sensitivity: 'base'});
}

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export class TeamService {
  constructor(private readonly repository: TeamRepository) {}

  async getAll(query: Partial<TeamQuery> = {}): Promise<Team[]> {
    const resolvedQuery = {...DEFAULT_QUERY, ...query};
    const candidates = resolvedQuery.search
      ? await this.repository.search(resolvedQuery.search)
      : await this.repository.getAll();

    const searchedTeams = this.applySearch(candidates, resolvedQuery.search);
    const filteredTeams = searchedTeams.filter((team) => {
      if (resolvedQuery.status === 'active') return team.active;
      if (resolvedQuery.status === 'archived') return !team.active;
      return true;
    });

    return this.sortTeams(filteredTeams, resolvedQuery.sort);
  }

  async getById(id: string): Promise<Team | undefined> {
    return this.repository.getById(id);
  }

  async search(text: string, query: Omit<Partial<TeamQuery>, 'search'> = {}): Promise<Team[]> {
    return this.getAll({...query, search: text});
  }

  async create(input: TeamInput): Promise<TeamServiceResult<Team>> {
    const validated = await this.validate(input);
    if (this.hasErrors(validated.fieldErrors)) {
      return {
        ok: false,
        message: 'Review the highlighted team fields.',
        fieldErrors: validated.fieldErrors,
      };
    }

    const timestamp = new Date().toISOString();
    const team: Team = {
      ...validated.input,
      id: this.createId(validated.input.name),
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return {ok: true, data: await this.repository.create(team)};
  }

  async update(id: string, input: TeamInput): Promise<TeamServiceResult<Team>> {
    const existingTeam = await this.repository.getById(id);
    if (!existingTeam) return this.notFoundResult();

    const validated = await this.validate(input, id);
    if (this.hasErrors(validated.fieldErrors)) {
      return {
        ok: false,
        message: 'Review the highlighted team fields.',
        fieldErrors: validated.fieldErrors,
      };
    }

    const updatedTeam = await this.repository.update({
      ...existingTeam,
      ...validated.input,
      updatedAt: new Date().toISOString(),
    });

    return updatedTeam
      ? {ok: true, data: updatedTeam}
      : this.notFoundResult();
  }

  async archive(id: string): Promise<TeamServiceResult<Team>> {
    const team = await this.repository.getById(id);
    if (!team) return this.notFoundResult();
    if (!team.active) {
      return {ok: false, message: 'This team is already archived.'};
    }

    const archivedTeam = await this.repository.archive(id);
    return archivedTeam
      ? {ok: true, data: archivedTeam}
      : this.notFoundResult();
  }

  async delete(id: string): Promise<TeamServiceResult<string>> {
    const team = await this.repository.getById(id);
    if (!team) return this.notFoundResult();

    const deleted = await this.repository.delete(id);
    return deleted
      ? {ok: true, data: id}
      : this.notFoundResult();
  }

  private applySearch(teams: Team[], search: string): Team[] {
    const normalizedSearch = normalizeForComparison(search);
    if (!normalizedSearch) return [...teams];

    return teams.filter((team) => [
      team.name,
      team.captain,
      team.homeCourse,
      team.city,
    ].some((value) => normalizeForComparison(value).includes(normalizedSearch)));
  }

  private sortTeams(teams: Team[], sort: TeamSortOption): Team[] {
    return [...teams].sort((left, right) => {
      switch (sort) {
        case 'recently-updated':
          return right.updatedAt.localeCompare(left.updatedAt) || compareText(left.name, right.name);
        case 'city':
          return compareText(left.city, right.city) || compareText(left.name, right.name);
        case 'course':
          return compareText(left.homeCourse, right.homeCourse) || compareText(left.name, right.name);
        case 'status':
          return Number(right.active) - Number(left.active) || compareText(left.name, right.name);
        case 'alphabetical':
        default:
          return compareText(left.name, right.name);
      }
    });
  }

  private async validate(input: TeamInput, currentId?: string): Promise<ValidatedTeamInput> {
    const normalizedInput = this.normalizeInput(input);
    const fieldErrors: TeamFieldErrors = {};

    if (!normalizedInput.name) fieldErrors.name = 'Team name is required.';
    if (!normalizedInput.shortName) fieldErrors.shortName = 'Short name is required.';

    const teams = await this.repository.getAll();
    const otherTeams = teams.filter((team) => team.id !== currentId);

    if (normalizedInput.name && otherTeams.some((team) =>
      normalizeForComparison(team.name) === normalizeForComparison(normalizedInput.name),
    )) {
      fieldErrors.name = 'A team with this name already exists.';
    }

    if (normalizedInput.shortName && otherTeams.some((team) =>
      normalizeForComparison(team.shortName) === normalizeForComparison(normalizedInput.shortName),
    )) {
      fieldErrors.shortName = 'A team with this short name already exists.';
    }

    return {input: normalizedInput, fieldErrors};
  }

  private normalizeInput(input: TeamInput): TeamInput {
    return {
      name: input.name.trim(),
      shortName: input.shortName.trim().toLocaleUpperCase(),
      city: input.city.trim(),
      state: input.state.trim().toLocaleUpperCase(),
      captain: input.captain.trim(),
      homeCourse: input.homeCourse.trim(),
      logo: input.logo.trim(),
      primaryColor: input.primaryColor.trim(),
      secondaryColor: input.secondaryColor.trim(),
      website: input.website.trim(),
      facebook: input.facebook.trim(),
      description: input.description.trim(),
    };
  }

  private createId(name: string): string {
    const slug = createSlug(name);
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    return `${slug || 'team'}-${uniquePart}`;
  }

  private hasErrors(fieldErrors: TeamFieldErrors): boolean {
    return Object.keys(fieldErrors).length > 0;
  }

  private notFoundResult<T>(): TeamServiceResult<T> {
    return {ok: false, message: 'Team not found.'};
  }
}
