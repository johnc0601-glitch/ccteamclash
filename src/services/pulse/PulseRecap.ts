import type {PulseCategory, SavedPulseFact} from './PulseFacts';

export const RECAP_CATEGORIES: PulseCategory[] = ['Round','Match','Upsets','CI movement','Achievements','Streaks','Broken streaks','History','Upcoming','Editorial'];
export const RECAP_LIMIT = 10;

/** A strict ten per category, with deterministic tie breaking and both CI directions. */
export function selectRecapFacts(facts: SavedPulseFact[]): SavedPulseFact[] {
  const visible = facts.filter(f => f.is_current && f.status !== 'hidden');
  const tie = (a: SavedPulseFact,b: SavedPulseFact) => a.fact_key.localeCompare(b.fact_key);
  return RECAP_CATEGORIES.flatMap(category => {
    const rows = visible.filter(f => f.category === category);
    if (category === 'CI movement') {
      const gains = rows.filter(f => (f.metric ?? 0) > 0).sort((a,b) => b.metric! - a.metric! || tie(a,b));
      const losses = rows.filter(f => (f.metric ?? 0) < 0).sort((a,b) => a.metric! - b.metric! || tie(a,b));
      const picked = [...gains.slice(0,5),...losses.slice(0,5)];
      return [...picked,...[...gains.slice(5),...losses.slice(5)].sort((a,b) => Math.abs(b.metric!) - Math.abs(a.metric!) || tie(a,b))].slice(0,RECAP_LIMIT);
    }
    const score = (f: SavedPulseFact) => category === 'Upsets' ? -(f.metric ?? 1)
      : category === 'Streaks' || category === 'Broken streaks' ? f.metric ?? 0
      : category === 'Match' ? f.fact_key.startsWith('score:') ? 4 : f.fact_key.startsWith('breakdown:') ? 3 : f.fact_key.startsWith('projection:') ? 2 : 1
      : category === 'Round' ? f.fact_key.startsWith('round:') ? 2 : 1
      : category === 'Achievements' ? f.fact_key.startsWith('both:') ? 2 : 1 : 0;
    return rows.sort((a,b) => score(b) - score(a) || (a.ranking ?? Infinity) - (b.ranking ?? Infinity) || tie(a,b)).slice(0,RECAP_LIMIT);
  });
}

export function copyRecapText(label: string, facts: SavedPulseFact[], notes: string[] = []): string {
  const selected = selectRecapFacts(facts);
  const lines = [`ROUND FACTS — ${label}`, 'Top 10 facts per category. Calculated recap notes; no approval required.',
    'CI movement prioritizes five gains and five losses; remaining places use the largest remaining movements. Ties use a stable order to keep the ten-fact limit.',
    ...notes.map(note => `DATA NOTE: ${note}`)];
  for (const category of RECAP_CATEGORIES) {
    const rows = selected.filter(f => f.category === category);
    if (!rows.length) continue;
    lines.push('',category.toUpperCase());
    for (const fact of rows) lines.push(`- ${fact.origin === 'editorial' ? '[Editorial] ' : ''}${fact.fact_text}`,
      `  Calculation: ${fact.calculation}`,
      `  Sources: ${fact.sources.map(s => `${s.table} [${s.ids.length > 4 ? `${s.ids.slice(0,2).join(', ')}; ${s.ids.length} records total` : s.ids.join(', ')}]`).join('; ')}`);
  }
  return lines.join('\n');
}
