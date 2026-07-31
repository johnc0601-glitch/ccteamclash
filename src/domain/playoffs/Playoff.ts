import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {Team} from '@/models/Team';

export type PlayoffBracket = {
  id: string;
  seasonId: string;
  status: 'Draft' | 'Published';
  regularSeasonLockedAt: string;
  publishedAt: string | null;
  championTeamId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlayoffGame = {
  id: string;
  bracketId: string;
  stage: 'Semifinal' | 'Championship';
  position: 1 | 2;
  matchId: string;
  homeSeed: number | null;
  awaySeed: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PlayoffGameView = PlayoffGame & {
  match: Match;
  result?: MatchResult;
  homeTeam?: Team;
  awayTeam?: Team;
  winnerTeamId?: string;
};

export type PlayoffBracketView = {
  bracket: PlayoffBracket;
  games: PlayoffGameView[];
  champion?: Team;
};

export type GeneratePlayoffInput = {
  seasonId: string;
  semifinal1MatchId: string;
  semifinal2MatchId: string;
  championshipMatchId: string;
};

export type PlayoffResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string};
