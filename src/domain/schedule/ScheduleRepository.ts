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

const SCHEDULE_MOCK_DATA = [
  {
    id: 'summer-2026-championship',
    seasonId: 'summer-team-clash-2026',
    name: '2026 Schedule',
    description: '',
    published: true,
    createdAt: '2026-04-02T14:00:00.000Z',
    updatedAt: '2026-07-10T18:30:00.000Z',
  },
  {
    id: 'spring-2026-archive',
    seasonId: 'spring-team-clash-2026',
    name: 'Spring 2026 Schedule',
    description: 'The completed spring schedule retained for league history.',
    published: true,
    createdAt: '2026-01-03T13:00:00.000Z',
    updatedAt: '2026-05-24T16:00:00.000Z',
  },
] as const satisfies readonly Schedule[];

const ROUND_MOCK_DATA = [
  {
    id: 'summer-2026-round-1',
    scheduleId: 'summer-2026-championship',
    seasonId: 'summer-team-clash-2026',
    number: 1,
    name: 'Opening Round',
    date: '2026-07-18',
    published: true,
    createdAt: '2026-04-02T14:15:00.000Z',
    updatedAt: '2026-07-10T18:30:00.000Z',
  },
  {
    id: 'summer-2026-round-2',
    scheduleId: 'summer-2026-championship',
    seasonId: 'summer-team-clash-2026',
    number: 2,
    name: 'Rivalry Round',
    date: '2026-07-25',
    published: true,
    createdAt: '2026-04-02T14:20:00.000Z',
    updatedAt: '2026-07-10T18:30:00.000Z',
  },
  {
    id: 'summer-2026-draft-round-1',
    scheduleId: 'summer-2026-championship',
    seasonId: 'summer-team-clash-2026',
    number: 3,
    name: 'Semifinals',
    date: '2026-08-22',
    published: false,
    createdAt: '2026-07-01T15:20:00.000Z',
    updatedAt: '2026-07-15T20:10:00.000Z',
  },
  {
    id: 'summer-2026-playoff-championship-round',
    scheduleId: 'summer-2026-championship',
    seasonId: 'summer-team-clash-2026',
    number: 4,
    name: 'Championship',
    date: '2026-09-26',
    published: false,
    createdAt: '2026-07-01T15:25:00.000Z',
    updatedAt: '2026-07-15T20:10:00.000Z',
  },
  {
    id: 'spring-2026-round-1',
    scheduleId: 'spring-2026-archive',
    seasonId: 'spring-team-clash-2026',
    number: 1,
    name: 'Spring Opener',
    date: '2026-02-07',
    published: true,
    createdAt: '2026-01-03T13:15:00.000Z',
    updatedAt: '2026-02-08T12:00:00.000Z',
  },
] as const satisfies readonly Round[];

const MATCH_MOCK_DATA = [
  {
    id: 'summer-2026-r1-dark-ninjas',
    roundId: 'summer-2026-round-1',
    seasonId: 'summer-team-clash-2026',
    homeTeamId: 'dark-knights',
    awayTeamId: 'ninjas',
    courseId: 'castle-hayne-park',
    date: '2026-07-18',
    time: '09:00',
    status: 'Scheduled',
    notes: '',
    createdAt: '2026-04-02T14:30:00.000Z',
    updatedAt: '2026-07-10T18:30:00.000Z',
  },
  {
    id: 'summer-2026-r1-chain-bogey',
    roundId: 'summer-2026-round-1',
    seasonId: 'summer-team-clash-2026',
    homeTeamId: 'chain-hawks',
    awayTeamId: 'bogey-men',
    courseId: 'castle-hayne-park',
    date: '2026-07-18',
    time: '10:30',
    status: 'Scheduled',
    notes: 'Commissioner check-in begins thirty minutes before the first tee time.',
    createdAt: '2026-04-02T14:35:00.000Z',
    updatedAt: '2026-07-10T18:30:00.000Z',
  },
  {
    id: 'summer-2026-r2-chain-dark',
    roundId: 'summer-2026-round-2',
    seasonId: 'summer-team-clash-2026',
    homeTeamId: 'chain-hawks',
    awayTeamId: 'dark-knights',
    courseId: 'northeast-creek-park',
    date: '2026-07-25',
    time: '09:00',
    status: 'Scheduled',
    notes: '',
    createdAt: '2026-04-02T14:40:00.000Z',
    updatedAt: '2026-07-10T18:30:00.000Z',
  },
  {
    id: 'summer-2026-r2-ninjas-bogey',
    roundId: 'summer-2026-round-2',
    seasonId: 'summer-team-clash-2026',
    homeTeamId: 'ninjas',
    awayTeamId: 'bogey-men',
    courseId: 'northeast-creek-park',
    date: '2026-07-25',
    time: '10:30',
    status: 'Scheduled',
    notes: '',
    createdAt: '2026-04-02T14:45:00.000Z',
    updatedAt: '2026-07-10T18:30:00.000Z',
  },
  {
    id: 'summer-2026-playoff-sf1',
    roundId: 'summer-2026-draft-round-1',
    seasonId: 'summer-team-clash-2026',
    homeTeamId: null,
    awayTeamId: null,
    courseId: null,
    date: null,
    time: '09:00',
    status: 'Scheduled',
    notes: 'Playoff semifinal 1 placeholder.',
    createdAt: '2026-07-01T15:30:00.000Z',
    updatedAt: '2026-07-15T20:10:00.000Z',
  },
  {
    id: 'summer-2026-playoff-sf2',
    roundId: 'summer-2026-draft-round-1',
    seasonId: 'summer-team-clash-2026',
    homeTeamId: null,
    awayTeamId: null,
    courseId: null,
    date: null,
    time: '10:30',
    status: 'Scheduled',
    notes: 'Playoff semifinal 2 placeholder.',
    createdAt: '2026-07-01T15:35:00.000Z',
    updatedAt: '2026-07-15T20:10:00.000Z',
  },
  {
    id: 'summer-2026-playoff-final',
    roundId: 'summer-2026-playoff-championship-round',
    seasonId: 'summer-team-clash-2026',
    homeTeamId: null,
    awayTeamId: null,
    courseId: null,
    date: null,
    time: '09:00',
    status: 'Scheduled',
    notes: 'Playoff championship placeholder.',
    createdAt: '2026-07-01T15:40:00.000Z',
    updatedAt: '2026-07-15T20:10:00.000Z',
  },
  {
    id: 'spring-2026-opener',
    roundId: 'spring-2026-round-1',
    seasonId: 'spring-team-clash-2026',
    homeTeamId: 'chain-hawks',
    awayTeamId: 'ninjas',
    courseId: 'arrowhead-park',
    date: '2026-02-07',
    time: '09:00',
    status: 'Completed',
    notes: '',
    createdAt: '2026-01-03T13:30:00.000Z',
    updatedAt: '2026-02-08T12:00:00.000Z',
  },
] as const satisfies readonly Match[];

