export type SelectedStat = {
  factId: string;
  categoryId: string;
  selectedAt: string;
  note?: string;
};

export function addSelectedStat(
  selected: SelectedStat[],
  factId: string,
  categoryId: string,
  selectedAt = new Date().toISOString(),
): SelectedStat[] {
  if (selected.some((item) => item.factId === factId)) return selected;
  return [...selected, {factId, categoryId, selectedAt}];
}

export function removeSelectedStat(selected: SelectedStat[], factId: string): SelectedStat[] {
  return selected.filter((item) => item.factId !== factId);
}

export function moveSelectedStat(
  selected: SelectedStat[],
  factId: string,
  direction: 'up' | 'down',
): SelectedStat[] {
  const index = selected.findIndex((item) => item.factId === factId);
  if (index < 0) return selected;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= selected.length) return selected;
  const next = [...selected];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function setSelectedStatNote(
  selected: SelectedStat[],
  factId: string,
  note: string,
): SelectedStat[] {
  return selected.map((item) => item.factId === factId ? {...item, note: note.trim() || undefined} : item);
}
