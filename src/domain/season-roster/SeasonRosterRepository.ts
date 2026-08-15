import type {
  AddSeasonRosterMembershipInput,
  DropSeasonRosterMembershipInput,
  SeasonRosterCaps,
  SeasonRosterMembership,
  SeasonTeam,
} from '@/domain/season-roster/SeasonRosterMembership';

export interface SeasonRosterRepository {
  listSeasonTeams(seasonId: string): Promise<SeasonTeam[]>;
  listMemberships(seasonId: string): Promise<SeasonRosterMembership[]>;
  getRosterCaps(seasonId: string): Promise<SeasonRosterCaps | undefined>;
  addMembership(input: AddSeasonRosterMembershipInput): Promise<SeasonRosterMembership>;
  dropMembership(input: DropSeasonRosterMembershipInput): Promise<SeasonRosterMembership>;
}
