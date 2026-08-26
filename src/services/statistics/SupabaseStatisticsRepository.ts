import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import type {StatisticsRepository} from '@/services/statistics/StatisticsRepository';
import type {
  ChallengeResult,
  PlayerResult,
  PlayerResultOutcome,
} from '@/services/statistics/StatisticsTypes';

type Client = SupabaseClient<Database>;
type ClashRatingFact = {
  contest_id: string;
  match_id: string;
  player_id: string;
  ci_delta: number;
};

export class SupabaseStatisticsRepository implements StatisticsRepository {
  constructor(private readonly supabase: Client) {}

  async getPublishedChallengeResults(): Promise<ChallengeResult[]> {
    const {data: results, error: resultError} = await this.supabase
      .from('launch_match_results')
      .select('*')
      .eq('status', 'Published');
    if (resultError) throw resultError;
    if (!results.length) return [];

    const matchIds = results.map((result) => result.match_id);
    const ratingClient = this.supabase as unknown as SupabaseClient;
    const [
      {data: matches, error: matchError},
      {data: contests, error: contestError},
      {data: ratingFactsData, error: ratingFactsError},
    ] = await Promise.all([
      this.supabase.from('launch_schedule_matches').select('*').in('id', matchIds),
      this.supabase.from('launch_result_contests').select('*').in('match_id', matchIds),
      ratingClient
        .from('clash_contest_rating_facts')
        .select('contest_id,match_id,player_id,ci_delta')
        .in('match_id', matchIds),
    ]);
    if (matchError) throw matchError;
    if (contestError) throw contestError;
    if (ratingFactsError) throw ratingFactsError;
    const ratingFacts = (ratingFactsData ?? []) as ClashRatingFact[];
    const ciDeltaByContestPlayer = new Map(
      ratingFacts.map((fact) => [`${fact.contest_id}:${fact.player_id}`, fact.ci_delta]),
    );

    const contestIds = contests.map((contest) => contest.id);
    const {data: players, error: playerError} = contestIds.length
      ? await this.supabase
        .from('launch_result_contest_players')
        .select('*')
        .in('contest_id', contestIds)
      : {data: [], error: null};
    if (playerError) throw playerError;

    const matchesById = new Map(matches.map((match) => [match.id, match]));
    return results.flatMap((result): ChallengeResult[] => {
      const match = matchesById.get(result.match_id);
      if (!match?.home_team_id || !match.away_team_id
        || result.home_score === null || result.away_score === null || !result.published_at) return [];
      const matchContests = contests.filter((contest) => contest.match_id === result.match_id);
      return [{
        id: `${result.match_id}-result`,
        seasonId: match.season_id,
        challengeId: result.match_id,
        date: match.date ?? '',
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeScore: result.home_score,
        awayScore: result.away_score,
        status: 'Published',
        publishedAt: result.published_at,
        playerResults: matchContests.flatMap((contest) => players
          .filter((player) => player.contest_id === contest.id)
          .map((player): PlayerResult => {
            const home = player.side === 'Home';
            const outcome = toOutcome(home ? contest.home_outcome : contest.away_outcome);
            const ciDelta = ciDeltaByContestPlayer.get(`${contest.id}:${player.player_id}`);
            return {
              id: `${contest.id}:${player.side}:${player.slot}`,
              contestId: contest.id,
              playerId: player.player_id,
              playerName: player.player_name,
              teamId: player.team_id,
              format: contest.format as PlayerResult['format'],
              outcome,
              pointsEarned: pointsEarned(contest.format, outcome),
              ...(ciDelta === undefined ? {} : {ciDelta}),
              ...(contest.format === 'Singles'
                ? {score: home ? contest.home_score ?? undefined : contest.away_score ?? undefined}
                : {}),
            };
          })),
      }];
    });
  }
}

function toOutcome(value: string): PlayerResultOutcome {
  return value === 'W' ? 'Win' : value === 'L' ? 'Loss' : 'Tie';
}

function pointsEarned(format: string, outcome: PlayerResultOutcome): number {
  if (outcome === 'Loss') return 0;
  const winPoints = format === 'Doubles' ? 2 : 1;
  return outcome === 'Win' ? winPoints : winPoints / 2;
}
