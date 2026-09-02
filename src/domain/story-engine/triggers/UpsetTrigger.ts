import type {RatedResult} from '../RatedResult';
import type {StoryCandidateDraft} from '../StoryCandidate';

export const UPSET_WIN_PROBABILITY_THRESHOLD = 0.40;
export const ESTABLISHED_RATING_PRIOR_RESULTS = 3;

export type RatingEvidence = 'Established' | 'TrustedSeed' | 'Provisional';
export type UpsetStatusConfidence = 'ConfirmedByRatings' | 'Likely' | 'NeedsReview';
export type ProbabilityConfidence = 'High' | 'Medium' | 'Low';

export type UpsetRatingEvidence = {
  classification: RatingEvidence;
  subjectEvidence: RatingEvidence;
  opponentEvidence: RatingEvidence;
  subjectPriorRatedResults: number;
  opponentPriorRatedResults: number;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function evidenceRank(value: RatingEvidence): number {
  return value === 'Established' ? 2 : value === 'TrustedSeed' ? 1 : 0;
}

function weakestEvidence(values: RatingEvidence[]): RatingEvidence {
  if (values.length === 0) return 'Provisional';
  return values.reduce((weakest, value) => evidenceRank(value) < evidenceRank(weakest) ? value : weakest, 'Established' as RatingEvidence);
}

function priorRatedResults(results: RatedResult[], playerId: string, before: RatedResult): number {
  return results.filter((result) =>
    result.playedAt < before.playedAt
    && result.ciHistoryReliable !== false
    && result.subjectPlayerIds.includes(playerId),
  ).length;
}

function playerEvidence(
  results: RatedResult[],
  result: RatedResult,
  playerId: string,
): {evidence: RatingEvidence; priorResults: number} {
  const index = result.subjectPlayerIds.indexOf(playerId);
  if (index < 0) return {evidence: 'Provisional', priorResults: 0};
  const priorResults = priorRatedResults(results, playerId, result);
  if (priorResults >= ESTABLISHED_RATING_PRIOR_RESULTS) {
    return {evidence: 'Established', priorResults};
  }
  const seedSource = result.subjectRatingSeedSources?.[index]?.trim().toLocaleUpperCase();
  if (seedSource === 'PDGA') return {evidence: 'TrustedSeed', priorResults};
  return {evidence: 'Provisional', priorResults};
}

function sideEvidence(
  results: RatedResult[],
  result: RatedResult,
): {evidence: RatingEvidence; priorResults: number} {
  const players = result.subjectPlayerIds.map((playerId) => playerEvidence(results, result, playerId));
  return {
    evidence: weakestEvidence(players.map((player) => player.evidence)),
    priorResults: players.length === 0 ? 0 : Math.min(...players.map((player) => player.priorResults)),
  };
}

/**
 * Rates how trustworthy the exact pre-match probability is. Three prior rated
 * contests establish CI regardless of seed source. Before that point a
 * PDGA-backed seed is trusted but immature, while ghost/manual/unknown seeds
 * require editorial review.
 */
export function upsetRatingEvidence(results: RatedResult[], target: RatedResult): UpsetRatingEvidence {
  const opponent = results.find((result) => result.contestId === target.contestId && result.id !== target.id);
  const subject = sideEvidence(results, target);
  const opposing = opponent
    ? sideEvidence(results, opponent)
    : {evidence: 'Provisional' as RatingEvidence, priorResults: 0};
  const classification = weakestEvidence([subject.evidence, opposing.evidence]);
  return {
    classification,
    subjectEvidence: subject.evidence,
    opponentEvidence: opposing.evidence,
    subjectPriorRatedResults: subject.priorResults,
    opponentPriorRatedResults: opposing.priorResults,
  };
}

function statusConfidence(evidence: RatingEvidence): UpsetStatusConfidence {
  if (evidence === 'Established') return 'ConfirmedByRatings';
  if (evidence === 'TrustedSeed') return 'Likely';
  return 'NeedsReview';
}

function probabilityConfidence(evidence: RatingEvidence): ProbabilityConfidence {
  if (evidence === 'Established') return 'High';
  if (evidence === 'TrustedSeed') return 'Medium';
  return 'Low';
}

/**
 * Converts model surprise into a 0-100 editorial magnitude score.
 * A 40% win chance barely qualifies; a 10% chance or lower is maximum magnitude.
 */
export function upsetMagnitude(winProbability: number): number {
  return clampScore(((UPSET_WIN_PROBABILITY_THRESHOLD - winProbability) / 0.30) * 100);
}

/**
 * Detect model-indicated underdog wins from authoritative rated results.
 *
 * Crucially, upset status and exact probability confidence are separate. An
 * immature/ghost-seeded matchup can still be retained for commissioner review
 * as an upset candidate, but Pulse must not present its computed percentage as
 * a verified headline statistic. Only established CI may use the exact model
 * probability as a public headline fact.
 */
export function detectUpsets(results: RatedResult[]): StoryCandidateDraft[] {
  return results
    .filter((result) => result.won && result.winProbability < UPSET_WIN_PROBABILITY_THRESHOLD)
    .map((result) => ({result, evidence: upsetRatingEvidence(results, result)}))
    .map(({result, evidence}) => {
      const rawMagnitude = upsetMagnitude(result.winProbability);
      const magnitude = evidence.classification === 'Established'
        ? rawMagnitude
        : evidence.classification === 'TrustedSeed'
          ? Math.min(60, rawMagnitude)
          : Math.min(35, rawMagnitude);
      const upsetConfidence = statusConfidence(evidence.classification);
      const exactProbabilityConfidence = probabilityConfidence(evidence.classification);
      return {
        id: `upset:${result.id}`,
        triggerType: 'UPSET' as const,
        seasonId: result.seasonId,
        eventId: result.eventId,
        matchId: result.matchId,
        playerIds: [...result.subjectPlayerIds],
        teamIds: [result.teamId, result.opponentTeamId],
        headlineFacts: {
          resultId: result.id,
          format: result.format,
          winner: result.subjectNames.join(' & '),
          team: result.teamName,
          opponentTeam: result.opponentTeamName,
          // Exact percentages are headline-safe only when both ratings are established.
          winProbability: exactProbabilityConfidence === 'High' ? result.winProbability : null,
          ciDeficit: result.ciDeficit,
          ciDelta: result.ciDelta,
          upsetConfidence,
          probabilityConfidence: exactProbabilityConfidence,
        },
        contextFacts: {
          modelVersion: result.modelVersion,
          playedAt: result.playedAt,
          modelWinProbability: result.winProbability,
          ratingEvidence: evidence.classification,
          subjectRatingEvidence: evidence.subjectEvidence,
          opponentRatingEvidence: evidence.opponentEvidence,
          subjectPriorRatedResults: evidence.subjectPriorRatedResults,
          opponentPriorRatedResults: evidence.opponentPriorRatedResults,
          editorialReviewRequired: evidence.classification === 'Provisional',
          editorialConfidenceCap: evidence.classification === 'Established'
            ? null
            : evidence.classification === 'TrustedSeed'
              ? 'avoid-exact-probability-until-established'
              : 'review-upset-status-and-avoid-exact-probability',
        },
        scores: {
          magnitude,
          rarity: 0,
          historicalSignificance: 0,
          recency: 100,
          standingsSignificance: 0,
          opponentQuality: 0,
        },
      };
    });
}
