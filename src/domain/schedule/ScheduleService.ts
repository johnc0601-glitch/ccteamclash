import type {Course} from '@/domain/course/Course';
import type {CourseRepository} from '@/domain/course/CourseRepository';
import type {Season} from '@/domain/season/Season';
import type {SeasonService} from '@/domain/season/SeasonService';
import type {Match, MatchInput} from '@/domain/schedule/Match';
import type {Round, RoundInput} from '@/domain/schedule/Round';
import type {
  Schedule,
  ScheduleFieldErrors,
  ScheduleInput,
  ScheduleQuery,
  ScheduleServiceResult,
} from '@/domain/schedule/Schedule';
import {ScheduleMapper} from '@/domain/schedule/ScheduleMapper';
import type {ScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import {ScheduleValidator, type ScheduleRules} from '@/domain/schedule/ScheduleValidator';
import type {Team} from '@/models/Team';
import {createSlug} from '@/shared/utils';
import type {TeamService} from '@/services/TeamService';

const DEFAULT_QUERY: ScheduleQuery = {
  search: '',
  seasonId: 'all',
  publication: 'all',
};

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, {sensitivity: 'base'});
}

export class ScheduleService {
  private readonly mapper = new ScheduleMapper();
  private readonly validator: ScheduleValidator;

  constructor(
    private readonly repository: ScheduleRepository,
    private readonly seasonService: SeasonService,
    private readonly teamService: TeamService,
    private readonly courseRepository: CourseRepository,
    rules: Partial<ScheduleRules> = {},
  ) {
    this.validator = new ScheduleValidator(rules);
  }

