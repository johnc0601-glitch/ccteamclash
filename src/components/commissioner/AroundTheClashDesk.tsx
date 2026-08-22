'use client';

import {useMemo, useState} from 'react';

type Scope = 'Current Round' | 'Match' | 'Season' | 'All-Time';
type Category = 'Upsets' | 'CI Gaps' | 'Above Expected' | 'Road' | 'Home' | 'Singles' | 'Doubles' | 'CI +/-' | 'Closest';

type PreviewStat = {
  id: string;
  headline: string;
  detail: string;
  value: string;
  category: Category;
};

const scopes: Scope[] = ['Current Round', 'Match', 'Season', 'All-Time'];
const categories: Category[] = ['Upsets', 'CI Gaps', 'Above Expected', 'Road', 'Home', 'Singles', 'Doubles', 'CI +/-', 'Closest'];

// Deliberately labeled fixtures: these exercise the commissioner workflow without
// presenting invented league results as real data. Replace with rated Matchday rows.
const fixtures: PreviewStat[] = [
  {id: 'upset-1', category: 'Upsets', headline: 'Lower-CI side wins', detail: 'Preview fixture · ranked by pre-match expectation', value: '18% win chance'},
  {id: 'upset-2', category: 'Upsets', headline: 'Road underdog takes the point', detail: 'Preview fixture · singles', value: '27% win chance'},
  {id: 'gap-1', category: 'CI Gaps', headline: 'Largest CI gap overcome', detail: 'Preview fixture · winning side entered lower', value: '−84 CI'},
  {id: 'expected-1', category: 'Above Expected', headline: 'Best result above expectation', detail: 'Preview fixture · result versus pre-match model', value: '+31 pts'},
  {id: 'road-1', category: 'Road', headline: 'Top road performance', detail: 'Preview fixture · away side', value: '+24 pts'},
  {id: 'home-1', category: 'Home', headline: 'Top home performance', detail: 'Preview fixture · home side', value: '+22 pts'},
  {id: 'singles-1', category: 'Singles', headline: 'Top singles result', detail: 'Preview fixture · rated head-to-head', value: '+28 pts'},
  {id: 'doubles-1', category: 'Doubles', headline: 'Top doubles result', detail: 'Preview fixture · team CI uses stronger-player weighting', value: '+25 pts'},
  {id: 'change-1', category: 'CI +/-', headline: 'Biggest CI gain', detail: 'Preview fixture · post-match movement', value: '+14 CI'},
  {id: 'close-1', category: 'Closest', headline: 'Closest rated matchup', detail: 'Preview fixture · nearly even expectation', value: '51–49'},
];

export function AroundTheClashDesk() {
  const [scope, setScope] = useState<Scope>('Current Round');
  const [category, setCategory] = useState<Category>('Upsets');
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => fixtures.filter((item) => item.category === category), [category]);
  const selectedItems = fixtures.filter((item) => selected.includes(item.id));

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div style={{display: 'grid', gap: 16}}>
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}} aria-label="Stats scope">
        {scopes.map((item) => (
          <button key={item} type="button" onClick={() => setScope(item)} aria-pressed={scope === item} style={{fontWeight: scope === item ? 800 : 500}}>
            {item}
          </button>
        ))}
      </div>

      <div style={{fontSize: 13, opacity: .75}}>Viewing: <strong>{scope}</strong> · Preview fixtures</div>

      <nav style={{display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4}} aria-label="Around the Clash categories">
        {categories.map((item) => (
          <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} style={{whiteSpace: 'nowrap', borderRadius: 999, fontWeight: category === item ? 800 : 500}}>
            {item}
          </button>
        ))}
      </nav>

      <section style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 12, overflow: 'hidden'}}>
        <header style={{padding: 16, borderBottom: '1px solid rgba(127,127,127,.25)'}}>
          <h3 style={{margin: 0}}>{category}</h3>
        </header>
        <div>
          {visible.map((item, index) => {
            const isSelected = selected.includes(item.id);
            return (
              <article key={item.id} style={{display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: 14, borderTop: index ? '1px solid rgba(127,127,127,.2)' : undefined}}>
                <strong style={{fontSize: 18, textAlign: 'center'}}>{index + 1}</strong>
                <div style={{minWidth: 0}}>
                  <strong>{item.headline}</strong>
                  <div style={{fontSize: 13, opacity: .72, marginTop: 3}}>{item.detail}</div>
                </div>
                <div style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                  <strong>{item.value}</strong>
                  <button type="button" onClick={() => toggleSelected(item.id)}>{isSelected ? 'Remove' : 'Add'}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside style={{borderTop: '1px solid rgba(127,127,127,.35)', paddingTop: 14}}>
        <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center'}}>
          <strong>Selected stories ({selectedItems.length})</strong>
          {selectedItems.length > 0 && <button type="button" onClick={() => setSelected([])}>Clear</button>}
        </div>
        {selectedItems.length === 0 ? (
          <p style={{marginBottom: 0}}>Add ranked results here while reviewing the round. This becomes the handoff into recap writing.</p>
        ) : (
          <div style={{display: 'grid', gap: 8, marginTop: 10}}>
            {selectedItems.map((item) => (
              <div key={item.id} style={{display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid rgba(127,127,127,.25)', borderRadius: 8, padding: 10}}>
                <span><strong>{item.headline}</strong><br /><small>{item.category} · {item.value}</small></span>
                <button type="button" onClick={() => toggleSelected(item.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
