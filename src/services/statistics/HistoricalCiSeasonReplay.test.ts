import assert from 'node:assert/strict';
import test from 'node:test';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {replayHistoricalCiSeason} from './HistoricalCiSeasonReplay';

function row(overrides: Partial<HistoricalPlayerMatchup> = {}): HistoricalPlayerMatchup {
  return {
    deduplicationKey: 'home-row',
    seasonId: 'season-2',
    seasonName: 'Season 2',
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
    ...overrides,
  };
}

function rows(): HistoricalPlayerMatchup[] {
  return [
    row(),
    row({
      deduplicationKey: 'away-row',
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
    }),
  ];
}

test('new historical players seed from PDGA or provisional baseline', () => {
  const result = replayHistoricalCiSeason({
    rows: rows(),
    players: [
      {playerId: 'home', pdgaRating: 930, division: 'Open'},
      {playerId: 'away', pdgaRating: null, division: 'Women'},
    ],
  });

  assert.equal(result.startingRatings.get('home'), 930);
  assert.equal(result.startingRatings.get('away'), 700);
});

test('returning historical players use 80/20 reset without adding it to CI gain', () => {
  const result = replayHistoricalCiSeason({
    rows: rows(),
    players: [
      {playerId: 'home', pdgaRating: 950, division: 'Open'},
      {playerId: 'away', pdgaRating: null, division: 'Open'},
    ],
    priorEndingRatings: new Map([
      ['home', 900],
      ['away', 875],
    ]),
  });

  assert.equal(result.startingRatings.get('home'), 910);
  assert.equal(result.startingRatings.get('away'), 875);
  assert.equal(
    result.endingRatings.get('home'),
    910 + (result.seasonGain.get('home') ?? 0),
  );
  assert.equal(
    result.endingRatings.get('away'),
    875 + (result.seasonGain.get('away') ?? 0),
  );
});
