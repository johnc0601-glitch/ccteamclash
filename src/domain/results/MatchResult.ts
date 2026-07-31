export type MatchResultStatus = 'Draft' | 'Published';

export type ResultContestFormat = 'Singles' | 'Doubles';
export type ResultContestOutcome = 'W' | 'L' | 'T';
export type ResultContestSide = 'Home' | 'Away';

export type ResultContestPlayer = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  side: ResultContestSide;
  slot: 1 | 2;
};

export type ResultContest = {
  id: string;
  matchId: string;
  format: ResultContestFormat;
  position: number;
  homeOutcome: ResultContestOutcome;
  awayOutcome: ResultContestOutcome;
  homeScore: number | null;
  awayScore: number | null;
  players: ResultContestPlayer[];
  createdAt: string;
  updatedAt: string;
};

export type ResultContestPlayerInput = Pick<ResultContestPlayer, 'playerId' | 'teamId' | 'side' | 'slot'>;

export type ResultContestInput = Pick<
  ResultContest,
  'id' | 'format' | 'position' | 'homeOutcome' | 'awayOutcome' | 'homeScore' | 'awayScore'
> & {players: ResultContestPlayerInput[]};

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

export type MatchResultInput = Pick<MatchResult, 'homeScore' | 'awayScore'> & {
  contests?: ResultContestInput[];
};

export type ResultsFieldErrors = Partial<Record<'homeScore' | 'awayScore' | 'contests', string>>;

export type ResultsServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string; fieldErrors?: ResultsFieldErrors};
