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

test('does not invent an unbeaten player from no wins or unknown CI', () => {
  assert.equal(selectSwingPlayer(roster, 'Dark Knights', [result('low', 'T')]), undefined);
  assert.equal(selectSwingPlayer([{id: 'unknown', name: 'Unknown'}], 'Dark Knights',
    [result('unknown', 'W')]), undefined);
});

test('proven selection excludes the swing player and counts history across former teams', () => {
  const rows = [result('low', 'W'), result('low', 'W'), result('middle', 'W', 'KB')];
  assert.equal(selectProvenPlayer(roster, rows, 'low')?.id, 'middle');
  assert.equal(selectProvenPlayer([roster[0]], rows, 'low'), undefined);
});
