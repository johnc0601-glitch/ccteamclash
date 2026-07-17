import type {Course} from '@/domain/course/Course';
import type {Season} from '@/domain/season/Season';
import {MATCH_STATUSES, type Match, type MatchInput} from '@/domain/schedule/Match';
import type {Round, RoundInput} from '@/domain/schedule/Round';
import type {Schedule, ScheduleFieldErrors, ScheduleInput} from '@/domain/schedule/Schedule';
import type {Team} from '@/models/Team';

export type ScheduleRules = {
  allowRepeatedMatchups: boolean;
  homeAwayMatters: boolean;
  allowMultipleTeamAppearancesPerRound: boolean;
};

export const DEFAULT_SCHEDULE_RULES: ScheduleRules = {
  allowRepeatedMatchups: false,
  homeAwayMatters: false,
  allowMultipleTeamAppearancesPerRound: false,
};

type MatchValidationContext = {
  season: Season;
  round: Round;
  teams: Team[];
  courses: Course[];
  scheduleMatches: Match[];
  roundMatches: Match[];
  currentId?: string;
};

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isWithinSeason(date: string, season: Season): boolean {
  return isValidDate(date)
    && isValidDate(season.startDate)
    && isValidDate(season.endDate)
    && date >= season.startDate
    && date <= season.endDate;
}

export class ScheduleValidator {
  private readonly rules: ScheduleRules;

  constructor(rules: Partial<ScheduleRules> = {}) {
    this.rules = {...DEFAULT_SCHEDULE_RULES, ...rules};
  }

  validateSchedule(input: ScheduleInput): ScheduleFieldErrors {
    const fieldErrors: ScheduleFieldErrors = {};
    if (!input.seasonId) fieldErrors.seasonId = 'Season is required.';
    if (!input.name) fieldErrors.name = 'Schedule name is required.';
    return fieldErrors;
  }

  validateRound(
    input: RoundInput,
    rounds: Round[],
    season: Season,
    currentId?: string,
  ): ScheduleFieldErrors {
    const fieldErrors: ScheduleFieldErrors = {};
    const otherRounds = rounds.filter((round) => round.id !== currentId);

    if (!Number.isInteger(input.number) || input.number <= 0) {
      fieldErrors.number = 'Round number must be a positive whole number.';
    }
    if (!input.name) fieldErrors.name = 'Round name is required.';

    if (otherRounds.some((round) => round.number === input.number)) {
      fieldErrors.number = 'Round numbers must be unique within a schedule.';
    }
    if (input.name && otherRounds.some((round) =>
      normalizeForComparison(round.name) === normalizeForComparison(input.name),
    )) {
      fieldErrors.name = 'Round names must be unique within a schedule.';
    }

    if (!isValidDate(input.date)) {
      fieldErrors.date = 'Enter a valid round date.';
    } else if (!isWithinSeason(input.date, season)) {
      fieldErrors.date = 'Round date must fall within the season date range.';
    }

    return fieldErrors;
  }

  validateMatch(input: MatchInput, context: MatchValidationContext): ScheduleFieldErrors {
    const fieldErrors: ScheduleFieldErrors = {};
    const otherScheduleMatches = context.scheduleMatches
      .filter((match) => match.id !== context.currentId);
    const otherRoundMatches = context.roundMatches
      .filter((match) => match.id !== context.currentId);

    if (!input.homeTeamId) fieldErrors.homeTeamId = 'Home team is required.';
    if (!input.awayTeamId) fieldErrors.awayTeamId = 'Away team is required.';
    if (input.homeTeamId && !context.teams.some((team) => team.id === input.homeTeamId)) {
      fieldErrors.homeTeamId = 'Select a valid home team.';
    }
    if (input.awayTeamId && !context.teams.some((team) => team.id === input.awayTeamId)) {
      fieldErrors.awayTeamId = 'Select a valid away team.';
    }
    if (input.homeTeamId && input.homeTeamId === input.awayTeamId) {
      fieldErrors.awayTeamId = 'Home and away teams must be different.';
    }

    const course = context.courses.find((candidate) => candidate.id === input.courseId);
    if (!input.courseId) {
      fieldErrors.courseId = 'Course is required.';
    } else if (!course || !course.active) {
      fieldErrors.courseId = 'Select an active course.';
    }

    if (!isValidDate(input.date)) {
      fieldErrors.date = 'Enter a valid match date.';
    } else if (!isWithinSeason(input.date, context.season)) {
      fieldErrors.date = 'Match date must fall within the season date range.';
    } else if (input.date !== context.round.date) {
      fieldErrors.date = 'Match date must equal the parent round date.';
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) {
      fieldErrors.time = 'Enter a valid match time.';
    }
    if (!MATCH_STATUSES.includes(input.status)) {
      fieldErrors.status = 'Select a valid match status.';
    }

    if (!this.rules.allowRepeatedMatchups && input.homeTeamId && input.awayTeamId) {
      const matchupKey = this.getMatchupKey(input.homeTeamId, input.awayTeamId);
      if (otherScheduleMatches.some((match) =>
        this.getMatchupKey(match.homeTeamId, match.awayTeamId) === matchupKey,
      )) {
        fieldErrors.awayTeamId = 'This matchup already exists in the schedule.';
      }
    }

    if (!this.rules.allowMultipleTeamAppearancesPerRound
      && input.homeTeamId && input.awayTeamId) {
      const selectedTeams = new Set([input.homeTeamId, input.awayTeamId]);
      if (otherRoundMatches.some((match) =>
        selectedTeams.has(match.homeTeamId) || selectedTeams.has(match.awayTeamId),
      )) {
        fieldErrors.awayTeamId = 'A team may only appear once in a round.';
      }
    }

    return fieldErrors;
  }

  validatePublication(
    schedule: Schedule,
    season: Season,
    rounds: Round[],
    matches: Match[],
    teams: Team[],
    courses: Course[],
  ): string[] {
    const errors: string[] = [];
    const scheduleErrors = this.validateSchedule({
      seasonId: schedule.seasonId,
      name: schedule.name,
      description: schedule.description,
    });
    errors.push(...Object.values(scheduleErrors).filter(
      (message): message is string => Boolean(message),
    ));

    if (!rounds.length) errors.push('A published schedule requires at least one round.');

    for (const round of rounds) {
      errors.push(...Object.values(
        this.validateRound(round, rounds, season, round.id),
      ).filter((message): message is string => Boolean(message)));

      const roundMatches = matches.filter((match) => match.roundId === round.id);
      if (!roundMatches.length) {
        errors.push(`${round.name} requires at least one match.`);
        continue;
      }

      for (const match of roundMatches) {
        errors.push(...Object.values(this.validateMatch(match, {
          season,
          round,
          teams,
          courses,
          scheduleMatches: matches,
          roundMatches,
          currentId: match.id,
        })).filter((message): message is string => Boolean(message)));
      }
    }

    return [...new Set(errors)];
  }

  private getMatchupKey(homeTeamId: string, awayTeamId: string): string {
    return this.rules.homeAwayMatters
      ? `${homeTeamId}:${awayTeamId}`
      : [homeTeamId, awayTeamId].sort().join(':');
  }
}
