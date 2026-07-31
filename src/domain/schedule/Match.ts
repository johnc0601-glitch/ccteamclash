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
  homeTeamId: string | null;
  awayTeamId: string | null;
  courseId: string | null;
  date: string | null;
  time: string | null;
  status: MatchStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type MatchInput = Pick<
  Match,
  'homeTeamId' | 'awayTeamId' | 'courseId' | 'date' | 'time' | 'status' | 'notes'
>;
