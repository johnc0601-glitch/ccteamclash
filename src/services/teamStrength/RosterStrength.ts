import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import {clashSeasonStartCi} from '@/domain/story-engine/ClashSeasonReset';

import {
  calculateActiveRosterStrength,
  TEAM_STRENGTH_VERSION,
  type ActiveRosterStrengthBreakdown,
  type TeamStrengthConfidence,
} from './TeamStrength';

export const TEAM_STRENGTH_STAGE_LABELS = {
  activeRoster: 'Active Roster Strength',
  confirmedAvailableRoster: 'Confirmed Available Roster Strength',
  matchLineup: 'Match Lineup Strength',
} as const;

export type TeamStrengthSource = keyof typeof TEAM_STRENGTH_STAGE_LABELS;

export type RosterStrengthResult = Omit<ActiveRosterStrengthBreakdown, 'confidence'> & {
  version: typeof TEAM_STRENGTH_VERSION;
  source: TeamStrengthSource;
  label: (typeof TEAM_STRENGTH_STAGE_LABELS)[TeamStrengthSource];
  confidence: TeamStrengthConfidence;
  rosterPlayerCount: number;
  measuredPlayerCount: number;
  provisionalPlayerCount: number;
  fallbackPlayerCount: number;
  omittedPlayerCount: number;
  playerIds: string[];
};

type ResolvedPlayerCi = {
  playerId: string;
  ci: number;
  provisional: boolean;
  fallback: boolean;
};

/**
 * Active Roster Strength from the current active season roster.
 *
 * Missing CI values are never silently dropped. A player with no current CI
 * uses the same new-player seed rule as the Clash season reset: PDGA when
 * available, otherwise Open 825 / Women 700. Unknown-gender players without a
 * CI cannot be resolved safely and are counted as omitted, which lowers
 * confidence.
 */
export function calculateActiveRosterStrengthFromPlayers(
  players: readonly LaunchPlayer[],
): RosterStrengthResult | undefined {
  const activePlayerIds = players
    .filter((player) => player.active)
    .map((player) => player.id);

  return calculateRosterStageStrength(
    'activeRoster',
    players,
    activePlayerIds,
  );
}

/**
 * Confirmed Available Roster Strength includes only explicit Playing responses.
 * Unconfirmed and NotPlaying members are intentionally excluded.
 */
export function calculateConfirmedAvailableRosterStrength(
  players: readonly LaunchPlayer[],
  attendance: readonly TeamAttendanceMember[],
): RosterStrengthResult | undefined {
  const playingPlayerIds = attendance
    .filter((member) => member.status === 'Playing')
    .map((member) => member.playerId);

  return calculateRosterStageStrength(
    'confirmedAvailableRoster',
    players,
    playingPlayerIds,
  );
}

/**
 * Match Lineup Strength uses the immutable player ids stored in the official
 * roster snapshot rather than matching on player names.
 */
export function calculateMatchLineupStrength(
  players: readonly LaunchPlayer[],
  officialRoster: OfficialMatchRoster,
): RosterStrengthResult | undefined {
  return calculateRosterStageStrength(
    'matchLineup',
    players,
    officialRoster.players.map((player) => player.playerId),
  );
}

export function calculateRosterStageStrength(
  source: TeamStrengthSource,
  players: readonly LaunchPlayer[],
  selectedPlayerIds: readonly string[],
): RosterStrengthResult | undefined {
  const uniquePlayerIds = [...new Set(selectedPlayerIds)];
  if (!uniquePlayerIds.length) return undefined;

  const playersById = new Map(players.map((player) => [player.id, player]));
  const resolved: ResolvedPlayerCi[] = [];
  let omittedPlayerCount = 0;

  for (const playerId of uniquePlayerIds) {
    const player = playersById.get(playerId);
    const playerCi = player ? resolvePlayerCi(player) : undefined;

    if (!playerCi) {
      omittedPlayerCount += 1;
      continue;
    }

    resolved.push(playerCi);
  }

  const base = calculateActiveRosterStrength(resolved.map((player) => player.ci));
  if (!base) return undefined;

  const provisionalPlayerCount = resolved.filter((player) => player.provisional).length;
  const fallbackPlayerCount = resolved.filter((player) => player.fallback).length;
  const measuredPlayerCount = resolved.length - provisionalPlayerCount;
  const confidence = dataAwareConfidence(
    base.confidence,
    provisionalPlayerCount,
    omittedPlayerCount,
  );

  return {
    ...base,
    source,
    label: TEAM_STRENGTH_STAGE_LABELS[source],
    confidence,
    rosterPlayerCount: uniquePlayerIds.length,
    measuredPlayerCount,
    provisionalPlayerCount,
    fallbackPlayerCount,
    omittedPlayerCount,
    playerIds: resolved.map((player) => player.playerId),
  };
}

function resolvePlayerCi(player: LaunchPlayer): ResolvedPlayerCi | undefined {
  if (isValidRating(player.clashIndex)) {
    return {
      playerId: player.id,
      ci: player.clashIndex,
      provisional: player.clashIndexProvisional === true,
      fallback: false,
    };
  }

  if (player.gender === 'Unknown') return undefined;

  const pdgaRating = isValidRating(player.pdgaRating) ? player.pdgaRating : null;
  const ci = clashSeasonStartCi({
    priorClashIndex: null,
    pdgaRating,
    division: player.gender === 'Female' ? 'Women' : 'Open',
  });

  return {
    playerId: player.id,
    ci,
    provisional: true,
    fallback: true,
  };
}

function dataAwareConfidence(
  rosterConfidence: TeamStrengthConfidence,
  provisionalPlayerCount: number,
  omittedPlayerCount: number,
): TeamStrengthConfidence {
  if (rosterConfidence === 'Low' || omittedPlayerCount > 0) return 'Low';
  if (rosterConfidence === 'Partial' || provisionalPlayerCount > 0) return 'Partial';
  return 'Full';
}

function isValidRating(value: number | null | undefined): value is number {
  return Number.isFinite(value) && (value ?? 0) > 0;
}
