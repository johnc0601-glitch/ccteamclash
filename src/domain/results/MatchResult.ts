export type MatchResultStatus = 'Draft' | 'Published';

export type MatchResult = {
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchResultStatus;
  publishedAt: string | null;
  reopenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchResultInput = Pick<MatchResult, 'homeScore' | 'awayScore'>;

export type ResultsFieldErrors = Partial<Record<'homeScore' | 'awayScore', string>>;

export type ResultsServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: ResultsFieldErrors};
