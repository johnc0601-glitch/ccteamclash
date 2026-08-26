import type {PlayerMatchHistoryEntry} from '@/services/statistics';

export type HistoricalPlayerMatchup = {
  deduplicationKey: string;
  seasonId: string;
  seasonName: string;
  eventLabel: string;
  eventMonth: string;
  eventOrder: number;
  format: 'Singles' | 'Doubles';
  playerId: string;
  playerName: string;
  playerTeamId: string;
  playerTeamName: string;
  partnerPlayerId: string | null;
  partnerPlayerName: string | null;
  opponentOnePlayerId: string;
  opponentOnePlayerName: string;
  opponentTwoPlayerId: string | null;
  opponentTwoPlayerName: string | null;
  opponentTeamId: string;
  opponentTeamName: string;
  outcome: 'W' | 'L' | 'T';
  rawResult: string | null;
  rawScore: string | null;
  sourceWorkbook: string;
  sourceSheet: string;
  sourceRow: number;
  historicalTeamMatchId?: number | null;
  playerSide?: 'Home' | 'Away' | null;
  homeAwayValidated?: boolean;
};

export type HistoricalPlayerHistoryEntry = PlayerMatchHistoryEntry & {
  seasonName: string;
  opponentTeamName: string;
  eventOrder: number;
};

export function toHistoricalHistoryEntry(row: HistoricalPlayerMatchup): HistoricalPlayerHistoryEntry {
  return {
    id: row.deduplicationKey,
    challengeId: row.eventLabel,
    seasonId: row.seasonId,
    seasonName: row.seasonName,
    date: '',
    teamId: row.playerTeamId,
    opponentTeamId: row.opponentTeamId,
    opponentTeamName: row.opponentTeamName,
    format: row.format,
    outcome: row.outcome === 'W' ? 'Win' : row.outcome === 'L' ? 'Loss' : 'Tie',
    isHome: row.playerSide === 'Home',
    opponentPlayerNames: [row.opponentOnePlayerName, row.opponentTwoPlayerName].filter(
      (name): name is string => Boolean(name),
    ),
    partnerPlayerNames: row.partnerPlayerName ? [row.partnerPlayerName] : [],
    eventOrder: row.eventOrder,
  };
}
