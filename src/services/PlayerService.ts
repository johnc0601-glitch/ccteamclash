import type {Player} from '@/models/Player';
import type {PlayerRepository} from '@/repositories/PlayerRepository';
import {createSlug} from '@/shared/utils/slug';
import type {TeamService} from '@/services/TeamService';
import type {
  PlayerFieldErrors,
  PlayerInput,
  PlayerQuery,
  PlayerServiceResult,
} from '@/types/player';

const DEFAULT_QUERY: PlayerQuery = {
  search: '',
  teamId: 'all',
  status: 'all',
  sort: 'alphabetical',
};

type PlayerTeamProvider = Pick<TeamService, 'getById'>;

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export class PlayerService {
  private readonly repository: PlayerRepository;
  private readonly teams: PlayerTeamProvider;

  constructor(repository: PlayerRepository, teams: PlayerTeamProvider) {
    this.repository = repository;
    this.teams = teams;
  }

  async getAll(query: Partial<PlayerQuery> = {}): Promise<Player[]> {
    const resolvedQuery = {...DEFAULT_QUERY, ...query};
    const normalizedSearch = normalizeForComparison(resolvedQuery.search);
    const players = await this.repository.getAll();

    return players
      .filter((player) => {
        if (resolvedQuery.status === 'active' && !player.active) return false;
        if (resolvedQuery.status === 'archived' && player.active) return false;
        if (resolvedQuery.teamId !== 'all' && player.teamId !== resolvedQuery.teamId) return false;
        return !normalizedSearch || [
          player.name,
          player.pdgaNumber,
          player.teamId,
          player.gender,
          player.pdgaRating?.toString() ?? '',
        ]
          .some((value) => normalizeForComparison(value).includes(normalizedSearch));
      })
      .sort((left, right) => this.sortPlayers(left, right, resolvedQuery.sort));
  }

  async getById(id: string): Promise<Player | undefined> {
    return this.repository.getById(id);
  }

  async create(input: PlayerInput): Promise<PlayerServiceResult<Player>> {
    const validated = await this.validate(input);
    if (this.hasErrors(validated.fieldErrors)) return this.validationResult(validated.fieldErrors);

    const timestamp = new Date().toISOString();
    const player: Player = {
      ...validated.input,
      id: this.createId(validated.input.name),
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return {ok: true, data: await this.repository.create(player)};
  }

  async update(id: string, input: PlayerInput): Promise<PlayerServiceResult<Player>> {
    const existing = await this.repository.getById(id);
    if (!existing) return this.notFoundResult();

    const validated = await this.validate(input, id);
    if (this.hasErrors(validated.fieldErrors)) return this.validationResult(validated.fieldErrors);

    const updated = await this.repository.update({
      ...existing,
      ...validated.input,
      updatedAt: new Date().toISOString(),
    });
    return updated ? {ok: true, data: updated} : this.notFoundResult();
  }

  async archive(id: string): Promise<PlayerServiceResult<Player>> {
    const existing = await this.repository.getById(id);
    if (!existing) return this.notFoundResult();
    if (!existing.active) return {ok: false, message: 'This player is already archived.'};

    const archived = await this.repository.archive(id);
    return archived ? {ok: true, data: archived} : this.notFoundResult();
  }

  async delete(id: string): Promise<PlayerServiceResult<string>> {
    const existing = await this.repository.getById(id);
    if (!existing) return this.notFoundResult();
    return await this.repository.delete(id)
      ? {ok: true, data: id}
      : this.notFoundResult();
  }

  private async validate(input: PlayerInput, currentId?: string): Promise<{
    input: PlayerInput;
    fieldErrors: PlayerFieldErrors;
  }> {
    const normalizedInput: PlayerInput = {
      name: input.name.trim(),
      teamId: input.teamId.trim(),
      pdgaNumber: input.pdgaNumber.trim(),
      pdgaRating: input.pdgaRating,
      gender: input.gender,
    };
    const fieldErrors: PlayerFieldErrors = {};

    if (!normalizedInput.name) fieldErrors.name = 'Player name is required.';
    if (!['Male', 'Female', 'Unknown'].includes(normalizedInput.gender)) {
      fieldErrors.gender = 'Select male, female, or unknown.';
    }
    if (normalizedInput.teamId && !await this.teams.getById(normalizedInput.teamId)) {
      fieldErrors.teamId = 'Select a valid team.';
    }

    if (normalizedInput.pdgaNumber && !/^\d+$/.test(normalizedInput.pdgaNumber)) {
      fieldErrors.pdgaNumber = 'PDGA number must contain digits only.';
    }

    if (normalizedInput.pdgaRating !== null
      && (!Number.isInteger(normalizedInput.pdgaRating) || normalizedInput.pdgaRating <= 0)) {
      fieldErrors.pdgaRating = 'PDGA rating must be a positive whole number.';
    }

    const players = await this.repository.getAll();
    const duplicateName = players.some((player) =>
      player.id !== currentId
      && normalizeForComparison(player.name) === normalizeForComparison(normalizedInput.name),
    );
    if (duplicateName) fieldErrors.name = 'This player name already exists.';

    if (normalizedInput.pdgaNumber) {
      const duplicate = players.some((player) =>
        player.id !== currentId && player.pdgaNumber === normalizedInput.pdgaNumber,
      );
      if (duplicate) fieldErrors.pdgaNumber = 'This PDGA number is already assigned.';
    }

    return {input: normalizedInput, fieldErrors};
  }

  private createId(name: string): string {
    const slug = createSlug(name);
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    return `${slug || 'player'}-${uniquePart}`;
  }

  private sortPlayers(left: Player, right: Player, sort: PlayerQuery['sort']): number {
    const byName = left.name.localeCompare(right.name, undefined, {sensitivity: 'base'});

    if (sort === 'recently-updated') {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() || byName;
    }

    if (sort === 'team') {
      return left.teamId.localeCompare(right.teamId, undefined, {sensitivity: 'base'}) || byName;
    }

    if (sort === 'rating') {
      return (right.pdgaRating ?? 0) - (left.pdgaRating ?? 0) || byName;
    }

    if (sort === 'status') {
      return Number(right.active) - Number(left.active) || byName;
    }

    return byName;
  }

  private hasErrors(fieldErrors: PlayerFieldErrors): boolean {
    return Object.keys(fieldErrors).length > 0;
  }

  private validationResult<T>(fieldErrors: PlayerFieldErrors): PlayerServiceResult<T> {
    return {ok: false, message: 'Review the highlighted player fields.', fieldErrors};
  }

  private notFoundResult<T>(): PlayerServiceResult<T> {
    return {ok: false, message: 'Player not found.'};
  }
}
