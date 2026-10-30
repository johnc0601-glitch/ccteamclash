import assert from 'node:assert/strict';
import test from 'node:test';
import {selectSwingPlayer, selectProvenPlayer} from './selectSwingPlayer';

const roster = [
  {id: 'low', name: 'Lower CI', clashIndex: 800},
  {id: 'middle', name: 'Middle CI', clashIndex: 900},
  {id: 'high', name: 'Higher CI', clashIndex: 1000},
];
const result = (id: string, outcome: 'W' | 'L' | 'T', opponent = 'Dark Knights') =>
  ({player_id: id, opponent_team_name: opponent, outcome});

test('excludes players with losses and upper-half CI; preserves ties in unbeaten record', () => {
  const selected = selectSwingPlayer(roster, 'Dark Knights', [
    result('low', 'W'), result('low', 'L'), result('middle', 'W'),
    result('middle', 'T'), result('high', 'W'),
  ]);
  assert.equal(selected?.id, 'middle');
  assert.equal(selected?.ties, 1);
});

test('prefers lower CI and only uses this opponent and current roster', () => {
  const selected = selectSwingPlayer(roster, 'Dark Knights', [
    result('low', 'W'), result('low', 'L', 'KB'),
    result('middle', 'W'), result('middle', 'W'), result('former', 'W'),
  ]);
  assert.equal(selected?.id, 'low');
});

test('fallback keeps actual ties and unknown CI without inventing wins', () => {
  assert.equal(selectSwingPlayer(roster, 'Dark Knights', [result('low', 'T')])?.ties, 1);
  assert.equal(selectSwingPlayer([{id: 'unknown', name: 'Unknown'}], 'Dark Knights',
    [result('unknown', 'W')])?.id, 'unknown');
});

test('proven selection excludes the swing player and counts history across former teams', () => {
  const rows = [result('low', 'W'), result('low', 'W'), result('middle', 'W', 'KB')];
  assert.equal(selectProvenPlayer(roster, rows, 'low')?.id, 'middle');
  assert.equal(selectProvenPlayer([roster[0]], rows, 'low'), undefined);
});

test('selects an unbeaten player above roster median instead of leaving a blank', () => {
  assert.equal(selectSwingPlayer(roster, 'Dark Knights', [result('high', 'W')])?.id, 'high');
});
test('selects an actual player and truthful losing record when nobody is unbeaten', () => {
  const pick = selectSwingPlayer(roster, 'Dark Knights', [result('middle', 'W'), result('middle', 'L')]);
  assert.equal(pick?.id, 'middle');
  assert.equal(pick?.losses, 1);
  assert.equal(selectSwingPlayer(roster, 'Dark Knights', [])?.id, 'low');
});
