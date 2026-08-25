import assert from 'node:assert/strict';
import test from 'node:test';
import {replayHistoricalCi, HistoricalCiReplayError, type HistoricalReplayRow} from './HistoricalCiReplay';

test('historical replay freezes ratings for an event and applies earned movement afterward', () => {
  const rows: HistoricalReplayRow[] = [
    row('s1-h', 1, 'Singles', 'home-a', 'Home A', 'home', null, 'away-a', null, 'away', 'W', 'Home'),
    row('s1-a', 1, 'Singles', 'away-a', 'Away A', 'away', null, 'home-a', null, 'home', 'L', 'Away'),
    row('d1-h1', 1, 'Doubles', 'home-a', 'Home A', 'home', 'home-b', 'away-a', 'away-b', 'away', 'W', 'Home'),
    row('d1-h2', 1, 'Doubles', 'home-b', 'Home B', 'home', 'home-a', 'away-a', 'away-b', 'away', 'W', 'Home'),
    row('d1-a1', 1, 'Doubles', 'away-a', 'Away A', 'away', 'away-b', 'home-a', 'home-b', 'home', 'L', 'Away'),
    row('d1-a2', 1, 'Doubles', 'away-b', 'Away B', 'away', 'away-a', 'home-a', 'home-b', 'home', 'L', 'Away'),
    row('s2-h', 2, 'Singles', 'home-a', 'Home A', 'home', null, 'away-a', null, 'away', 'L', 'Home'),
    row('s2-a', 2, 'Singles', 'away-a', 'Away A', 'away', null, 'home-a', null, 'home', 'W', 'Away'),
  ];

  const result = replayHistoricalCi(rows, new Map([
    ['home-a', 900], ['home-b', 850], ['away-a', 900], ['away-b', 850],
  ]));

  const firstEventHomeFacts = result.facts.filter((fact) => fact.eventOrder === 1 && fact.playerId === 'home-a');
  assert.equal(firstEventHomeFacts.length, 2);
  assert.equal(firstEventHomeFacts[0]?.clashIndexBefore, 900);
  assert.equal(firstEventHomeFacts[1]?.clashIndexBefore, 900);

  const secondEvent = result.facts.find((fact) => fact.eventOrder === 2 && fact.playerId === 'home-a');
  assert.ok(secondEvent);
  assert.notEqual(secondEvent.clashIndexBefore, 900);

  const homeSummary = result.players.find((player) => player.playerId === 'home-a');
  assert.ok(homeSummary);
  assert.equal(homeSummary.ciGain, homeSummary.endCi - homeSummary.startCi);
  assert.equal(homeSummary.ratedContests, 3);
});

test('historical replay refuses singles without validated home/away', () => {
  const rows = [
    row('s1-h', 1, 'Singles', 'home-a', 'Home A', 'home', null, 'away-a', null, 'away', 'W', null),
    row('s1-a', 1, 'Singles', 'away-a', 'Away A', 'away', null, 'home-a', null, 'home', 'L', null),
  ];
  assert.throws(
    () => replayHistoricalCi(rows, new Map([['home-a', 900], ['away-a', 900]])),
    (error) => error instanceof HistoricalCiReplayError && error.message.includes('missing validated home/away'),
  );
});

function row(
  key: string,
  eventOrder: number,
  format: 'Singles' | 'Doubles',
  playerId: string,
  playerName: string,
  playerTeamId: string,
  partnerPlayerId: string | null,
  opponentOnePlayerId: string,
  opponentTwoPlayerId: string | null,
  opponentTeamId: string,
  outcome: 'W' | 'L' | 'T',
  playerSide: 'Home' | 'Away' | null,
): HistoricalReplayRow {
  return {
    deduplicationKey: key,
    seasonId: 'season-1',
    eventOrder,
    eventLabel: `Event ${eventOrder}`,
    historicalTeamMatchId: 1,
    format,
    playerId,
    playerName,
    playerTeamId,
    partnerPlayerId,
    opponentOnePlayerId,
    opponentTwoPlayerId,
    opponentTeamId,
    outcome,
    playerSide,
  };
}
