import {
  isSeasonRosterCategory,
  SEASON_ROSTER_CATEGORIES,
} from '@/domain/season-roster/SeasonRosterMembership';
import type {
  AddSeasonRosterMembershipInput,
  DropSeasonRosterMembershipInput,
  SeasonRosterCapacity,
  SeasonRosterCounts,
  SeasonRosterMembership,
  SeasonRosterServiceResult,
  SeasonTeam,
} from '@/domain/season-roster/SeasonRosterMembership';
import type {SeasonRosterRepository} from '@/domain/season-roster/SeasonRosterRepository';

export class SeasonRosterService {
  constructor(private readonly repository: SeasonRosterRepository) {}

  async listSeasonTeams(seasonId: string): Promise<SeasonTeam[]> {
    return this.repository.listSeasonTeams(requireId(seasonId, 'Season'));
  }

  async listMemberships(seasonId: string): Promise<SeasonRosterMembership[]> {
    return this.repository.listMemberships(requireId(seasonId, 'Season'));
  }

  async getRosterCounts(seasonId: string, teamId: string): Promise<SeasonRosterCounts> {
    const memberships = await this.repository.listMemberships(requireId(seasonId, 'Season'));
    const resolvedTeamId = requireId(teamId, 'Team');
    return countActiveMemberships(memberships, resolvedTeamId);
  }

  async getRemainingCapacity(seasonId: string, teamId: string): Promise<SeasonRosterCapacity> {
    const resolvedSeasonId = requireId(seasonId, 'Season');
    const [caps, counts] = await Promise.all([
      this.repository.getRosterCaps(resolvedSeasonId),
      this.getRosterCounts(resolvedSeasonId, teamId),
    ]);
    if (!caps) throw new Error('Season not found.');

    return Object.fromEntries(SEASON_ROSTER_CATEGORIES.map((category) => [
      category,
      caps[category] === null ? null : Math.max(0, caps[category] - counts[category]),
    ])) as SeasonRosterCapacity;
  }

  async addMembership(
    input: AddSeasonRosterMembershipInput,
  ): Promise<SeasonRosterServiceResult<SeasonRosterMembership>> {
    const message = validateAddInput(input);
    if (message) return {ok: false, message};

    // The RPC derives the actor and makes the authoritative authorization decision.
    return {ok: true, data: await this.repository.addMembership(input)};
  }

  async dropMembership(
    input: DropSeasonRosterMembershipInput,
  ): Promise<SeasonRosterServiceResult<SeasonRosterMembership>> {
    const message = validateDropInput(input);
    if (message) return {ok: false, message};

    // The RPC derives the actor and makes the authoritative authorization decision.
    return {ok: true, data: await this.repository.dropMembership(input)};
  }
}

export function countActiveMemberships(
  memberships: SeasonRosterMembership[],
  teamId: string,
): SeasonRosterCounts {
  const counts: SeasonRosterCounts = {Men: 0, Women: 0, Junior: 0};
  memberships.forEach((membership) => {
    if (membership.teamId === teamId && membership.status === 'Active') {
      counts[membership.rosterCategory] += 1;
    }
  });
  return counts;
}

function validateAddInput(input: AddSeasonRosterMembershipInput): string | undefined {
  if (!input.seasonId.trim()) return 'Choose a season.';
  if (!input.teamId.trim()) return 'Choose a team.';
  if (!input.playerId.trim()) return 'Choose a player.';
  if (!isSeasonRosterCategory(input.rosterCategory)) return 'Choose a valid roster category.';
  return undefined;
}

function validateDropInput(input: DropSeasonRosterMembershipInput): string | undefined {
  if (!input.seasonId.trim()) return 'Choose a season.';
  if (!input.playerId.trim()) return 'Choose a player.';
  return undefined;
}

function requireId(value: string, label: string): string {
  const resolved = value.trim();
  if (!resolved) throw new Error(`${label} is required.`);
  return resolved;
}