  async getSchedules(query: Partial<ScheduleQuery> = {}): Promise<Schedule[]> {
    const resolvedQuery = {...DEFAULT_QUERY, ...query};
    const normalizedSearch = normalizeForComparison(resolvedQuery.search);
    const schedules = await this.repository.getSchedules();

    const filtered = schedules.filter((schedule) => {
      if (resolvedQuery.seasonId !== 'all' && schedule.seasonId !== resolvedQuery.seasonId) {
        return false;
      }
      if (resolvedQuery.publication === 'published' && !schedule.published) return false;
      if (resolvedQuery.publication === 'draft' && schedule.published) return false;
      return true;
    });

    if (!normalizedSearch) {
      return filtered.sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) || compareText(left.name, right.name),
      );
    }

    const [teams, courses] = await Promise.all([
      this.teamService.getAll(),
      this.courseRepository.getAll(),
    ]);
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const courseNames = new Map(courses.map((course) => [course.id, course.name]));
    const matchesSearch = await Promise.all(filtered.map(async (schedule) => {
      const rounds = await this.repository.getRounds(schedule.id);
      const matches = await this.getMatchesForRounds(rounds);
      const values = [
        schedule.name,
        schedule.description,
        ...rounds.flatMap((round) => [round.name, String(round.number)]),
        ...matches.flatMap((match) => [
          teamNames.get(match.homeTeamId) ?? match.homeTeamId,
          teamNames.get(match.awayTeamId) ?? match.awayTeamId,
          courseNames.get(match.courseId) ?? match.courseId,
          match.status,
        ]),
      ];
      return values.some((value) => normalizeForComparison(value).includes(normalizedSearch));
    }));

    return filtered
      .filter((_, index) => matchesSearch[index])
      .sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) || compareText(left.name, right.name),
      );
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    return this.repository.getSchedule(id);
  }

  async getRounds(scheduleId: string, search = ''): Promise<Round[]> {
    const normalizedSearch = normalizeForComparison(search);
    const rounds = await this.repository.getRounds(scheduleId);
    if (!normalizedSearch) return rounds.sort((left, right) => left.number - right.number);

    const [teams, courses] = await Promise.all([
      this.teamService.getAll(),
      this.courseRepository.getAll(),
    ]);
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const courseNames = new Map(courses.map((course) => [course.id, course.name]));
    const matchesSearch = await Promise.all(rounds.map(async (round) => {
      const matches = await this.repository.getMatches(round.id);
      return [
        round.name,
        String(round.number),
        ...matches.flatMap((match) => [
          teamNames.get(match.homeTeamId) ?? match.homeTeamId,
          teamNames.get(match.awayTeamId) ?? match.awayTeamId,
          courseNames.get(match.courseId) ?? match.courseId,
        ]),
      ].some((value) => normalizeForComparison(value).includes(normalizedSearch));
    }));

    return rounds
      .filter((_, index) => matchesSearch[index])
      .sort((left, right) => left.number - right.number);
  }

  async getRound(id: string): Promise<Round | undefined> {
    return this.repository.getRound(id);
  }

  async getMatches(roundId: string, search = ''): Promise<Match[]> {
    const normalizedSearch = normalizeForComparison(search);
    const matches = await this.repository.getMatches(roundId);
    if (!normalizedSearch) return this.sortMatches(matches);

    const [teams, courses] = await Promise.all([
      this.teamService.getAll(),
      this.courseRepository.getAll(),
    ]);
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const courseNames = new Map(courses.map((course) => [course.id, course.name]));

    return this.sortMatches(matches.filter((match) => [
      teamNames.get(match.homeTeamId) ?? match.homeTeamId,
      teamNames.get(match.awayTeamId) ?? match.awayTeamId,
      courseNames.get(match.courseId) ?? match.courseId,
      match.status,
      match.notes,
    ].some((value) => normalizeForComparison(value).includes(normalizedSearch))));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    return this.repository.getMatch(id);
  }

  async getCourses(): Promise<Course[]> {
    const courses = await this.courseRepository.getAll();
    return courses.sort((left, right) => compareText(left.name, right.name));
  }

  async createSchedule(input: ScheduleInput): Promise<ScheduleServiceResult<Schedule>> {
    const normalizedInput = this.mapper.normalizeScheduleInput(input);
    const fieldErrors = this.validator.validateSchedule(normalizedInput);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const seasonResult = await this.requireEditableSeason(normalizedInput.seasonId);
    if (!seasonResult.ok) return seasonResult;

    const timestamp = new Date().toISOString();
    const schedule = this.mapper.toNewSchedule(
      normalizedInput,
      this.createId(normalizedInput.name, 'schedule'),
      timestamp,
    );
    return {ok: true, data: await this.repository.createSchedule(schedule)};
  }

  async updateSchedule(id: string, input: ScheduleInput): Promise<ScheduleServiceResult<Schedule>> {
    const schedule = await this.repository.getSchedule(id);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();

    const normalizedInput = this.mapper.normalizeScheduleInput(input);
    const fieldErrors = this.validator.validateSchedule(normalizedInput);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const targetSeasonResult = await this.requireEditableSeason(normalizedInput.seasonId);
    if (!targetSeasonResult.ok) return targetSeasonResult;

    const updated = await this.repository.updateSchedule(this.mapper.toUpdatedSchedule(
      schedule,
      normalizedInput,
      new Date().toISOString(),
    ));
    return updated ? {ok: true, data: updated} : this.notFoundResult('Schedule');
  }

  async publishSchedule(id: string): Promise<ScheduleServiceResult<Schedule>> {
    const schedule = await this.repository.getSchedule(id);
    if (!schedule) return this.notFoundResult('Schedule');
    if (schedule.published) return {ok: false, message: 'This schedule is already published.'};

    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    const season = seasonResult.data;
    const rounds = await this.repository.getRounds(schedule.id);
    const matches = await this.getMatchesForRounds(rounds);
    const [teams, courses] = await Promise.all([
      this.teamService.getAll(),
      this.courseRepository.getAll(),
    ]);
    const publicationErrors = this.validator.validatePublication(
      schedule,
      season,
      rounds,
      matches,
      teams,
      courses,
    );
    if (publicationErrors.length) {
      return {ok: false, message: publicationErrors[0]};
    }

    const timestamp = new Date().toISOString();
    const publishedSchedule = await this.repository.updateSchedule({
      ...schedule,
      published: true,
      updatedAt: timestamp,
    });
    if (!publishedSchedule) return this.notFoundResult('Schedule');

    await Promise.all(rounds.map((round) => this.repository.updateRound({
      ...round,
      published: true,
      updatedAt: timestamp,
    })));
    return {ok: true, data: publishedSchedule};
  }

  async unpublishSchedule(id: string): Promise<ScheduleServiceResult<Schedule>> {
    const schedule = await this.repository.getSchedule(id);
    if (!schedule) return this.notFoundResult('Schedule');
    if (!schedule.published) return {ok: false, message: 'This schedule is already a draft.'};

    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    const rounds = await this.repository.getRounds(schedule.id);
    const timestamp = new Date().toISOString();
    const draftSchedule = await this.repository.updateSchedule({
      ...schedule,
      published: false,
      updatedAt: timestamp,
    });
    if (!draftSchedule) return this.notFoundResult('Schedule');

    await Promise.all(rounds.map((round) => this.repository.updateRound({
      ...round,
      published: false,
      updatedAt: timestamp,
    })));
    return {ok: true, data: draftSchedule};
  }

  async deleteSchedule(id: string): Promise<ScheduleServiceResult<string>> {
    const schedule = await this.repository.getSchedule(id);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();

    const deleted = await this.repository.deleteSchedule(id);
    return deleted ? {ok: true, data: id} : this.notFoundResult('Schedule');
  }

  async createRound(scheduleId: string, input: RoundInput): Promise<ScheduleServiceResult<Round>> {
    const schedule = await this.repository.getSchedule(scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();

    const normalizedInput = this.mapper.normalizeRoundInput(input);
    const rounds = await this.repository.getRounds(schedule.id);
    const fieldErrors = this.validator.validateRound(normalizedInput, rounds, seasonResult.data);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const timestamp = new Date().toISOString();
    const round = this.mapper.toNewRound(
      schedule,
      normalizedInput,
      this.createId(`${schedule.name}-${normalizedInput.number}`, 'round'),
      timestamp,
    );
    return {ok: true, data: await this.repository.createRound(round)};
  }

  async updateRound(id: string, input: RoundInput): Promise<ScheduleServiceResult<Round>> {
    const round = await this.repository.getRound(id);
    if (!round) return this.notFoundResult('Round');
    const schedule = await this.repository.getSchedule(round.scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();

    const normalizedInput = this.mapper.normalizeRoundInput(input);
    const rounds = await this.repository.getRounds(schedule.id);
    const fieldErrors = this.validator.validateRound(
      normalizedInput,
      rounds,
      seasonResult.data,
      round.id,
    );
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const timestamp = new Date().toISOString();
    const updatedRound = await this.repository.updateRound(
      this.mapper.toUpdatedRound(round, normalizedInput, timestamp),
    );
    if (!updatedRound) return this.notFoundResult('Round');

    if (round.date !== normalizedInput.date) {
      const matches = await this.repository.getMatches(round.id);
      await Promise.all(matches.map((match) => this.repository.updateMatch({
        ...match,
        date: normalizedInput.date,
        updatedAt: timestamp,
      })));
    }
    return {ok: true, data: updatedRound};
  }

  async deleteRound(id: string): Promise<ScheduleServiceResult<string>> {
    const round = await this.repository.getRound(id);
    if (!round) return this.notFoundResult('Round');
    const schedule = await this.repository.getSchedule(round.scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();

    const deleted = await this.repository.deleteRound(id);
    return deleted ? {ok: true, data: id} : this.notFoundResult('Round');
  }

  async createMatch(roundId: string, input: MatchInput): Promise<ScheduleServiceResult<Match>> {
    const context = await this.getMatchMutationContext(roundId);
    if (!context.ok) return context;
    if (context.data.schedule.published) return this.publishedLockResult();

    const normalizedInput = this.mapper.normalizeMatchInput(input);
    const fieldErrors = this.validator.validateMatch(normalizedInput, {
      season: context.data.season,
      round: context.data.round,
      teams: context.data.teams,
      courses: context.data.courses,
      scheduleMatches: context.data.scheduleMatches,
      roundMatches: context.data.roundMatches,
    });
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const timestamp = new Date().toISOString();
    const match = this.mapper.toNewMatch(
      context.data.round,
      normalizedInput,
      this.createId(`${normalizedInput.homeTeamId}-vs-${normalizedInput.awayTeamId}`, 'match'),
      timestamp,
    );
    return {ok: true, data: await this.repository.createMatch(match)};
  }

  async updateMatch(id: string, input: MatchInput): Promise<ScheduleServiceResult<Match>> {
    const match = await this.repository.getMatch(id);
    if (!match) return this.notFoundResult('Match');
    const context = await this.getMatchMutationContext(match.roundId);
    if (!context.ok) return context;

    const normalizedInput = this.mapper.normalizeMatchInput(input);
    if (context.data.schedule.published) {
      if (this.publicMatchFieldsChanged(match, normalizedInput)) return this.publishedLockResult();
    } else {
      const fieldErrors = this.validator.validateMatch(normalizedInput, {
        season: context.data.season,
        round: context.data.round,
        teams: context.data.teams,
        courses: context.data.courses,
        scheduleMatches: context.data.scheduleMatches,
        roundMatches: context.data.roundMatches,
        currentId: match.id,
      });
      if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);
    }

    const updated = await this.repository.updateMatch(this.mapper.toUpdatedMatch(
      match,
      normalizedInput,
      new Date().toISOString(),
    ));
    return updated ? {ok: true, data: updated} : this.notFoundResult('Match');
  }

  async deleteMatch(id: string): Promise<ScheduleServiceResult<string>> {
    const match = await this.repository.getMatch(id);
    if (!match) return this.notFoundResult('Match');
    const round = await this.repository.getRound(match.roundId);
    if (!round) return this.notFoundResult('Round');
    const schedule = await this.repository.getSchedule(round.scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();

    const deleted = await this.repository.deleteMatch(id);
    return deleted ? {ok: true, data: id} : this.notFoundResult('Match');
  }

  private async getMatchMutationContext(roundId: string): Promise<ScheduleServiceResult<{
    round: Round;
    schedule: Schedule;
    season: Season;
    teams: Team[];
    courses: Course[];
    scheduleMatches: Match[];
    roundMatches: Match[];
  }>> {
    const round = await this.repository.getRound(roundId);
    if (!round) return this.notFoundResult('Round');
    const schedule = await this.repository.getSchedule(round.scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;

    const rounds = await this.repository.getRounds(schedule.id);
    const [teams, courses, scheduleMatches, roundMatches] = await Promise.all([
      this.teamService.getAll(),
      this.courseRepository.getAll(),
      this.getMatchesForRounds(rounds),
      this.repository.getMatches(round.id),
    ]);
    return {
      ok: true,
      data: {
        round,
        schedule,
        season: seasonResult.data,
        teams,
        courses,
        scheduleMatches,
        roundMatches,
      },
    };
  }

  private async requireEditableSeason(seasonId: string): Promise<ScheduleServiceResult<Season>> {
    const season = await this.seasonService.getById(seasonId);
    if (!season) return {ok: false, message: 'Season not found.'};
    if (!season.active || season.archived) {
      return {ok: false, message: 'Only the active season may be edited.'};
    }
    return {ok: true, data: season};
  }

  private async getMatchesForRounds(rounds: Round[]): Promise<Match[]> {
    const matchGroups = await Promise.all(
      rounds.map((round) => this.repository.getMatches(round.id)),
    );
    return matchGroups.flat();
  }

  private sortMatches(matches: Match[]): Match[] {
    return [...matches].sort((left, right) =>
      left.time.localeCompare(right.time)
      || compareText(left.homeTeamId, right.homeTeamId),
    );
  }

  private publicMatchFieldsChanged(match: Match, input: MatchInput): boolean {
    return match.homeTeamId !== input.homeTeamId
      || match.awayTeamId !== input.awayTeamId
      || match.courseId !== input.courseId
      || match.date !== input.date
      || match.time !== input.time
      || match.status !== input.status;
  }

  private createId(value: string, fallback: string): string {
    const slug = createSlug(value);
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    return `${slug || fallback}-${uniquePart}`;
  }

  private hasErrors(fieldErrors: ScheduleFieldErrors): boolean {
    return Object.keys(fieldErrors).length > 0;
  }

  private validationResult<T>(fieldErrors: ScheduleFieldErrors): ScheduleServiceResult<T> {
    return {
      ok: false,
      message: 'Review the highlighted schedule fields.',
      fieldErrors,
    };
  }

  private publishedLockResult<T>(): ScheduleServiceResult<T> {
    return {
      ok: false,
      message: 'Unpublish this schedule before changing public schedule data.',
    };
  }

  private notFoundResult<T>(entity: 'Schedule' | 'Round' | 'Match'): ScheduleServiceResult<T> {
    return {ok: false, message: `${entity} not found.`};
  }
}
