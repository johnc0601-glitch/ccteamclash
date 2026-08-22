import {describe, expect, it} from 'vitest';
import type {StoryFact} from './StoryRankings';
import {buildCommissionerStoryDesk, toggleStorySelection} from './CommissionerStoryDesk';

function fact(id: string, matchId: string, eventId: string, probability: number): StoryFact {
  return {
    id, matchId, eventId, seasonId: 's1', format: 'Singles', subjectNames: [id],
    teamName: 'A', opponentTeamName: 'B', side: 'Away', winProbability: probability,
    ciDeficit: probability < .5 ? 20 : -20, ciDelta: probability < .5 ? 6 : -6,
    expectedPoints: probability, actualPoints: 1, won: true,
  };
}

describe('CommissionerStoryDesk', () => {
  const facts = [fact('f1', 'm1', 'r1', .2), fact('f2', 'm2', 'r1', .3), fact('f3', 'm3', 'r2', .1)];

  it('uses the same ranked categories and respects the selected scope', () => {
    const desk = buildCommissionerStoryDesk(facts, {kind: 'Round', eventId: 'r1'});
    const upsets = desk.categories.find((category) => category.id === 'upsets')!;
    expect(upsets.allRows.map((row) => row.id)).toEqual(['f1', 'f2']);
  });

  it('keeps selection lightweight and toggles without changing rankings', () => {
    const first = toggleStorySelection([], {factId: 'f1', categoryId: 'upsets'});
    const desk = buildCommissionerStoryDesk(facts, {kind: 'Round', eventId: 'r1'}, first);
    expect(desk.selected).toEqual([{factId: 'f1', categoryId: 'upsets'}]);
    expect(desk.categories.find((category) => category.id === 'upsets')!.allRows[0].id).toBe('f1');
    expect(toggleStorySelection(first, first[0])).toEqual([]);
  });

  it('drops stale selections that do not belong to the current scope/category', () => {
    const desk = buildCommissionerStoryDesk(facts, {kind: 'Match', matchId: 'm1'}, [
      {factId: 'f3', categoryId: 'upsets'},
    ]);
    expect(desk.selected).toEqual([]);
  });
});
