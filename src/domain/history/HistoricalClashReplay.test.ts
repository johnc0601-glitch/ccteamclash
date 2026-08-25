import assert from 'node:assert/strict';
import test from 'node:test';
import type {HistoricalPlayerMatchup} from './HistoricalPlayerMatchup';
import {historicalMatchKey, replayHistoricalClashSeason} from './HistoricalClashReplay';

function row(overrides: Partial<HistoricalPlayerMatchup>): HistoricalPlayerMatchup {
  return {
    deduplicationKey: 'row',
    seasonId: 'season-1',
    seasonName: 'Season 1',
    eventLabel: 'Round 1',
    eventMonth: 'October',
    eventOrder: 1,
    format: 'Singles',
    playerId: 'home',
    playerName: 'Home Player',
    playerTeamId: 'team-home',
    playerTeamName: 'Home Team',
    partnerPlayerId: null,
    partnerPlayerName: null,
    opponentOnePlayerId: 'away',
    opponentOnePlayerName: 'Away Player',
    opponentTwoPlayerId: null,
    opponentTwoPlayerName: null,
    opponentTeamId: 'team-away',
    opponentTeamName: 'Away Team',
    outcome: 'W',
    rawResult: null,
    rawScore: null,
    sourceWorkbook: 'test.xlsx',
    sourceSheet: 'Round 1',
    sourceRow: 1,
    historicalTeamMatchId: 10,
    playerSide: 'Home',
    homeAwayValidated: true,
    ...overrides,
  };
}

function mirroredSingles(): HistoricalPlayerMatchup[] {
  return [
    row({deduplicationKey: 'home', playerId: 'home', opponentOnePlayerId: 'away', outcome: 'W', playerSide: 'Home'}),
    row({
      deduplicationKey: 'away',
      playerId: 'away',
      playerName: 'Away Player',
      playerTeamId: 'team-away',
      playerTeamName: 'Away Team',
      opponentOnePlayerId: 'home',
      opponentOnePlayerName: 'Home Player',
      opponentTeamId: 'team-home',
      opponentTeamName: 'Home Team',
      outcome: 'L',
      playerSide: 'Away',
      sourceRow: 2,
    }),
  ];
}

test('replay creates equal and opposite singles facts from the frozen match snapshot', () => {
  const result = replayHistoricalClashSeason(mirroredSingles(), new Map([['home', 900], ['away', 900]]));
  assert.equal(result.facts.length, 2);
  assert.equal(result.unresolvedRows.length, 0);
  assert.equal(result.facts[0].clashIndexBefore, 900);
  assert.equal(result.facts[1].clashIndexBefore, 900);
  assert.equal(result.facts[0].ciDelta, -result.facts[1].ciDelta);
  assert.equal(result.endingRatings.get('home'), 900 + result.facts[0].ciDelta);
  assert.equal(result.endingRatings.get('away'), 900 + result.facts[1].ciDelta);
});

test('neutral historical match removes singles home advantage', () => {
  const rows = mirroredSingles();
  const regular = replayHistoricalClashSeason(rows, new Map([['home', 900], ['away', 900]]));
  const neutral = replayHistoricalClashSeason(
    rows,
    new Map([['home', 900], ['away', 900]]),
    new Map([[10, 'Neutral']]),
  );

  assert.equal(regular.facts[0].venue, 'Home');
  assert.equal(neutral.facts[0].venue, 'Neutral');
  assert.equal(neutral.facts[0].side, null);
  assert.equal(neutral.facts[0].winProbability, 0.5);
  assert.notEqual(regular.facts[0].winProbability, neutral.facts[0].winProbability);
});

test('playoff rows without archived team-match id replay as neutral synthetic match', () => {
  const rows = mirroredSingles().map((entry, index) => row({
    ...entry,
    deduplicationKey: `playoff-${index}`,
    eventLabel: 'March Semifinals',
    eventOrder: 6,
    historicalTeamMatchId: null,
    playerSide: null,
    homeAwayValidated: false,
  }));
  const result = replayHistoricalClashSeason(rows, new Map([['home', 900], ['away', 900]]));

  assert.equal(result.unresolvedRows.length, 0);
  assert.equal(result.facts.length, 2);
  assert.equal(result.facts[0].venue, 'Neutral');
  assert.equal(result.facts[0].side, null);
  assert.match(result.facts[0].historicalMatchKey, /^synthetic:/);
  assert.equal(historicalMatchKey(rows[0]), historicalMatchKey(rows[1]));
});

test('regular-season rows without a validated side are quarantined instead of guessed', () => {
  const rows = mirroredSingles().map((entry, index) => row({
    ...entry,
    deduplicationKey: `bad-regular-${index}`,
    eventLabel: 'December',
    eventOrder: 3,
    historicalTeamMatchId: null,
    playerSide: null,
    homeAwayValidated: false,
  }));
  const result = replayHistoricalClashSeason(rows, new Map([['home', 900], ['away', 900]]));

  assert.equal(result.facts.length, 0);
  assert.equal(result.unresolvedRows.length, 2);
  assert.equal(result.endingRatings.get('home'), 900);
  assert.equal(result.endingRatings.get('away'), 900);
});

test('all contests in one team match use the same frozen starting CI', () => {
  const rows = [
    row({deduplicationKey: 'first', playerId: 'home', opponentOnePlayerId: 'away', outcome: 'W', sourceRow: 1}),
    row({deduplicationKey: 'second', playerId: 'home', opponentOnePlayerId: 'away2', outcome: 'L', sourceRow: 2}),
    row({
      deduplicationKey: 'away', playerId: 'away', playerTeamId: 'team-away', playerTeamName: 'Away Team',
      opponentOnePlayerId: 'home', opponentTeamId: 'team-home', opponentTeamName: 'Home Team', outcome: 'L', playerSide: 'Away', sourceRow: 3,
    }),
    row({
      deduplicationKey: 'away2', playerId: 'away2', playerName: 'Away 2', playerTeamId: 'team-away', playerTeamName: 'Away Team',
      opponentOnePlayerId: 'home', opponentTeamId: 'team-home', opponentTeamName: 'Home Team', outcome: 'W', playerSide: 'Away', sourceRow: 4,
    }),
  ];

  const result = replayHistoricalClashSeason(rows, new Map([['home', 900], ['away', 900], ['away2', 900]]));
  const homeFacts = result.facts.filter((fact) => fact.playerId === 'home');
  assert.equal(homeFacts.length, 2);
  assert.equal(homeFacts[0].clashIndexBefore, 900);
  assert.equal(homeFacts[1].clashIndexBefore, 900);
  assert.equal(result.endingRatings.get('home'), 900 + homeFacts[0].ciDelta + homeFacts[1].ciDelta);
});
