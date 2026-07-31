import type {Course} from '@/domain/course/Course';
import type {MatchInput} from '@/domain/schedule/Match';
import type {RoundInput} from '@/domain/schedule/Round';
import type {Season} from '@/domain/season/Season';
import type {Team} from '@/models/Team';

export const SCHEDULE_IMPORT_SCHEMA_VERSION = 1 as const;

export type ScheduleImportRound = RoundInput & {matches: MatchInput[]};
export type ScheduleImportData = {
  schemaVersion: typeof SCHEDULE_IMPORT_SCHEMA_VERSION;
  seasonId: string;
  name: string;
  description: string;
  rounds: ScheduleImportRound[];
};

export function validateScheduleImport(
  value: unknown,
  seasons: Season[],
  teams: Team[],
  courses: Course[],
): {data: ScheduleImportData | null; errors: string[]} {
  const errors: string[] = [];
  if (!isObject(value)) return {data: null, errors: ['The JSON root must be an object.']};

  const schemaVersion = value.schemaVersion;
  if (schemaVersion !== SCHEDULE_IMPORT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEDULE_IMPORT_SCHEMA_VERSION}.`);
  }
  const seasonId = readString(value.seasonId);
  const name = readString(value.name);
  const description = readString(value.description);
  const rawRounds = Array.isArray(value.rounds) ? value.rounds : [];
  const season = seasons.find((candidate) => candidate.id === seasonId);
  if (!seasonId || !season) errors.push('seasonId must identify an existing season.');
  else if (!season.active || season.archived) errors.push('The imported schedule must use the active season.');
  if (!name) errors.push('Schedule name is required.');
  if (!rawRounds.length) errors.push('At least one round is required.');

  const activeTeamList = teams.filter((team) => team.active);
  const activeTeams = new Set(activeTeamList.map((team) => team.id));
  const teamNames = new Map(activeTeamList.map((team) => [team.id, team.name]));
  const activeCourseList = courses.filter((course) => course.active);
  const activeCourses = new Set(activeCourseList.map((course) => course.id));
  const roundNumbers = new Set<number>();
  const roundNames = new Set<string>();
  const matchups = new Set<string>();
  const rounds: ScheduleImportRound[] = [];

  rawRounds.forEach((rawRound, roundIndex) => {
    const label = `Round ${roundIndex + 1}`;
    if (!isObject(rawRound)) {
      errors.push(`${label} must be an object.`);
      return;
    }
    const number = Number(rawRound.number);
    const roundName = readString(rawRound.name);
    const date = readNullableString(rawRound.date);
    const rawMatches = Array.isArray(rawRound.matches) ? rawRound.matches : [];
    if (!Number.isInteger(number) || number <= 0) errors.push(`${label} number must be a positive whole number.`);
    if (roundNumbers.has(number)) errors.push(`${label} number is duplicated.`);
    roundNumbers.add(number);
    if (!roundName) errors.push(`${label} name is required.`);
    const normalizedRoundName = roundName.toLocaleLowerCase();
    if (roundNames.has(normalizedRoundName)) errors.push(`${label} name is duplicated.`);
    roundNames.add(normalizedRoundName);
    if (date && !isValidDate(date)) errors.push(`${label} date must be a valid YYYY-MM-DD date.`);
    else if (date && season && (date < season.startDate || date > season.endDate)) errors.push(`${label} date is outside the season.`);
    if (!rawMatches.length) errors.push(`${label} requires at least one match.`);

    const usedTeams = new Set<string>();
    const matches: MatchInput[] = [];
    rawMatches.forEach((rawMatch, matchIndex) => {
      const matchLabel = `${label}, match ${matchIndex + 1}`;
      if (!isObject(rawMatch)) {
        errors.push(`${matchLabel} must be an object.`);
        return;
      }
      const homeTeamId = readString(rawMatch.homeTeamId);
      const awayTeamId = readString(rawMatch.awayTeamId);
      const courseId = readNullableString(rawMatch.courseId);
      const time = readNullableString(rawMatch.time);
      if (!activeTeams.has(homeTeamId)) errors.push(`Team "${homeTeamId || '(blank)'}" not found.`);
      if (!activeTeams.has(awayTeamId)) errors.push(`Team "${awayTeamId || '(blank)'}" not found.`);
      if (homeTeamId === awayTeamId) errors.push(`${matchLabel} teams must be different.`);
      if (usedTeams.has(homeTeamId) || usedTeams.has(awayTeamId)) {
        const repeatedTeamId = usedTeams.has(homeTeamId) ? homeTeamId : awayTeamId;
        errors.push(`Team "${teamNames.get(repeatedTeamId) ?? repeatedTeamId}" appears more than once in ${roundName || label}.`);
      }
      usedTeams.add(homeTeamId);
      usedTeams.add(awayTeamId);
      const matchup = [homeTeamId, awayTeamId].sort().join(':');
      if (matchups.has(matchup)) {
        errors.push(`Duplicate matchup: ${teamNames.get(homeTeamId) ?? homeTeamId} vs ${teamNames.get(awayTeamId) ?? awayTeamId}.`);
      }
      matchups.add(matchup);
      if (courseId && !activeCourses.has(courseId)) errors.push(`Course "${courseId}" not found.`);
      if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.push(`${matchLabel} has invalid time "${time}"; use HH:MM.`);
      matches.push({
        homeTeamId,
        awayTeamId,
        courseId,
        date,
        time,
        status: 'Scheduled',
        notes: readString(rawMatch.notes),
      });
    });
    rounds.push({number, name: roundName, date, matches});
  });

  return {
    data: errors.length ? null : {
      schemaVersion: SCHEDULE_IMPORT_SCHEMA_VERSION,
      seasonId,
      name,
      description,
      rounds,
    },
    errors: [...new Set(errors)],
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNullableString(value: unknown): string | null {
  const text = readString(value);
  return text || null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
