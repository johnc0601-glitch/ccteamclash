import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatHistoryVenue,
  formatSinglesHistoryScore,
  groupHistoryBySeason,
} from '@/components/players/playerHistoryDisplay';
import type {PlayerProfileMatchHistoryItem} from '@/services/playerProfiles';

const entry: PlayerProfileMatchHistoryItem = {
  id: 'row-1',
  seasonName: '2026',
  date: '2026-07-18',
  format: 'Singles',
  result: 'W',
  isHome: true,
  teamId: 'home-team',
  opponentTeamName: 'Opponent Team',
  opponentPlayerNames: ['Opponent Name'],
  partnerPlayerNames: [],
  playerScore: 7,
  opponentScore: 5,
};

test('singles display uses the player-first score with an en dash', () => {
  assert.equal(formatSinglesHistoryScore(entry), '7–5');
});

test('history wording uses vs at home and @ away', () => {
  assert.equal(formatHistoryVenue(entry), 'vs Opponent Team • 2026');
  assert.equal(formatHistoryVenue({...entry, isHome: false}), '@ Opponent Team • 2026');
});

test('complete history groups seasons and preserves newest-first ordering', () => {
  const history = [
    {...entry, id: 'new-season-new', seasonName: '2027', date: '2027-08-01'},
    {...entry, id: 'new-season-old', seasonName: '2027', date: '2027-07-01'},
    {...entry, id: 'old-season', seasonName: '2026', date: '2026-08-01'},
  ];

  const groups = groupHistoryBySeason(history);

  assert.deepEqual(groups.map((group) => group.seasonName), ['2027', '2026']);
  assert.deepEqual(groups[0].entries.map((match) => match.id), ['new-season-new', 'new-season-old']);
});
