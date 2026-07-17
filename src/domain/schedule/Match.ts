export const MATCH_STATUSES = [
  'Scheduled',
  'Completed',
  'Postponed',
  'Cancelled',
  'Rain Delay',
] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type Match = {
  id: string;
  roundId: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  courseId: string;
  date: string;
  time: string;
  status: MatchStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type MatchInput = Pick<
  Match,
  'homeTeamId' | 'awayTeamId' | 'courseId' | 'date' | 'time' | 'status' | 'notes'
>;
