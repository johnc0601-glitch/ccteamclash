import type {ContestRatingFact} from './ContestRatingFact';
import type {MatchRatingSnapshot} from './MatchRatingSnapshot';

export type PlayerCiUpdate = {
  playerId: string;
  clashIndexBefore: number;
  totalDelta: number;
  clashIndexAfter: number;
};

export type RatingPublicationPlan = {
  matchId: string;
  snapshots: MatchRatingSnapshot[];
  facts: ContestRatingFact[];
  playerUpdates: PlayerCiUpdate[];
  algorithmVersion: string;
};

/**
 * Final pure checkpoint before persistence. All contests in the team match have
 * already been calculated from one frozen snapshot. Only after this plan is
 * valid should a database transaction insert snapshots/facts and update CI.
 */
export function buildRatingPublicationPlan(input: {
  matchId: string;
  snapshots: MatchRatingSnapshot[];
  facts: ContestRatingFact[];
}): RatingPublicationPlan {
  const {matchId, snapshots, facts} = input;
  if (snapshots.length === 0) throw new Error('Cannot publish CI without rating snapshots');
  if (facts.length === 0) throw new Error('Cannot publish CI without rating facts');

  const versions = new Set([...snapshots.map((row) => row.algorithmVersion), ...facts.map((row) => row.algorithmVersion)]);
  if (versions.size !== 1) throw new Error('CI publication contains mixed model versions');
  if (snapshots.some((row) => row.matchId !== matchId) || facts.some((row) => row.matchId !== matchId)) {
    throw new Error('CI publication contains rows from another match');
  }

  const snapshotByPlayer = new Map(snapshots.map((row) => [row.playerId, row]));
  const deltas = new Map<string, number>();
  for (const fact of facts) {
    const snapshot = snapshotByPlayer.get(fact.playerId);
    if (!snapshot) throw new Error(`Missing CI snapshot for player ${fact.playerId}`);
    if (fact.clashIndexBefore !== snapshot.clashIndexBefore) {
      throw new Error(`Rating fact for ${fact.playerId} was not calculated from the frozen match CI`);
    }
    deltas.set(fact.playerId, (deltas.get(fact.playerId) ?? 0) + fact.ciDelta);
  }

  const playerUpdates = [...deltas.entries()].map(([playerId, totalDelta]) => {
    const snapshot = snapshotByPlayer.get(playerId)!;
    return {
      playerId,
      clashIndexBefore: snapshot.clashIndexBefore,
      totalDelta,
      clashIndexAfter: snapshot.clashIndexBefore + totalDelta,
    };
  });

  return {
    matchId,
    snapshots: [...snapshots],
    facts: [...facts],
    playerUpdates,
    algorithmVersion: [...versions][0],
  };
}
