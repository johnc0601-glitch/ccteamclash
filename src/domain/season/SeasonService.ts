import {createSlug} from '@/shared/utils';
import {SeasonMapper} from '@/domain/season/SeasonMapper';
import type {SeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonValidator} from '@/domain/season/SeasonValidator';
import type {
  Season,
  SeasonFieldErrors,
  SeasonInput,
  SeasonQuery,
  SeasonServiceResult,
} from '@/domain/season/Season';

const DEFAULT_QUERY: SeasonQuery = {
  search: '',
  status: 'all',
};

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, {sensitivity: 'base'});
}

export class SeasonService {
  private readonly mapper = new SeasonMapper();
  private readonly validator = new SeasonValidator();

  constructor(private readonly repository: SeasonRepository) {}

  async getAll(query: Partial<SeasonQuery> = {}): Promise<Season[]> {
    const resolvedQuery = {...DEFAULT_QUERY, ...query};
    const normalizedSearch = normalizeForComparison(resolvedQuery.search);
    const seasons = await this.repository.getAll();

    return seasons
      .filter((season) => this.matchesSearch(season, normalizedSearch))
      .filter((season) => this.matchesStatus(season, resolvedQuery.status))
      .sort((left, right) =>
        right.year - left.year
        || right.startDate.localeCompare(left.startDate)
        || compareText(left.name, right.name),
      );
  }

  async getById(id: string): Promise<Season | undefined> {
    return this.repository.getById(id);
  }

  async getActive(): Promise<Season | undefined> {
    return this.repository.getActive();
  }

  async create(input: SeasonInput): Promise<SeasonServiceResult<Season>> {
    const normalizedInput = this.mapper.normalizeInput(input);
    const seasons = await this.repository.getAll();
    const fieldErrors = this.validator.validate(normalizedInput, seasons);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const timestamp = new Date().toISOString();
    const season = this.mapper.toNewSeason(
      normalizedInput,
      this.createId(normalizedInput.name),
      timestamp,
    );

    return {ok: true, data: await this.repository.create(season)};
  }

  async update(id: string, input: SeasonInput): Promise<SeasonServiceResult<Season>> {
    const existingSeason = await this.repository.getById(id);
    if (!existingSeason) return this.notFoundResult();
    if (existingSeason.archived) {
      return {ok: false, message: 'Archived seasons cannot be edited.'};
    }

    const normalizedInput = this.mapper.normalizeInput(input);
    const seasons = await this.repository.getAll();
    const fieldErrors = this.validator.validate(normalizedInput, seasons, id);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const updatedSeason = this.mapper.toUpdatedSeason(
      existingSeason,
      normalizedInput,
      new Date().toISOString(),
    );
    const activeSeasonError = this.validator.validateActiveSeason(updatedSeason, seasons);
    if (activeSeasonError) return {ok: false, message: activeSeasonError};

    const storedSeason = await this.repository.update(updatedSeason);
    return storedSeason ? {ok: true, data: storedSeason} : this.notFoundResult();
  }

  async archive(id: string): Promise<SeasonServiceResult<Season>> {
    const season = await this.repository.getById(id);
    if (!season) return this.notFoundResult();
    if (season.archived) {
      return {ok: false, message: 'This season is already archived.'};
    }

    const archivedSeason = await this.repository.archive(id);
    return archivedSeason ? {ok: true, data: archivedSeason} : this.notFoundResult();
  }

  async activate(id: string): Promise<SeasonServiceResult<Season>> {
    const season = await this.repository.getById(id);
    if (!season) return this.notFoundResult();
    if (season.archived) {
      return {ok: false, message: 'Archived seasons cannot be activated.'};
    }
    if (season.active) {
      return {ok: false, message: 'This season is already active.'};
    }

    const seasons = await this.repository.getAll();
    const projectedSeasons = seasons.map((candidate) => ({
      ...candidate,
      active: candidate.id === id,
    }));
    const projectedSeason = projectedSeasons.find((candidate) => candidate.id === id);
    if (!projectedSeason) return this.notFoundResult();

    const activeSeasonError = this.validator.validateActiveSeason(projectedSeason, projectedSeasons);
    if (activeSeasonError) return {ok: false, message: activeSeasonError};

    const activatedSeason = await this.repository.activate(id);
    return activatedSeason ? {ok: true, data: activatedSeason} : this.notFoundResult();
  }

  async duplicate(id: string): Promise<SeasonServiceResult<Season>> {
    const source = await this.repository.getById(id);
    if (!source) return this.notFoundResult();

    const seasons = await this.repository.getAll();
    const duplicateInput = this.mapper.normalizeInput({
      ...this.mapper.toInput(source),
      name: this.createDuplicateName(source.name, seasons),
      registrationOpen: false,
      published: false,
    });
    const fieldErrors = this.validator.validate(duplicateInput, seasons);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const timestamp = new Date().toISOString();
    const duplicateSeason = this.mapper.toNewSeason(
      duplicateInput,
      this.createId(duplicateInput.name),
      timestamp,
    );

    return {ok: true, data: await this.repository.duplicate(duplicateSeason)};
  }

  async delete(id: string): Promise<SeasonServiceResult<string>> {
    const season = await this.repository.getById(id);
    if (!season) return this.notFoundResult();

    const deleted = await this.repository.delete(id);
    return deleted ? {ok: true, data: id} : this.notFoundResult();
  }

  private matchesSearch(season: Season, search: string): boolean {
    if (!search) return true;
    return [season.name, String(season.year), season.description]
      .some((value) => normalizeForComparison(value).includes(search));
  }

  private matchesStatus(season: Season, status: SeasonQuery['status']): boolean {
    switch (status) {
      case 'active':
        return season.active && !season.archived;
      case 'published':
        return season.published && !season.active && !season.archived;
      case 'draft':
        return !season.published && !season.active && !season.archived;
      case 'archived':
        return season.archived;
      case 'all':
      default:
        return true;
    }
  }

  private createDuplicateName(sourceName: string, seasons: Season[]): string {
    const names = new Set(seasons.map((season) => normalizeForComparison(season.name)));
    let copyNumber = 1;
    let candidate = `${sourceName} Copy`;

    while (names.has(normalizeForComparison(candidate))) {
      copyNumber += 1;
      candidate = `${sourceName} Copy ${copyNumber}`;
    }

    return candidate;
  }

  private createId(name: string): string {
    const slug = createSlug(name);
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    return `${slug || 'season'}-${uniquePart}`;
  }

  private hasErrors(fieldErrors: SeasonFieldErrors): boolean {
    return Object.keys(fieldErrors).length > 0;
  }

  private validationResult<T>(fieldErrors: SeasonFieldErrors): SeasonServiceResult<T> {
    return {
      ok: false,
      message: 'Review the highlighted season fields.',
      fieldErrors,
    };
  }

  private notFoundResult<T>(): SeasonServiceResult<T> {
    return {ok: false, message: 'Season not found.'};
  }
}
