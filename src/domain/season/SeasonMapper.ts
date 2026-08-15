import type {Season, SeasonInput} from '@/domain/season/Season';

export class SeasonMapper {
  normalizeInput(input: SeasonInput): SeasonInput {
    return {
      name: input.name.trim(),
      year: input.year,
      description: input.description.trim(),
      startDate: input.startDate.trim(),
      endDate: input.endDate.trim(),
      registrationOpen: input.registrationOpen,
      mensRosterCap: input.mensRosterCap,
      womensRosterCap: input.womensRosterCap,
      juniorRosterCap: input.juniorRosterCap,
      published: input.published,
    };
  }

  toInput(season: Season): SeasonInput {
    return {
      name: season.name,
      year: season.year,
      description: season.description,
      startDate: season.startDate,
      endDate: season.endDate,
      registrationOpen: season.registrationOpen,
      mensRosterCap: season.mensRosterCap,
      womensRosterCap: season.womensRosterCap,
      juniorRosterCap: season.juniorRosterCap,
      published: season.published,
    };
  }

  toNewSeason(input: SeasonInput, id: string, leagueId: string, timestamp: string): Season {
    return {
      ...input,
      id,
      leagueId,
      active: false,
      archived: false,
      rosterRulesLockAt: null,
      rosterRulesLockedAt: null,
      rosterRulesLocked: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  toUpdatedSeason(season: Season, input: SeasonInput, timestamp: string): Season {
    return {
      ...season,
      ...input,
      updatedAt: timestamp,
    };
  }
}
