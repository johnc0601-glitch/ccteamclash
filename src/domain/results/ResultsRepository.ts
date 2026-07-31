import type {MatchResult, ResultContest, ResultContestInput} from '@/domain/results/MatchResult';

export interface ResultsRepository {
  getAll(): Promise<MatchResult[]>;
  getByMatchId(matchId: string): Promise<MatchResult | undefined>;
  save(result: MatchResult): Promise<MatchResult>;
  getContests(matchId: string): Promise<ResultContest[]>;
  replaceContests(matchId: string, contests: ResultContestInput[]): Promise<ResultContest[]>;
}

export class MockResultsRepository implements ResultsRepository {
  private results: MatchResult[] = [];
  private contests = new Map<string, ResultContest[]>();

  async getAll(): Promise<MatchResult[]> {
    return this.results.map((result) => ({...result}));
  }

  async getByMatchId(matchId: string): Promise<MatchResult | undefined> {
    const result = this.results.find((candidate) => candidate.matchId === matchId);
    return result ? {...result} : undefined;
  }

  async save(result: MatchResult): Promise<MatchResult> {
    const index = this.results.findIndex((candidate) => candidate.matchId === result.matchId);
    if (index === -1) this.results.push({...result});
    else this.results[index] = {...result};
    return {...result};
  }

  async getContests(matchId: string): Promise<ResultContest[]> {
    return (this.contests.get(matchId) ?? []).map(cloneContest);
  }

  async replaceContests(matchId: string, contests: ResultContestInput[]): Promise<ResultContest[]> {
    const now = new Date().toISOString();
    const existing = new Map((this.contests.get(matchId) ?? []).map((contest) => [contest.id, contest]));
    const stored = contests.map((contest): ResultContest => ({
      ...contest,
      matchId,
      players: contest.players.map((player) => ({
        ...player,
        playerName: player.playerId,
        teamName: player.teamId,
      })),
      createdAt: existing.get(contest.id)?.createdAt ?? now,
      updatedAt: now,
    }));
    this.contests.set(matchId, stored);
    return stored.map(cloneContest);
  }
}

function cloneContest(contest: ResultContest): ResultContest {
  return {...contest, players: contest.players.map((player) => ({...player}))};
}
