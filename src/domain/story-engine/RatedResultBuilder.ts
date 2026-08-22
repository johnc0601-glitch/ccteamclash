import type {ResultContest, ResultContestOutcome, ResultContestSide} from '@/domain/results/MatchResult';
import type {ContestRatingFact} from './ContestRatingFact';
import type {RatedResult} from './RatedResult';

export type RatedMatchContext = {
  eventId: string;
  seasonId: string;
  playedAt: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
};

/**
 * Converts persisted contest + immutable rating facts into the one normalized
 * shape consumed by Around the Clash. This is intentionally pure: no Supabase,
 * UI, or rating calculations happen here.
 */
export function buildRatedResults(
  contest: ResultContest,
  facts: ContestRatingFact[],
  context: RatedMatchContext,
): RatedResult[] {
  return (['Home', 'Away'] as const).flatMap((side) => {
    const players = contest.players
      .filter((player) => player.side === side)
      .sort((a, b) => a.slot - b.slot);
    if (players.length === 0) return [];

    const sideFacts = players
      .map((player) => facts.find((fact) => fact.playerId === player.playerId && fact.contestId === contest.id))
      .filter((fact): fact is ContestRatingFact => Boolean(fact));

    // A partially rated side is unsafe for editorial statistics. Leave it out
    // rather than mixing known and invented values.
    if (sideFacts.length !== players.length) return [];

    const representative = sideFacts[0];
    const team = side === 'Home'
      ? {id: context.homeTeamId, name: context.homeTeamName}
      : {id: context.awayTeamId, name: context.awayTeamName};
    const opponent = side === 'Home'
      ? {id: context.awayTeamId, name: context.awayTeamName}
      : {id: context.homeTeamId, name: context.homeTeamName};

    return [{
      id: `${contest.id}:${side.toLowerCase()}`,
      contestId: contest.id,
      matchId: contest.matchId,
      eventId: context.eventId,
      seasonId: context.seasonId,
      format: contest.format,
      side,
      subjectPlayerIds: players.map((player) => player.playerId),
      subjectNames: players.map((player) => player.playerName),
      teamId: team.id,
      teamName: team.name,
      opponentTeamId: opponent.id,
      opponentTeamName: opponent.name,
      outcome: outcomeForSide(contest, side),
      won: outcomeForSide(contest, side) === 'W',
      actualPoints: representative.actualPoints,
      expectedPoints: representative.expectedPoints,
      winProbability: representative.winProbability,
      subjectEffectiveCi: subjectEffectiveCi(sideFacts, contest.format),
      opponentEffectiveCi: representative.opponentEffectiveCi,
      ciDeficit: representative.opponentEffectiveCi - subjectEffectiveCi(sideFacts, contest.format),
      ciDelta: sideFacts.reduce((sum, fact) => sum + fact.ciDelta, 0),
      modelVersion: representative.algorithmVersion,
      playedAt: context.playedAt,
    }];
  });
}

function outcomeForSide(contest: ResultContest, side: ResultContestSide): ResultContestOutcome {
  return side === 'Home' ? contest.homeOutcome : contest.awayOutcome;
}

function subjectEffectiveCi(facts: ContestRatingFact[], format: ResultContest['format']): number {
  if (format === 'Singles') return facts[0].clashIndexBefore;
  const values = facts.map((fact) => fact.clashIndexBefore).sort((a, b) => b - a);
  return values[0] * 0.8 + values[1] * 0.2;
}
