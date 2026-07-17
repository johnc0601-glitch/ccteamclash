import type {Match, MatchInput} from '@/domain/schedule/Match';
import type {Round, RoundInput} from '@/domain/schedule/Round';
import type {Schedule, ScheduleInput} from '@/domain/schedule/Schedule';

export class ScheduleMapper {
  normalizeScheduleInput(input: ScheduleInput): ScheduleInput {
    return {
      seasonId: input.seasonId.trim(),
      name: input.name.trim(),
      description: input.description.trim(),
    };
  }

  normalizeRoundInput(input: RoundInput): RoundInput {
    return {
      number: input.number,
      name: input.name.trim(),
      date: input.date.trim(),
    };
  }

  normalizeMatchInput(input: MatchInput): MatchInput {
    return {
      homeTeamId: input.homeTeamId.trim(),
      awayTeamId: input.awayTeamId.trim(),
      courseId: input.courseId.trim(),
      date: input.date.trim(),
      time: input.time.trim(),
      status: input.status,
      notes: input.notes.trim(),
    };
  }

  toNewSchedule(input: ScheduleInput, id: string, timestamp: string): Schedule {
    return {
      ...input,
      id,
      published: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  toUpdatedSchedule(schedule: Schedule, input: ScheduleInput, timestamp: string): Schedule {
    return {...schedule, ...input, updatedAt: timestamp};
  }

  toNewRound(
    schedule: Schedule,
    input: RoundInput,
    id: string,
    timestamp: string,
  ): Round {
    return {
      ...input,
      id,
      scheduleId: schedule.id,
      seasonId: schedule.seasonId,
      published: schedule.published,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  toUpdatedRound(round: Round, input: RoundInput, timestamp: string): Round {
    return {...round, ...input, updatedAt: timestamp};
  }

  toNewMatch(round: Round, input: MatchInput, id: string, timestamp: string): Match {
    return {
      ...input,
      id,
      roundId: round.id,
      seasonId: round.seasonId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  toUpdatedMatch(match: Match, input: MatchInput, timestamp: string): Match {
    return {...match, ...input, updatedAt: timestamp};
  }
}
