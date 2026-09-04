import type {CourseRepository} from '@/domain/course/CourseRepository';
import {MATCH_STATUSES, type Match} from '@/domain/schedule/Match';
import type {ScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import type {ScheduleServiceResult} from '@/domain/schedule/Schedule';
import type {SeasonService} from '@/domain/season/SeasonService';

export type MatchLogisticsInput = Pick<
  Match,
  'courseId' | 'date' | 'time' | 'status' | 'notes'
>;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export class MatchLogisticsService {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly seasonService: SeasonService,
    private readonly courseRepository: CourseRepository,
  ) {}

  async update(
    matchId: string,
    input: MatchLogisticsInput,
  ): Promise<ScheduleServiceResult<Match>> {
    const match = await this.scheduleRepository.getMatch(matchId);
    if (!match) return {ok: false, message: 'Match not found.'};

    const round = await this.scheduleRepository.getRound(match.roundId);
    if (!round) return {ok: false, message: 'Round not found.'};

    const schedule = await this.scheduleRepository.getSchedule(round.scheduleId);
    if (!schedule) return {ok: false, message: 'Schedule not found.'};

    const season = await this.seasonService.getById(schedule.seasonId);
    if (!season) return {ok: false, message: 'Season not found.'};
    if (!season.active || season.archived) {
      return {ok: false, message: 'Only the active season may be edited.'};
    }

    const hasRecordedResults = await this.scheduleRepository.hasRecordedResults?.([match.id]);
    if (hasRecordedResults) {
      return {
        ok: false,
        message: 'This match has recorded results and its event details are locked.',
      };
    }

    const fieldErrors: Record<string, string> = {};
    const course = input.courseId
      ? await this.courseRepository.getById(input.courseId)
      : undefined;

    if (!input.courseId || !course || !course.active) {
      fieldErrors.courseId = 'Select an active course.';
    }

    if (input.date !== null) {
      if (!isValidDate(input.date)) {
        fieldErrors.date = 'Enter a valid match date or choose TBD.';
      } else if (input.date < season.startDate || input.date > season.endDate) {
        fieldErrors.date = 'Match date must fall within the season date range.';
      }
    }

    if (!input.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) {
      fieldErrors.time = 'Enter a valid match time.';
    }

    if (!MATCH_STATUSES.includes(input.status)) {
      fieldErrors.status = 'Select a valid match status.';
    }

    if (Object.keys(fieldErrors).length) {
      return {
        ok: false,
        message: 'Review the highlighted match details.',
        fieldErrors,
      };
    }

    const updated = await this.scheduleRepository.updateMatch({
      ...match,
      courseId: input.courseId,
      date: input.date,
      time: input.time,
      status: input.status,
      notes: input.notes,
      updatedAt: new Date().toISOString(),
    });

    return updated
      ? {ok: true, data: updated}
      : {ok: false, message: 'Match not found.'};
  }
}
