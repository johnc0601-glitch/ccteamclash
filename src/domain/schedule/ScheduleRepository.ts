import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';

export interface ScheduleRepository {
  getSchedules(): Promise<Schedule[]>;
  getSchedule(id: string): Promise<Schedule | undefined>;
  getRounds(scheduleId?: string): Promise<Round[]>;
  getRound(id: string): Promise<Round | undefined>;
  getMatches(roundId?: string): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  createSchedule(schedule: Schedule): Promise<Schedule>;
  updateSchedule(schedule: Schedule): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<boolean>;
  createRound(round: Round): Promise<Round>;
  updateRound(round: Round): Promise<Round | undefined>;
  deleteRound(id: string): Promise<boolean>;
  createMatch(match: Match): Promise<Match>;
  updateMatch(match: Match): Promise<Match | undefined>;
  deleteMatch(id: string): Promise<boolean>;
  hasRecordedResults?(matchIds: string[]): Promise<boolean>;
}
