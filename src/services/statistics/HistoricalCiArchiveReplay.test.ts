import assert from 'node:assert/strict';
import test from 'node:test';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {replayHistoricalCiArchive} from './HistoricalCiArchiveReplay';

function rows(seasonId: string, seasonName: string): HistoricalPlayerMatchup[] {
  const base: HistoricalPlayerMatchup = {
    deduplicationKey: `${seasonId}-home`,
    seasonId,
    seasonName,
    eventLabel: 'Round 1',
    eventMonth: 'October',
    eventOrder: 1,
    format: 'Singles',
    playerId: 'home',
    playerName: 'Home Player',
    playerTeamId: 'home-team',
    playerTeamName: 'Home Team',
    partnerPlayerId: null,
    partnerPlayerName: null,
    opponentOnePlayerId: 'away',
    opponentOnePlayerName: 'Away Player',
    opponentTwoPlayerId: null,
    opponentTwoPlayerName: null,
    opponentTeamId: 'away-team',
    opponentTeamName: 'Away Team',
    outcome: 'W',
    rawResult: null,
    rawScore: null,
    sourceWorkbook: 'history.xlsx',
    sourceSheet: 'October',
    sourceRow: 3,
    historicalTeamMatchId: 1,
    playerSide: 'Home',
    homeAwayValidated: true,
  };
  return [
    base,
    {
      ...base,
      deduplicationKey: `${seasonId}-away`,
      playerId: 'away',
      playerName: 'Away Player',
      playerTeamId: 'away-team',
      playerTeamName: 'Away Team',
      opponentOnePlayerId: 'home',
      opponentOnePlayerName: 'Home Player',
      opponentTeamId: 'home-team',
      opponentTeamName: 'Home Team',
      outcome: 'L',
      playerSide: 'Away',
      sourceRow: 4,
    },
  ];
}

test('archive replay carries ending CI into next-season 80/20 reset', () => {
  const result = replayHistoricalCiArchive([
    {
      seasonId: 's1',
      rows: rows('s1', 'Season 1'),
      participants: [
        {playerId: 'home', playerName: 'Home Player', gender: 'Male'},
        {playerId: 'away', playerName: 'Away Player', gender: 'Female'},
      ],
      legacySeeds: [
        {seasonId: 's1', playerName: 'Home Player', rating: 900, source: 'PDGA'},
        {seasonId: 's1', playerName: 'Away Player', rating: 725, source: 'GHOST'},
      ],
    },
    {
      seasonId: 's2',
      rows: rows('s2', 'Season 2'),
      participants: [
        {playerId: 'home', playerName: 'Home Player', gender: 'Male'},
        {playerId: 'away', playerName: 'Away Player', gender: 'Female'},
      ],
      legacySeeds: [
        {seasonId: 's2', playerName: 'Home Player', rating: 950, source: 'PDGA'},
      ],
    },
  ]);

  const first = result.seasons.get('s1');
  const second = result.seasons.get('s2');
  assert.ok(first);
  assert.ok(second);
  assert.equal(first.startingRatings.get('home'), 900);
  assert.equal(first.startingRatings.get('away'), 700);

  const priorHome = first.endingRatings.get('home')!;
  const priorAway = first.endingRatings.get('away')!;
  assert.equal(second.startingRatings.get('home'), Math.round(priorHome * 0.8 + 950 * 0.2));
  assert.equal(second.startingRatings.get('away'), priorAway);
  assert.equal(result.ledger.length, 4);
  assert.equal(new Set(result.ledger.map((row) => row.matchup_deduplication_key)).size, 4);
});
