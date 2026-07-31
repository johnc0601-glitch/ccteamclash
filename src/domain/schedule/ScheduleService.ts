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
import {
  validateScheduleImport,
  type ScheduleImportData,
} from '@/domain/schedule/ScheduleImport';
import {ScheduleValidator, type ScheduleRules} from '@/domain/schedule/ScheduleValidator';
import type {Team} from '@/models/Team';
import {createSlug} from '@/shared/utils';
import type {TeamService} from '@/services/TeamService';

const DEFAULT_QUERY: ScheduleQuery = {
  search: '',
  seasonId: 'all',
  publication: 'all',
};
const MATCH_DISPLAY_WINDOW_DAYS = 14;

export type ScheduleEventBucket = 'upcoming' | 'recent' | 'past';

export type PublicScheduleEvent = {
  id: string;
  href: string;
  date: string;
  time: string;
  course: string;
  directionsUrl: string;
  home: string;
  away: string;
  homeTeamId: string;
  awayTeamId: string;
  dateTime: Date;
  bucket: ScheduleEventBucket;
  status: 'Scheduled' | 'Recent' | 'Past';
};

export type TeamScheduleEvent = PublicScheduleEvent & {
  opponent: string;
  isHome: boolean;
};

export type RoundMatchUpdate = {
  id: Match['id'];
  input: MatchInput;
};

