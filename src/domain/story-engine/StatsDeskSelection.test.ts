import {describe, expect, it} from 'vitest';
import {addSelectedStat, moveSelectedStat, removeSelectedStat, setSelectedStatNote} from './StatsDeskSelection';

describe('StatsDeskSelection', () => {
  it('adds a fact once even when it appears in several ranked categories', () => {
    let selected = addSelectedStat([], 'contest-1:player-1', 'upsets', '2026-08-22T12:00:00Z');
    selected = addSelectedStat(selected, 'contest-1:player-1', 'road-wins', '2026-08-22T12:01:00Z');
    expect(selected).toHaveLength(1);
    expect(selected[0].categoryId).toBe('upsets');
  });

  it('supports quick remove and reorder', () => {
    let selected = addSelectedStat([], 'a', 'upsets');
    selected = addSelectedStat(selected, 'b', 'doubles-upsets');
    selected = moveSelectedStat(selected, 'b', 'up');
    expect(selected.map((item) => item.factId)).toEqual(['b', 'a']);
    expect(removeSelectedStat(selected, 'b').map((item) => item.factId)).toEqual(['a']);
  });

  it('allows an optional commissioner note without requiring one', () => {
    let selected = addSelectedStat([], 'a', 'upsets');
    selected = setSelectedStatNote(selected, 'a', 'Huge point late in the match');
    expect(selected[0].note).toBe('Huge point late in the match');
    selected = setSelectedStatNote(selected, 'a', '   ');
    expect(selected[0].note).toBeUndefined();
  });
});
