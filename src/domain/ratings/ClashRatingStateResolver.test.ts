import assert from 'node:assert/strict';
import test from 'node:test';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {resolveEventStartStates} from '@/domain/ratings/ClashRatingStateResolver';

test('first event blends prior Clash and current PDGA using rebuilt 50/60 rule', () => {
  const players = [player('returning', 900)];

  const five = resolveEventStartStates({
    players,
    priorSeason: [{playerId: 'returning', rating: 940, ratedResults: 5}],
  });
  const six = resolveEventStartStates({
    players,
    priorSeason: [{playerId: 'returning', rating: 940, ratedResults: 6}],
  });

  assert.equal(five[0].rating, 920);
  assert.equal(six[0].rating, 924);
});

test('new player starts from current PDGA', () => {
  const states = resolveEventStartStates({players: [player('new', 932)], priorSeason: []});
  assert.equal(states[0].rating, 932);
  assert.equal(states[0].provisional, false);
});

test('new player without PDGA starts provisional by division', () => {
  const open = resolveEventStartStates({players: [player('open', null, 'Male')], priorSeason: []});
  const women = resolveEventStartStates({players: [player('women', null, 'Female')], priorSeason: []});
  assert.equal(open[0].rating, 850);
  assert.equal(open[0].provisional, true);
  assert.equal(women[0].rating, 725);
  assert.equal(women[0].provisional, true);
});

test('later events continue from each players latest finalized appearance', () => {
  const states = resolveEventStartStates({
    players: [player('p1', 999), player('p2', 900)],
    priorSeason: [
      {playerId: 'p1', rating: 940, ratedResults: 6},
      {playerId: 'p2', rating: 880, ratedResults: 6},
    ],
    latestPriorByPlayer: [{
      playerId: 'p1',
      ratingAfter: 951,
      ratedResultsAfter: 9,
      provisionalEventsAfter: 0,
      provisionalAfter: false,
    }],
  });

  assert.deepEqual(states[0], {
    playerId: 'p1',
    rating: 951,
    ratedResults: 9,
    provisionalEventsPlayed: 0,
    provisional: false,
  });
  assert.equal(states[1].rating, 892);
});

function player(
  id: string,
  pdgaRating: number | null,
  gender: LaunchPlayer['gender'] = 'Male',
): LaunchPlayer {
  return {
    id,
    name: id,
    gender,
    pdgaNumber: '',
    pdgaRating,
    clashIndex: pdgaRating,
    currentTeamId: null,
    homeArea: '',
    active: true,
    createdAt: '',
    updatedAt: '',
  };
}
