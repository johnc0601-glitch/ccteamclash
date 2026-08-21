import assert from 'node:assert/strict';
import test from 'node:test';
import {buildHistoricalRatedEvents, historicalContestKey, type HistoricalMatchupRow} from '@/domain/ratings/HistoricalClashRatingSource';
import {historicalSide, isHistoricalRatedEvent} from '@/domain/ratings/HistoricalClashSchedule';

test('historical schedule resolves the correct home side and excludes playoffs', () => {
  assert.equal(historicalSide('coastal-clash-2024-2025', 'November', 'Wild Turkey', 'Dark Knights'), 'Home');
  assert.equal(historicalSide('coastal-clash-2025-2026', 'October', 'Riptide', 'Cougar Country'), 'Away');
  assert.equal(isHistoricalRatedEvent('coastal-clash-2025-2026', 'March Semifinals'), false);
});

test('historical singles mirror rows collapse into one contest with correct home outcome', () => {
  const away = row({
    deduplicationKey: 'away-row',
    playerId: 'dark-player',
    playerName: 'Dark Player',
    playerTeamId: 'dark-knights',
    playerTeamName: 'Dark Knights',
    opponentOnePlayerId: 'turkey-player',
    opponentOnePlayerName: 'Turkey Player',
    opponentTeamId: 'wild-turkey',
    opponentTeamName: 'Wild Turkey',
    outcome: 'W',
  });
  const home = row({
    deduplicationKey: 'home-row',
    playerId: 'turkey-player',
    playerName: 'Turkey Player',
    playerTeamId: 'wild-turkey',
    playerTeamName: 'Wild Turkey',
    opponentOnePlayerId: 'dark-player',
    opponentOnePlayerName: 'Dark Player',
    opponentTeamId: 'dark-knights',
    opponentTeamName: 'Dark Knights',
    outcome: 'L',
  });

  assert.equal(historicalContestKey(away), historicalContestKey(home));
  const [event] = buildHistoricalRatedEvents([away, home]);
  assert.equal(event.contests.length, 1);
  assert.equal(event.contests[0].homeOutcome, 'L');
  assert.equal(event.contests[0].awayOutcome, 'W');
  assert.equal(event.contests[0].players.find((player) => player.playerId === 'turkey-player')?.side, 'Home');
});

function row(overrides: Partial<HistoricalMatchupRow>): HistoricalMatchupRow {
  return {
    deduplicationKey: 'row',
    seasonId: 'coastal-clash-2024-2025',
    eventLabel: 'November',
    eventOrder: 2,
    matchFormat: 'Singles',
    playerId: 'dark-player',
    playerName: 'Dark Player',
    playerTeamId: 'dark-knights',
    playerTeamName: 'Dark Knights',
    partnerPlayerId: null,
    partnerPlayerName: null,
    opponentOnePlayerId: 'turkey-player',
    opponentOnePlayerName: 'Turkey Player',
    opponentTwoPlayerId: null,
    opponentTwoPlayerName: null,
    opponentTeamId: 'wild-turkey',
    opponentTeamName: 'Wild Turkey',
    outcome: 'W',
    ...overrides,
  };
}
