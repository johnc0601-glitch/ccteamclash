import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {LockedMatchStructure} from '@/domain/match-roster/MatchStructureLock';
import {clashSeasonStartCi} from '@/domain/story-engine/ClashSeasonReset';
import {analyzeLockedMatchStructure} from './LockedMatchStructureScoring';
import {
  DOUBLES_TEAM_POINTS_PER_CONTEST,
  effectiveDoublesCi,
  expectedContestPointShare,
  regularSeasonChanceOfVictoryFromExpectedPoints,
  STANDARD_MATCH_POINTS,
  TEAM_STRENGTH_VERSION,
  type TeamVenue,
} from './TeamStrength';

export type LockedMatchStructurePrediction = {
  version: typeof TEAM_STRENGTH_VERSION;
  source: 'matchStructureLock';
  venue: TeamVenue;
  confidence: 'Partial' | 'Full';
  homeRatedExpectedPoints: number;
  awayRatedExpectedPoints: number;
  homeAutomaticPoints: number;
  awayAutomaticPoints: number;
  homeExpectedPoints: number;
  awayExpectedPoints: number;
  expectedPointMargin: number;
  homeChanceOfVictory: number;
  awayChanceOfVictory: number;
  completeSinglesMatchups: number;
  completeDoublesMatchups: number;
  standardPointsAccountedFor: number;
  provisionalPlayerCount: number;
};

type ResolvedPlayer = {
  ci: number;
  provisional: boolean;
};

/**
 * Exact regular-season prediction once the pre-match structure itself is locked.
 *
 * At this stage actual Singles opponents and actual Doubles pairs replace the
 * earlier roster/pool approximations. Empty unilateral slots become explicit
 * automatic points. Women bonus points remain outside V1 until that scoring
 * rule is modeled from the actual triggering matchup.
 */
export function calculateLockedMatchStructurePrediction(input: {
  structure: LockedMatchStructure;
  players: readonly LaunchPlayer[];
  venue?: TeamVenue;
}): LockedMatchStructurePrediction | undefined {
  const venue = input.venue ?? 'Neutral';
  const analysis = analyzeLockedMatchStructure(input.structure);
  if (!analysis.automaticPoints) return undefined;

  const playersById = new Map(input.players.map((player) => [player.id, player]));
  const resolvedById = new Map<string, ResolvedPlayer>();
  let provisionalPlayerCount = 0;

  const resolve = (playerId: string): ResolvedPlayer | undefined => {
    const existing = resolvedById.get(playerId);
    if (existing) return existing;
    const player = playersById.get(playerId);
    if (!player) return undefined;
    const resolved = resolvePlayerForPrediction(player);
    if (!resolved) return undefined;
    resolvedById.set(playerId, resolved);
    if (resolved.provisional) provisionalPlayerCount += 1;
    return resolved;
  };

  let homeRatedExpectedPoints = 0;
  let awayRatedExpectedPoints = 0;

  for (const slot of input.structure.singles) {
    if (!slot.homePlayerId || !slot.awayPlayerId) continue;
    const home = resolve(slot.homePlayerId);
    const away = resolve(slot.awayPlayerId);
    if (!home || !away) return undefined;

    const homeShare = expectedContestPointShare(home.ci, away.ci, venue);
    homeRatedExpectedPoints += homeShare;
    awayRatedExpectedPoints += 1 - homeShare;
  }

  for (const slot of input.structure.doubles) {
    const homeIds = slot.homePlayerIds;
    const awayIds = slot.awayPlayerIds;
    if (!homeIds[0] || !homeIds[1] || !awayIds[0] || !awayIds[1]) continue;

    const homeOne = resolve(homeIds[0]);
    const homeTwo = resolve(homeIds[1]);
    const awayOne = resolve(awayIds[0]);
    const awayTwo = resolve(awayIds[1]);
    if (!homeOne || !homeTwo || !awayOne || !awayTwo) return undefined;

    const homePairCi = effectiveDoublesCi(homeOne.ci, homeTwo.ci);
    const awayPairCi = effectiveDoublesCi(awayOne.ci, awayTwo.ci);
    const homeShare = expectedContestPointShare(homePairCi, awayPairCi, venue);
    homeRatedExpectedPoints += homeShare * DOUBLES_TEAM_POINTS_PER_CONTEST;
    awayRatedExpectedPoints += (1 - homeShare) * DOUBLES_TEAM_POINTS_PER_CONTEST;
  }

  const homeAutomaticPoints = analysis.automaticPoints.home.automaticPoints ?? 0;
  const awayAutomaticPoints = analysis.automaticPoints.away.automaticPoints ?? 0;
  const homeExpectedPoints = homeRatedExpectedPoints + homeAutomaticPoints;
  const awayExpectedPoints = awayRatedExpectedPoints + awayAutomaticPoints;
  const standardPointsAccountedFor = homeExpectedPoints + awayExpectedPoints;

  // A valid locked structure must account for every one of the normal 36
  // standard points through either a rated contest or an explicit auto point.
  if (Math.abs(standardPointsAccountedFor - STANDARD_MATCH_POINTS) > 1e-9) {
    return undefined;
  }

  const homeChanceOfVictory = regularSeasonChanceOfVictoryFromExpectedPoints(
    homeExpectedPoints,
    awayExpectedPoints,
  );
  if (homeChanceOfVictory == null) return undefined;

  return {
    version: TEAM_STRENGTH_VERSION,
    source: 'matchStructureLock',
    venue,
    confidence: provisionalPlayerCount > 0 ? 'Partial' : 'Full',
    homeRatedExpectedPoints,
    awayRatedExpectedPoints,
    homeAutomaticPoints,
    awayAutomaticPoints,
    homeExpectedPoints,
    awayExpectedPoints,
    expectedPointMargin: homeExpectedPoints - awayExpectedPoints,
    homeChanceOfVictory,
    awayChanceOfVictory: 1 - homeChanceOfVictory,
    completeSinglesMatchups: analysis.completeSinglesMatchups,
    completeDoublesMatchups: analysis.completeDoublesMatchups,
    standardPointsAccountedFor,
    provisionalPlayerCount,
  };
}

function resolvePlayerForPrediction(player: LaunchPlayer): ResolvedPlayer | undefined {
  if (isValidRating(player.clashIndex)) {
    return {
      ci: player.clashIndex,
      provisional: player.clashIndexProvisional === true,
    };
  }

  if (player.gender === 'Unknown') return undefined;

  const pdgaRating = isValidRating(player.pdgaRating) ? player.pdgaRating : null;
  return {
    ci: clashSeasonStartCi({
      priorClashIndex: null,
      pdgaRating,
      division: player.gender === 'Female' ? 'Women' : 'Open',
    }),
    provisional: true,
  };
}

function isValidRating(value: number | null | undefined): value is number {
  return Number.isFinite(value) && (value ?? 0) > 0;
}
