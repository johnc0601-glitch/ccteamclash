import type {MatchResult, ResultContest, ResultContestInput} from '@/domain/results/MatchResult';

export interface ResultsRepository {
  getAll(): Promise<MatchResult[]>;
  getByMatchId(matchId: string): Promise<MatchResult | undefined>;
  save(result: MatchResult): Promise<MatchResult>;
  getContests(matchId: string): Promise<ResultContest[]>;
  replaceContests(matchId: string, contests: ResultContestInput[]): Promise<ResultContest[]>;
}
