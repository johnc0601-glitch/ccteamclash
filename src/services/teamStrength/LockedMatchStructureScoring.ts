import type {LockedMatchStructure} from '@/domain/match-roster/MatchStructureLock';
import {matchStructureSlotCounts} from '@/domain/match-roster/MatchStructureLock';
import {
  exactAutomaticStructuralPointComponents,
  type StandardSlotProfile,
} from './StructuralScoring';
import type {StructuralPointComponents} from './TeamStrength';

export type LockedStructureScoringAnalysis = {
  homeSlots: StandardSlotProfile;
  awaySlots: StandardSlotProfile;
  completeSinglesMatchups: number;
  completeDoublesMatchups: number;
  mutualEmptySinglesPositions: number[];
  mutualEmptyDoublesPositions: number[];
  /**
   * Exact automatic points only when every missing standard slot has an
   * opponent-side assignment. Mutual vacancies are surfaced as ambiguous
   * instead of manufacturing points for both teams.
   */
  automaticPoints?: {
    home: StructuralPointComponents;
    away: StructuralPointComponents;
  };
};

export function analyzeLockedMatchStructure(
  structure: LockedMatchStructure,
): LockedStructureScoringAnalysis {
  const homeSlots = matchStructureSlotCounts(structure, 'Home');
  const awaySlots = matchStructureSlotCounts(structure, 'Away');
  const mutualEmptySinglesPositions = structure.singles
    .filter((slot) => !slot.homePlayerId && !slot.awayPlayerId)
    .map((slot) => slot.position);
  const mutualEmptyDoublesPositions = structure.doubles
    .filter((slot) =>
      slot.homePlayerIds.every((playerId) => !playerId)
      && slot.awayPlayerIds.every((playerId) => !playerId),
    )
    .map((slot) => slot.position);
  const completeSinglesMatchups = structure.singles.filter(
    (slot) => Boolean(slot.homePlayerId && slot.awayPlayerId),
  ).length;
  const completeDoublesMatchups = structure.doubles.filter(
    (slot) =>
      slot.homePlayerIds.every(Boolean)
      && slot.awayPlayerIds.every(Boolean),
  ).length;

  const hasMutualVacancy =
    mutualEmptySinglesPositions.length > 0
    || mutualEmptyDoublesPositions.length > 0;
  const automaticPoints = hasMutualVacancy
    ? undefined
    : exactAutomaticStructuralPointComponents(homeSlots, awaySlots);

  return {
    homeSlots,
    awaySlots,
    completeSinglesMatchups,
    completeDoublesMatchups,
    mutualEmptySinglesPositions,
    mutualEmptyDoublesPositions,
    automaticPoints: automaticPoints
      ? {home: automaticPoints.team, away: automaticPoints.opponent}
      : undefined,
  };
}