export type RoundEditorUpdate = {
  round: Round;
  matches: Match[];
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
          match.homeTeamId ? teamNames.get(match.homeTeamId) ?? match.homeTeamId : 'TBD',
          match.awayTeamId ? teamNames.get(match.awayTeamId) ?? match.awayTeamId : 'TBD',
          match.courseId ? courseNames.get(match.courseId) ?? match.courseId : 'TBD',
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
          match.homeTeamId ? teamNames.get(match.homeTeamId) ?? match.homeTeamId : 'TBD',
          match.awayTeamId ? teamNames.get(match.awayTeamId) ?? match.awayTeamId : 'TBD',
          match.courseId ? courseNames.get(match.courseId) ?? match.courseId : 'TBD',
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
      match.homeTeamId ? teamNames.get(match.homeTeamId) ?? match.homeTeamId : 'TBD',
      match.awayTeamId ? teamNames.get(match.awayTeamId) ?? match.awayTeamId : 'TBD',
      match.courseId ? courseNames.get(match.courseId) ?? match.courseId : 'TBD',
      match.status,
      match.notes,
    ].some((value) => normalizeForComparison(value).includes(normalizedSearch))));
  }

  async getMatch(id: string): Promise<Match | undefined> {
    return this.repository.getMatch(id);
  }

  async assignPlayoffTeams(
    id: string,
    homeTeamId: string | null,
    awayTeamId: string | null,
  ): Promise<ScheduleServiceResult<Match>> {
    const match = await this.repository.getMatch(id);
    if (!match) return this.notFoundResult('Match');
    const round = await this.repository.getRound(match.roundId);
    if (!round) return this.notFoundResult('Round');
    const schedule = await this.repository.getSchedule(round.scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    if (schedule.published) return this.publishedLockResult();
    if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
      return {ok: false, message: 'Playoff teams must be different.'};
    }
    const teams = await this.teamService.getAll();
    const activeTeamIds = new Set(teams.filter((team) => team.active).map((team) => team.id));
    if ((homeTeamId && !activeTeamIds.has(homeTeamId))
      || (awayTeamId && !activeTeamIds.has(awayTeamId))) {
      return {ok: false, message: 'A playoff team is unavailable.'};
    }
    const updated = await this.repository.updateMatch({
      ...match,
      homeTeamId,
      awayTeamId,
      updatedAt: new Date().toISOString(),
    });
    return updated ? {ok: true, data: updated} : this.notFoundResult('Match');
  }

  async getCourses(): Promise<Course[]> {
    const courses = await this.courseRepository.getAll();
    return courses.sort((left, right) => compareText(left.name, right.name));
  }

  async getTeams(): Promise<Team[]> {
    const teams = await this.teamService.getAll();
    return teams.sort((left, right) => compareText(left.name, right.name));
  }

  async getTeamAliases() {
    return this.teamService.getAliases();
  }

  async saveTeamAlias(alias: string, teamId: string) {
    return this.teamService.saveAlias(alias, teamId);
  }

  async getPublishedEvents(referenceDate = new Date()): Promise<PublicScheduleEvent[]> {
    const [schedules, teams, courses] = await Promise.all([
      this.repository.getSchedules(),
      this.teamService.getAll(),
      this.courseRepository.getAll(),
    ]);
    const publishedSchedules = schedules.filter((schedule) => schedule.published);
    const rounds = (await Promise.all(
      publishedSchedules.map((schedule) => this.repository.getRounds(schedule.id)),
    )).flat().filter((round) => round.published);
    const matches = (await this.getMatchesForRounds(rounds)).filter(
      (match): match is Match & {
        homeTeamId: string;
        awayTeamId: string;
        courseId: string;
        date: string;
        time: string;
      } => Boolean(match.homeTeamId && match.awayTeamId && match.courseId && match.date && match.time),
    );
    const teamNames = new Map(teams.map((team) => [team.id, team.name]));
    const courseDetails = new Map(courses.map((course) => [course.id, course]));

    return matches.map((match): PublicScheduleEvent => {
      const dateTime = new Date(`${match.date}T${match.time}:00`);
      const safeDateTime = Number.isNaN(dateTime.getTime())
        ? new Date(`${match.date}T00:00:00`)
        : dateTime;
      const bucket = this.getEventBucket(safeDateTime, referenceDate);
      const course = courseDetails.get(match.courseId);
      return {
        id: match.id,
        href: `/matches/${match.id}`,
        date: this.formatEventDate(match.date),
        time: this.formatEventTime(match.time),
        course: course?.name ?? match.courseId,
        directionsUrl: course?.mapUrl ?? '',
        home: teamNames.get(match.homeTeamId) ?? match.homeTeamId,
        away: teamNames.get(match.awayTeamId) ?? match.awayTeamId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        dateTime: safeDateTime,
        bucket,
        status: bucket === 'upcoming' ? 'Scheduled' : bucket === 'recent' ? 'Recent' : 'Past',
      };
    }).sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime());
  }

  async getHomePageEvents(referenceDate = new Date()): Promise<PublicScheduleEvent[]> {
    const events = await this.getPublishedEvents(referenceDate);
    const upcoming = events.filter((event) => event.bucket === 'upcoming');
    if (upcoming.length) {
      const nextDate = this.dateKey(upcoming[0].dateTime);
      return upcoming.filter((event) => this.dateKey(event.dateTime) === nextDate);
    }
    return events
      .filter((event) => event.bucket === 'recent')
      .sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime());
  }

  async getPublishedEventById(
    id: string,
    referenceDate = new Date(),
  ): Promise<PublicScheduleEvent | undefined> {
    return (await this.getPublishedEvents(referenceDate)).find((event) => event.id === id);
  }

  async getTeamEvents(teamId: string, referenceDate = new Date()): Promise<TeamScheduleEvent[]> {
    return (await this.getPublishedEvents(referenceDate))
      .filter((event) => event.homeTeamId === teamId || event.awayTeamId === teamId)
      .map((event) => ({
        ...event,
        opponent: event.homeTeamId === teamId ? event.away : event.home,
        isHome: event.homeTeamId === teamId,
      }));
  }

  async getTeamNextEvent(
    teamId: string,
    referenceDate = new Date(),
  ): Promise<TeamScheduleEvent | undefined> {
    return (await this.getTeamEvents(teamId, referenceDate))
      .find((event) => event.bucket === 'upcoming');
  }

  async importSchedule(data: ScheduleImportData): Promise<ScheduleServiceResult<Schedule>> {
    const [seasons, teams, courses, schedules] = await Promise.all([
      this.seasonService.getAll(),
      this.teamService.getAll(),
      this.courseRepository.getAll(),
      this.repository.getSchedules(),
    ]);
    const validation = validateScheduleImport(data, seasons, teams, courses);
    if (!validation.data) return {ok: false, message: validation.errors[0]};

    const existingSchedule = schedules.find((schedule) => schedule.seasonId === validation.data!.seasonId);
    if (existingSchedule) return this.updateScheduleFromImport(existingSchedule, validation.data);

    let createdSchedule: Schedule | undefined;
    try {
      const scheduleResult = await this.createSchedule(validation.data);
      if (!scheduleResult.ok) return scheduleResult;
      createdSchedule = scheduleResult.data;
      for (const round of validation.data.rounds) {
        const roundResult = await this.createRound(createdSchedule.id, round);
        if (!roundResult.ok) throw new Error(roundResult.message);
        for (const match of round.matches) {
          const matchResult = await this.createMatch(roundResult.data.id, match);
          if (!matchResult.ok) throw new Error(matchResult.message);
        }
      }
      return {ok: true, data: createdSchedule};
    } catch (error) {
      if (createdSchedule) await this.repository.deleteSchedule(createdSchedule.id);
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Schedule could not be imported.',
      };
    }
  }

  private async updateScheduleFromImport(
    schedule: Schedule,
    data: ScheduleImportData,
  ): Promise<ScheduleServiceResult<Schedule>> {
    if (schedule.published) return this.publishedLockResult();
    const existingRounds = await this.repository.getRounds(schedule.id);
    const existingMatchGroups = await Promise.all(
      existingRounds.map((round) => this.repository.getMatches(round.id)),
    );
    const allMatches = existingMatchGroups.flat();
    if (await this.hasRecordedResults(allMatches)) return this.historyLockResult();

    const playoffRounds = existingRounds.filter((round) => this.isPlayoffRound(round));
    const regularRounds = existingRounds.filter((round) => !this.isPlayoffRound(round));
    const regularByName = new Map(regularRounds.map((round) => [this.normalizedKey(round.name), round]));

    for (const round of existingRounds) {
      await this.repository.updateRound({...round, number: round.number + 10_000});
    }

    const retainedRoundIds = new Set<string>();
    for (const inputRound of data.rounds.filter((round) => !this.isPlayoffName(round.name))) {
      const existingRound = regularByName.get(this.normalizedKey(inputRound.name));
      let round: Round;
      if (existingRound) {
        round = (await this.repository.updateRound(this.mapper.toUpdatedRound(
          existingRound,
          inputRound,
          new Date().toISOString(),
        )))!;
        retainedRoundIds.add(round.id);
      } else {
        const result = await this.createRound(schedule.id, inputRound);
        if (!result.ok) return result;
        round = result.data;
      }

      const storedMatches = await this.repository.getMatches(round.id);
      const storedByMatchup = new Map(storedMatches.map((match) => [this.matchupKey(match), match]));
      const retainedMatchIds = new Set<string>();
      for (const inputMatch of inputRound.matches) {
        const stored = storedByMatchup.get(this.matchupKey(inputMatch));
        if (stored) {
          await this.repository.updateMatch(this.mapper.toUpdatedMatch(
            stored,
            {...inputMatch, date: inputRound.date},
            new Date().toISOString(),
          ));
          retainedMatchIds.add(stored.id);
        } else {
          const result = await this.createMatch(round.id, {...inputMatch, date: inputRound.date});
          if (!result.ok) return result;
        }
      }
      await Promise.all(storedMatches
        .filter((match) => !retainedMatchIds.has(match.id))
        .map((match) => this.repository.deleteMatch(match.id)));
    }

    await Promise.all(regularRounds
      .filter((round) => !retainedRoundIds.has(round.id))
      .map((round) => this.repository.deleteRound(round.id)));
    const regularCount = data.rounds.filter((round) => !this.isPlayoffName(round.name)).length;
    await Promise.all(playoffRounds.map((round, index) => this.repository.updateRound({
      ...round,
      number: regularCount + index + 1,
      updatedAt: new Date().toISOString(),
    })));
    const updated = await this.repository.updateSchedule({
      ...schedule,
      name: data.name,
      description: data.description,
      updatedAt: new Date().toISOString(),
    });
    return updated ? {ok: true, data: updated} : this.notFoundResult('Schedule');
  }

  async createSchedule(input: ScheduleInput): Promise<ScheduleServiceResult<Schedule>> {
    const normalizedInput = this.mapper.normalizeScheduleInput(input);
    const fieldErrors = this.validator.validateSchedule(normalizedInput);
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const seasonResult = await this.requireEditableSeason(normalizedInput.seasonId);
    if (!seasonResult.ok) return seasonResult;
    const existingSchedule = (await this.repository.getSchedules())
      .find((schedule) => schedule.seasonId === normalizedInput.seasonId);
    if (existingSchedule) {
      return {ok: false, message: 'This season already has a schedule.'};
    }

    const timestamp = new Date().toISOString();
    const schedule = this.mapper.toNewSchedule(
      normalizedInput,
      this.createId(normalizedInput.name, 'schedule'),
      timestamp,
    );
    return {ok: true, data: await this.repository.createSchedule(schedule)};
  }

  async ensureSchedule(seasonId: string): Promise<ScheduleServiceResult<Schedule>> {
    const existingSchedule = (await this.repository.getSchedules())
      .find((schedule) => schedule.seasonId === seasonId);
    if (existingSchedule) return {ok: true, data: existingSchedule};

    const seasonResult = await this.requireEditableSeason(seasonId);
    if (!seasonResult.ok) return seasonResult;
    return this.createSchedule({
      seasonId,
      name: `${seasonResult.data.year} Schedule`,
      description: '',
    });
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
    if (await this.scheduleHasRecordedResults(schedule.id)) return this.historyLockResult();

    const deleted = await this.repository.deleteSchedule(id);
    return deleted ? {ok: true, data: id} : this.notFoundResult('Schedule');
  }

  async createRound(scheduleId: string, input: RoundInput): Promise<ScheduleServiceResult<Round>> {
    const schedule = await this.repository.getSchedule(scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();
    if (await this.scheduleHasRecordedResults(schedule.id)) return this.historyLockResult();

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
    if (await this.scheduleHasRecordedResults(schedule.id)) return this.historyLockResult();

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

  async updateRoundWithMatches(
    id: string,
    input: RoundInput,
    matchUpdates: RoundMatchUpdate[],
  ): Promise<ScheduleServiceResult<RoundEditorUpdate>> {
    const context = await this.getMatchMutationContext(id);
    if (!context.ok) return context;
    if (context.data.schedule.published) return this.publishedLockResult();
    if (await this.hasRecordedResults(context.data.scheduleMatches)) return this.historyLockResult();

    const storedMatchIds = new Set(context.data.roundMatches.map((match) => match.id));
    const submittedMatchIds = new Set(matchUpdates.map((match) => match.id));
    if (matchUpdates.length !== storedMatchIds.size
      || storedMatchIds.size !== submittedMatchIds.size
      || [...storedMatchIds].some((matchId) => !submittedMatchIds.has(matchId))) {
      return {ok: false, message: 'The round matches changed. Close the editor and try again.'};
    }

    const normalizedRoundInput = this.mapper.normalizeRoundInput(input);
    const rounds = await this.repository.getRounds(context.data.schedule.id);
    const fieldErrors = this.validator.validateRound(
      normalizedRoundInput,
      rounds,
      context.data.season,
      context.data.round.id,
    );
    const proposedRound = this.mapper.toUpdatedRound(
      context.data.round,
      normalizedRoundInput,
      context.data.round.updatedAt,
    );
    const normalizedMatches = matchUpdates.map(({id: matchId, input: matchInput}) => ({
      id: matchId,
      input: this.mapper.normalizeMatchInput({
        ...matchInput,
        date: normalizedRoundInput.date,
      }),
    }));
    const proposedRoundMatches = normalizedMatches.map(({id: matchId, input: matchInput}) => {
      const storedMatch = context.data.roundMatches.find((match) => match.id === matchId)!;
      return this.mapper.toUpdatedMatch(storedMatch, matchInput, storedMatch.updatedAt);
    });
    const proposedScheduleMatches = [
      ...context.data.scheduleMatches.filter((match) => match.roundId !== context.data.round.id),
      ...proposedRoundMatches,
    ];

    for (const match of normalizedMatches) {
      const matchErrors = this.validator.validateMatch(match.input, {
        season: context.data.season,
        round: proposedRound,
        teams: context.data.teams,
        courses: context.data.courses,
        scheduleMatches: proposedScheduleMatches,
        roundMatches: proposedRoundMatches,
        currentId: match.id,
      });
      for (const [field, message] of Object.entries(matchErrors)) {
        fieldErrors[`matches.${match.id}.${field}`] = message;
      }
    }
    if (this.hasErrors(fieldErrors)) return this.validationResult(fieldErrors);

    const timestamp = new Date().toISOString();
    const updatedRound = await this.repository.updateRound(
      this.mapper.toUpdatedRound(context.data.round, normalizedRoundInput, timestamp),
    );
    if (!updatedRound) return this.notFoundResult('Round');

    const updatedMatches = await Promise.all(normalizedMatches.map(async ({id: matchId, input: matchInput}) => {
      const storedMatch = context.data.roundMatches.find((match) => match.id === matchId)!;
      return this.repository.updateMatch(this.mapper.toUpdatedMatch(storedMatch, matchInput, timestamp));
    }));
    if (updatedMatches.some((match) => !match)) {
      return {ok: false, message: 'One or more matches could not be saved.'};
    }
    return {
      ok: true,
      data: {
        round: updatedRound,
        matches: updatedMatches.filter((match): match is Match => Boolean(match)),
      },
    };
  }

  async deleteRound(id: string): Promise<ScheduleServiceResult<string>> {
    const round = await this.repository.getRound(id);
    if (!round) return this.notFoundResult('Round');
    const schedule = await this.repository.getSchedule(round.scheduleId);
    if (!schedule) return this.notFoundResult('Schedule');
    const seasonResult = await this.requireEditableSeason(schedule.seasonId);
    if (!seasonResult.ok) return seasonResult;
    if (schedule.published) return this.publishedLockResult();
    if (await this.scheduleHasRecordedResults(schedule.id)) return this.historyLockResult();

    const deleted = await this.repository.deleteRound(id);
    return deleted ? {ok: true, data: id} : this.notFoundResult('Round');
  }

  async createMatch(roundId: string, input: MatchInput): Promise<ScheduleServiceResult<Match>> {
    const context = await this.getMatchMutationContext(roundId);
    if (!context.ok) return context;
    if (context.data.schedule.published) return this.publishedLockResult();
    if (await this.hasRecordedResults(context.data.scheduleMatches)) return this.historyLockResult();

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
    if (this.publicMatchFieldsChanged(match, normalizedInput)
      && await this.hasRecordedResults(context.data.scheduleMatches)) {
      return this.historyLockResult();
    }
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
    if (await this.scheduleHasRecordedResults(schedule.id)) return this.historyLockResult();

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
      (left.time ?? '').localeCompare(right.time ?? '')
      || compareText(left.homeTeamId ?? '', right.homeTeamId ?? ''),
    );
  }

  private getEventBucket(dateTime: Date, referenceDate: Date): ScheduleEventBucket {
    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const eventDay = new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate());
    if (eventDay.getTime() >= today.getTime()) return 'upcoming';
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - MATCH_DISPLAY_WINDOW_DAYS);
    return eventDay.getTime() >= cutoff.getTime() ? 'recent' : 'past';
  }

  private formatEventDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00.000Z`));
  }

  private formatEventTime(value: string): string {
    const [hours, minutes] = value.split(':').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(2000, 0, 1, hours, minutes));
  }

  private dateKey(value: Date): string {
    return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
  }

  private publicMatchFieldsChanged(match: Match, input: MatchInput): boolean {
    return match.homeTeamId !== input.homeTeamId
      || match.awayTeamId !== input.awayTeamId
      || match.courseId !== input.courseId
      || match.date !== input.date
      || match.time !== input.time
      || match.status !== input.status;
  }

  private async scheduleHasRecordedResults(scheduleId: string): Promise<boolean> {
    const rounds = await this.repository.getRounds(scheduleId);
    return this.hasRecordedResults(await this.getMatchesForRounds(rounds));
  }

  private async hasRecordedResults(matches: Match[]): Promise<boolean> {
    return (await this.repository.hasRecordedResults?.(matches.map((match) => match.id))) ?? false;
  }

  private historyLockResult<T>(): ScheduleServiceResult<T> {
    return {
      ok: false,
      message: 'This schedule has recorded results. Reset or reopen the season before changing schedule events.',
    };
  }

  private createId(value: string, fallback: string): string {
    const slug = createSlug(value);
    const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
    return `${slug || fallback}-${uniquePart}`;
  }

  private normalizedKey(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  private isPlayoffName(value: string): boolean {
    const key = this.normalizedKey(value);
    return key === 'semifinal' || key === 'semifinals' || key === 'championship';
  }

  private isPlayoffRound(round: Round): boolean {
    return this.isPlayoffName(round.name);
  }

  private matchupKey(match: Pick<MatchInput, 'homeTeamId' | 'awayTeamId'>): string {
    return [match.homeTeamId ?? '', match.awayTeamId ?? ''].sort().join(':');
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
