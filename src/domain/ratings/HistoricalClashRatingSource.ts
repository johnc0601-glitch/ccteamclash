import type {ResultContest, ResultContestOutcome, ResultContestPlayer} from '@/domain/results/MatchResult';
import {historicalSide, isHistoricalRatedEvent} from '@/domain/ratings/HistoricalClashSchedule';

export type HistoricalMatchupRow = {
  deduplicationKey: string;
  seasonId: string;
  eventLabel: string;
  eventOrder: number;
  matchFormat: 'Singles' | 'Doubles';
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
  outcome: ResultContestOutcome;
};

export type HistoricalRatedEvent = {
  seasonId: string;
  eventLabel: string;
  eventOrder: number;
  eventKey: string;
  contests: ResultContest[];
};

export function buildHistoricalRatedEvents(rows: HistoricalMatchupRow[]): HistoricalRatedEvent[] {
  const ratedRows = rows.filter((row) => isHistoricalRatedEvent(row.seasonId, row.eventLabel));
  const byEvent = new Map<string, HistoricalMatchupRow[]>();
  for (const row of ratedRows) {
    const key = `${row.seasonId}:${row.eventOrder}:${row.eventLabel}`;
    const eventRows = byEvent.get(key) ?? [];
    eventRows.push(row);
    byEvent.set(key, eventRows);
  }

  return [...byEvent.values()]
    .map((eventRows) => {
      const first = eventRows[0];
      const contests = new Map<string, ResultContest>();
      for (const row of eventRows) {
        const contestKey = historicalContestKey(row);
        if (!contests.has(contestKey)) contests.set(contestKey, toHistoricalContest(row, contestKey));
      }
      return {
        seasonId: first.seasonId,
        eventLabel: first.eventLabel,
        eventOrder: first.eventOrder,
        eventKey: `historical:${first.seasonId}:${first.eventOrder}`,
        contests: [...contests.values()],
      };
    })
    .sort((left, right) => left.seasonId.localeCompare(right.seasonId) || left.eventOrder - right.eventOrder);
}

export function historicalContestKey(row: HistoricalMatchupRow): string {
  const players = row.matchFormat === 'Singles'
    ? [row.playerId, row.opponentOnePlayerId]
    : [row.playerId, requireValue(row.partnerPlayerId, 'partner'), row.opponentOnePlayerId, requireValue(row.opponentTwoPlayerId, 'opponent two')];
  return [row.seasonId, row.eventOrder, row.matchFormat, ...players.sort()].join(':');
}

function toHistoricalContest(row: HistoricalMatchupRow, contestKey: string): ResultContest {
  const side = historicalSide(row.seasonId, row.eventLabel, row.playerTeamName, row.opponentTeamName);
  const opposingSide = side === 'Home' ? 'Away' : 'Home';
  const homeOutcome = side === 'Home' ? row.outcome : oppositeOutcome(row.outcome);
  const awayOutcome = oppositeOutcome(homeOutcome);

  const ownPlayers: ResultContestPlayer[] = [
    historicalPlayer(row.playerId, row.playerName, row.playerTeamId, row.playerTeamName, side, 1),
  ];
  if (row.matchFormat === 'Doubles') {
    ownPlayers.push(historicalPlayer(
      requireValue(row.partnerPlayerId, 'partner'),
      requireValue(row.partnerPlayerName, 'partner name'),
      row.playerTeamId,
      row.playerTeamName,
      side,
      2,
    ));
  }

  const opponentPlayers: ResultContestPlayer[] = [
    historicalPlayer(
      row.opponentOnePlayerId,
      row.opponentOnePlayerName,
      row.opponentTeamId,
      row.opponentTeamName,
      opposingSide,
      1,
    ),
  ];
  if (row.matchFormat === 'Doubles') {
    opponentPlayers.push(historicalPlayer(
      requireValue(row.opponentTwoPlayerId, 'opponent two'),
      requireValue(row.opponentTwoPlayerName, 'opponent two name'),
      row.opponentTeamId,
      row.opponentTeamName,
      opposingSide,
      2,
    ));
  }

  return {
    id: contestKey,
    matchId: `historical:${row.seasonId}:${row.eventOrder}:${normalizeMatchup(row.playerTeamName, row.opponentTeamName)}`,
    format: row.matchFormat,
    position: 1,
    homeOutcome,
    awayOutcome,
    homeScore: null,
    awayScore: null,
    players: [...ownPlayers, ...opponentPlayers],
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
}

function historicalPlayer(
  playerId: string,
  playerName: string,
  teamId: string,
  teamName: string,
  side: 'Home' | 'Away',
  slot: 1 | 2,
): ResultContestPlayer {
  return {playerId, playerName, teamId, teamName, side, slot};
}

function oppositeOutcome(outcome: ResultContestOutcome): ResultContestOutcome {
  if (outcome === 'W') return 'L';
  if (outcome === 'L') return 'W';
  return 'T';
}

function normalizeMatchup(left: string, right: string): string {
  return [left, right]
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    .sort()
    .join('-vs-');
}

function requireValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined || value === '') throw new Error(`Historical ${label} is missing.`);
  return value;
}
