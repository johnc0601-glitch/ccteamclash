import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import type {Season} from '@/domain/season/Season';
import {
  SEASON_ROSTER_CATEGORIES,
  type SeasonRosterCapacity,
  type SeasonRosterCategory,
  type SeasonRosterCounts,
  type SeasonRosterMembership,
  type SeasonTeam,
} from '@/domain/season-roster/SeasonRosterMembership';
import {countActiveMemberships} from '@/domain/season-roster/SeasonRosterService';

export type SeasonRosterViewer =
  | {role: 'Commissioner'; teamId: null}
  | {role: 'Captain'; teamId: string};

export type SeasonRosterMemberView = SeasonRosterMembership & {
  playerName: string;
  playerGender: LaunchPlayer['gender'];
};

export type SeasonRosterTeamView = {
  seasonTeam: SeasonTeam;
  teamName: string;
  activeMembers: SeasonRosterMemberView[];
  droppedMembers: SeasonRosterMemberView[];
  candidates: Array<Pick<LaunchPlayer, 'id' | 'name' | 'gender'>>;
  counts: SeasonRosterCounts;
  capacity: SeasonRosterCapacity;
  countLabels: Record<SeasonRosterCategory, string>;
  canAdd: boolean;
  addUnavailableMessage?: string;
};

export function buildSeasonRosterTeamViews(input: {
  season: Season;
  seasonTeams: SeasonTeam[];
  memberships: SeasonRosterMembership[];
  teams: LaunchTeam[];
  players: LaunchPlayer[];
  viewer: SeasonRosterViewer;
}): SeasonRosterTeamView[] {
  const membershipsByPlayer = new Set(input.memberships.map((membership) => membership.playerId));
  const playersById = new Map(input.players.map((player) => [player.id, player]));
  const teamsById = new Map(input.teams.map((team) => [team.id, team]));
  const visibleTeams = input.viewer.role === 'Commissioner'
    ? input.seasonTeams
    : input.seasonTeams.filter((seasonTeam) => seasonTeam.teamId === input.viewer.teamId);

  return visibleTeams.map((seasonTeam) => {
    const teamMemberships = input.memberships.filter((membership) => membership.teamId === seasonTeam.teamId);
    const activeMembers = teamMemberships.filter((membership) => membership.status === 'Active');
    const counts = countActiveMemberships(input.memberships, seasonTeam.teamId);
    const capacity = capacityForSeason(input.season, counts);
    const canAdd = input.viewer.role === 'Commissioner' || !input.season.rosterRulesLocked;

    return {
      seasonTeam,
      teamName: teamsById.get(seasonTeam.teamId)?.name ?? 'Team unavailable',
      activeMembers: activeMembers.map((membership) => memberView(membership, playersById)),
      droppedMembers: teamMemberships
        .filter((membership) => membership.status === 'Dropped')
        .map((membership) => memberView(membership, playersById)),
      candidates: input.players
        .filter((player) => player.active && !membershipsByPlayer.has(player.id))
        .map(({id, name, gender}) => ({id, name, gender})),
      counts,
      capacity,
      countLabels: Object.fromEntries(SEASON_ROSTER_CATEGORIES.map((category) => [
        category,
        formatRosterCount(counts[category], capForCategory(input.season, category)),
      ])) as Record<SeasonRosterCategory, string>,
      canAdd,
      addUnavailableMessage: canAdd
        ? undefined
        : 'Season roster additions now require Commissioner approval.',
    };
  });
}

export function formatRosterCount(count: number, cap: number | null): string {
  return cap === null ? `${count} / Unlimited` : `${count} / ${cap}`;
}

function capacityForSeason(season: Season, counts: SeasonRosterCounts): SeasonRosterCapacity {
  return Object.fromEntries(SEASON_ROSTER_CATEGORIES.map((category) => {
    const cap = capForCategory(season, category);
    return [category, cap === null ? null : Math.max(0, cap - counts[category])];
  })) as SeasonRosterCapacity;
}

function capForCategory(season: Season, category: SeasonRosterCategory): number | null {
  if (category === 'Men') return season.mensRosterCap;
  if (category === 'Women') return season.womensRosterCap;
  return season.juniorRosterCap;
}

function memberView(
  membership: SeasonRosterMembership,
  playersById: Map<string, LaunchPlayer>,
): SeasonRosterMemberView {
  const player = playersById.get(membership.playerId);
  return {
    ...membership,
    playerName: player?.name ?? 'Player unavailable',
    playerGender: player?.gender ?? 'Unknown',
  };
}