function cloneSchedule(schedule: Schedule): Schedule {
  return {...schedule};
}

function cloneRound(round: Round): Round {
  return {...round};
}

function cloneMatch(match: Match): Match {
  return {...match};
}

export class MockScheduleRepository implements ScheduleRepository {
  private schedules: Schedule[] = SCHEDULE_MOCK_DATA.map(cloneSchedule);
  private rounds: Round[] = ROUND_MOCK_DATA.map(cloneRound);
  private matches: Match[] = MATCH_MOCK_DATA.map(cloneMatch);
  private recordedResultIds = new Set<string>();

  async getSchedules(): Promise<Schedule[]> {
    return this.schedules.map(cloneSchedule);
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    const schedule = this.schedules.find((candidate) => candidate.id === id);
    return schedule ? cloneSchedule(schedule) : undefined;
  }

  async getRounds(scheduleId?: string): Promise<Round[]> {
    return this.rounds
      .filter((round) => !scheduleId || round.scheduleId === scheduleId)
      .map(cloneRound);
  }

  async getRound(id: string): Promise<Round | undefined> {
    const round = this.rounds.find((candidate) => candidate.id === id);
    return round ? cloneRound(round) : undefined;
  }

  async getMatches(roundId?: string): Promise<Match[]> {
    return this.matches
      .filter((match) => !roundId || match.roundId === roundId)
      .map(cloneMatch);
  }

  async getMatch(id: string): Promise<Match | undefined> {
    const match = this.matches.find((candidate) => candidate.id === id);
    return match ? cloneMatch(match) : undefined;
  }

  async createSchedule(schedule: Schedule): Promise<Schedule> {
    const storedSchedule = cloneSchedule(schedule);
    this.schedules.push(storedSchedule);
    return cloneSchedule(storedSchedule);
  }

  async updateSchedule(schedule: Schedule): Promise<Schedule | undefined> {
    const index = this.schedules.findIndex((candidate) => candidate.id === schedule.id);
    if (index === -1) return undefined;

    this.schedules[index] = cloneSchedule(schedule);
    return cloneSchedule(this.schedules[index]);
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const initialLength = this.schedules.length;
    const roundIds = new Set(this.rounds
      .filter((round) => round.scheduleId === id)
      .map((round) => round.id));

    this.matches = this.matches.filter((match) => !roundIds.has(match.roundId));
    this.rounds = this.rounds.filter((round) => round.scheduleId !== id);
    this.schedules = this.schedules.filter((schedule) => schedule.id !== id);
    return this.schedules.length < initialLength;
  }

  async createRound(round: Round): Promise<Round> {
    const storedRound = cloneRound(round);
    this.rounds.push(storedRound);
    return cloneRound(storedRound);
  }

  async updateRound(round: Round): Promise<Round | undefined> {
    const index = this.rounds.findIndex((candidate) => candidate.id === round.id);
    if (index === -1) return undefined;

    this.rounds[index] = cloneRound(round);
    return cloneRound(this.rounds[index]);
  }

  async deleteRound(id: string): Promise<boolean> {
    const initialLength = this.rounds.length;
    this.matches = this.matches.filter((match) => match.roundId !== id);
    this.rounds = this.rounds.filter((round) => round.id !== id);
    return this.rounds.length < initialLength;
  }

  async createMatch(match: Match): Promise<Match> {
    const storedMatch = cloneMatch(match);
    this.matches.push(storedMatch);
    return cloneMatch(storedMatch);
  }

  async updateMatch(match: Match): Promise<Match | undefined> {
    const index = this.matches.findIndex((candidate) => candidate.id === match.id);
    if (index === -1) return undefined;

    this.matches[index] = cloneMatch(match);
    return cloneMatch(this.matches[index]);
  }

  async deleteMatch(id: string): Promise<boolean> {
    const initialLength = this.matches.length;
    this.matches = this.matches.filter((match) => match.id !== id);
    return this.matches.length < initialLength;
  }

  async hasRecordedResults(matchIds: string[]): Promise<boolean> {
    return matchIds.some((id) => this.recordedResultIds.has(id));
  }

  markResultRecorded(matchId: string): void {
    this.recordedResultIds.add(matchId);
  }
}
