import assert from 'node:assert/strict';
import test from 'node:test';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {InMemoryHistoricalPlayerMatchupRepository} from '@/domain/history/HistoricalPlayerMatchupRepository';
import {PlayerMatchHistoryService, type CanonicalPlayerHistoryProvider} from './PlayerMatchHistoryService';
import type {PlayerMatchHistoryEntry} from '@/services/statistics';

const canonicalRows: PlayerMatchHistoryEntry[] = [
  history('current-4', 'current', '2026-07-04'), history('current-3', 'current', '2026-07-03'),
  history('current-2', 'current', '2026-07-02'), history('current-1', 'current', '2026-07-01'),
];

class CanonicalProvider implements CanonicalPlayerHistoryProvider {
  async getPlayerMatchHistory(playerId: string): Promise<PlayerMatchHistoryEntry[]> {
    return canonicalRows.filter((entry) => entry.id.includes(playerId) || playerId === 'player-1');
  }

  async getPlayerMatchHistoriesForPlayers(playerIds: string[], limit: number, seasonId?: string) {
    return new Map(playerIds.map((playerId) => [
      playerId,
      canonicalRows.filter((entry) => !seasonId || entry.seasonId === seasonId).slice(0, limit),
    ]));
  }
}

test('complete history combines current season and both historical seasons newest first', async () => {
  const repository = new InMemoryHistoricalPlayerMatchupRepository();
  await repository.upsert([
    historical('old-singles', 'coastal-clash-2024-2025', 2, 'Singles'),
    historical('new-doubles', 'coastal-clash-2025-2026', 6, 'Doubles'),
  ]);
  const service = new PlayerMatchHistoryService(new CanonicalProvider(), repository);
  const rows = await service.getCompleteHistory('player-1');
  assert.deepEqual([...new Set(rows.map((row) => row.seasonId))], [
    'current', 'coastal-clash-2025-2026', 'coastal-clash-2024-2025',
  ]);
  assert.deepEqual(rows.at(-2)?.partnerPlayerNames, ['Partner']);
  assert.deepEqual(rows.at(-2)?.opponentPlayerNames, ['Opponent One', 'Opponent Two']);
});

test('historical records preserve team snapshots and W/L/T without numeric scores', async () => {
  const repository = new InMemoryHistoricalPlayerMatchupRepository();
  await repository.upsert([historical('moved-player', 'coastal-clash-2024-2025', 4, 'Singles')]);
  const row = (await new PlayerMatchHistoryService(new CanonicalProvider(), repository).getCompleteHistory('player-1')).at(-1)!;
  const historicalRow = (await repository.getByPlayerId('player-1'))[0];
  assert.equal(historicalRow.playerTeamName, 'Historical Team');
  assert.equal(historicalRow.opponentTeamName, 'Historical Opponent');
  assert.equal(row.playerScore, undefined);
});

test('historical CI fact attaches earned movement to the matching profile row', async () => {
  const repository = new InMemoryHistoricalPlayerMatchupRepository();
  await repository.upsert([historical('ci-match', 'coastal-clash-2024-2025', 4, 'Singles')]);
  repository.setCiDelta('ci-match', 6);
  const rows = await new PlayerMatchHistoryService(new CanonicalProvider(), repository).getCompleteHistory('player-1');
  const historicalRow = rows.find((row) => row.id === 'ci-match');
  assert.equal(historicalRow?.ciDelta, 6);
});

test('idempotent imports and complete history contain no duplicate rows', async () => {
  const repository = new InMemoryHistoricalPlayerMatchupRepository();
  const row = historical('stable-key', 'coastal-clash-2025-2026', 3, 'Singles');
  await repository.upsert([row]);
  await repository.upsert([row]);
  assert.equal((await repository.getByPlayerId('player-1')).length, 1);
});

test('current season remains active-season-only and limited to three', async () => {
  const service = new PlayerMatchHistoryService(new CanonicalProvider(), new InMemoryHistoricalPlayerMatchupRepository());
  const rows = await service.getCurrentSeasonMatches(['player-1'], 'current');
  assert.deepEqual(rows.get('player-1')?.map((row) => row.id), ['current-4', 'current-3', 'current-2']);
});

function history(id: string, seasonId: string, date: string): PlayerMatchHistoryEntry {
  return {id, challengeId: id, seasonId, date, teamId: 'current-team', opponentTeamId: 'current-opponent', format: 'Singles', outcome: 'Win', isHome: true, opponentPlayerNames: ['Current Opponent'], partnerPlayerNames: []};
}

function historical(
  deduplicationKey: string,
  seasonId: string,
  eventOrder: number,
  format: 'Singles' | 'Doubles',
): HistoricalPlayerMatchup {
  return {
    deduplicationKey, seasonId, seasonName: seasonId, eventLabel: 'Event', eventMonth: 'Month', eventOrder,
    format, playerId: 'player-1', playerName: 'Player', playerTeamId: 'historical-team', playerTeamName: 'Historical Team',
    partnerPlayerId: format === 'Doubles' ? 'partner' : null, partnerPlayerName: format === 'Doubles' ? 'Partner' : null,
    opponentOnePlayerId: 'opponent-1', opponentOnePlayerName: 'Opponent One',
    opponentTwoPlayerId: format === 'Doubles' ? 'opponent-2' : null,
    opponentTwoPlayerName: format === 'Doubles' ? 'Opponent Two' : null,
    opponentTeamId: 'historical-opponent', opponentTeamName: 'Historical Opponent', outcome: 'W', rawResult: 'W',
    rawScore: 'opaque source value', sourceWorkbook: 'book.xlsx', sourceSheet: 'sheet', sourceRow: eventOrder,
  };
}
