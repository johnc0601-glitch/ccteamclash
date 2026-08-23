'use client';

import {useMemo, useState} from 'react';

type Scope = 'Current Round' | 'Match' | 'Season' | 'All-Time';
type Category = 'Upsets' | 'CI Gaps' | 'Above Expected' | 'Road' | 'Home' | 'Singles' | 'Doubles' | 'CI +/-' | 'Closest';

type PreviewMatchup = {
  id: string;
  round: string;
  awayTeam: string;
  homeTeam: string;
};

type PreviewStat = {
  id: string;
  matchupId: string;
  headline: string;
  players: string;
  detail: string;
  value: string;
  category: Category;
};

const scopes: Scope[] = ['Current Round', 'Match', 'Season', 'All-Time'];
const categories: Category[] = ['Upsets', 'CI Gaps', 'Above Expected', 'Road', 'Home', 'Singles', 'Doubles', 'CI +/-', 'Closest'];

const previewMatchups: PreviewMatchup[] = [
  {id: 'dk-wt', round: 'Round 1', awayTeam: 'Wild Turkey', homeTeam: 'Dark Knights'},
  {id: 'kb-og', round: 'Round 1', awayTeam: 'Kure Beach', homeTeam: "Hayneous OG's"},
  {id: 'ninjas-riptide', round: 'Round 1', awayTeam: 'Ninjas', homeTeam: 'Riptide'},
  {id: 'focus-beast', round: 'Round 1', awayTeam: 'Team Focus', homeTeam: 'Beast Mode'},
];

// Deliberately labeled fixtures: these exercise the commissioner workflow without
// presenting invented league results as real data. Demo player names are placeholders
// until the desk is connected to rated Matchday rows.
const fixtures: PreviewStat[] = [
  {id: 'upset-1', matchupId: 'dk-wt', category: 'Upsets', headline: 'Lower-CI side wins', players: 'Demo Player A vs Demo Player B', detail: 'Singles · ranked by pre-match expectation', value: '18% win chance'},
  {id: 'upset-2', matchupId: 'kb-og', category: 'Upsets', headline: 'Road underdog takes the point', players: 'Demo Player C vs Demo Player D', detail: 'Singles · away side entered lower', value: '27% win chance'},
  {id: 'gap-1', matchupId: 'ninjas-riptide', category: 'CI Gaps', headline: 'Largest CI gap overcome', players: 'Demo Player E vs Demo Player F', detail: 'Singles · winning side entered lower', value: '−84 CI'},
  {id: 'expected-1', matchupId: 'focus-beast', category: 'Above Expected', headline: 'Best result above expectation', players: 'Demo Player G vs Demo Player H', detail: 'Singles · result versus pre-match model', value: '+31 pts'},
  {id: 'road-1', matchupId: 'dk-wt', category: 'Road', headline: 'Top road performance', players: 'Demo Player I vs Demo Player J', detail: 'Singles · away side', value: '+24 pts'},
  {id: 'home-1', matchupId: 'kb-og', category: 'Home', headline: 'Top home performance', players: 'Demo Player K vs Demo Player L', detail: 'Singles · home side', value: '+22 pts'},
  {id: 'singles-1', matchupId: 'ninjas-riptide', category: 'Singles', headline: 'Top singles result', players: 'Demo Player M vs Demo Player N', detail: 'Rated head-to-head', value: '+28 pts'},
  {id: 'doubles-1', matchupId: 'focus-beast', category: 'Doubles', headline: 'Top doubles result', players: 'Demo Player O + Demo Player P vs Demo Player Q + Demo Player R', detail: 'Doubles · team CI uses stronger-player weighting', value: '+25 pts'},
  {id: 'change-1', matchupId: 'dk-wt', category: 'CI +/-', headline: 'Biggest CI gain', players: 'Demo Player S vs Demo Player T', detail: 'Singles · post-match movement', value: '+14 CI'},
  {id: 'close-1', matchupId: 'kb-og', category: 'Closest', headline: 'Closest rated matchup', players: 'Demo Player U vs Demo Player V', detail: 'Singles · nearly even expectation', value: '51–49'},
];

export function AroundTheClashDesk() {
  const [scope, setScope] = useState<Scope>('Current Round');
  const [category, setCategory] = useState<Category>('Upsets');
  const [matchupId, setMatchupId] = useState<string>('all');
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => fixtures.filter((item) => {
    if (item.category !== category) return false;
    if (matchupId !== 'all' && item.matchupId !== matchupId) return false;
    return true;
  }), [category, matchupId]);

  const selectedItems = fixtures.filter((item) => selected.includes(item.id));
  const currentMatchup = previewMatchups.find((item) => item.id === matchupId);

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function matchupLabel(id: string) {
    const matchup = previewMatchups.find((item) => item.id === id);
    return matchup ? `${matchup.awayTeam} @ ${matchup.homeTeam}` : 'All matchups';
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

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12}}>
        <label style={{display: 'grid', gap: 5, fontSize: 13, fontWeight: 700}}>
          Round
          <select defaultValue="round-1" aria-label="Round">
            <option value="round-1">Round 1</option>
            <option value="round-2" disabled>Round 2 · preview</option>
            <option value="round-3" disabled>Round 3 · preview</option>
          </select>
        </label>

        <label style={{display: 'grid', gap: 5, fontSize: 13, fontWeight: 700}}>
          Matchup
          <select value={matchupId} onChange={(event) => setMatchupId(event.target.value)} aria-label="Matchup">
            <option value="all">All Round 1 matchups</option>
            {previewMatchups.map((matchup) => (
              <option key={matchup.id} value={matchup.id}>{matchup.awayTeam} @ {matchup.homeTeam}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{fontSize: 13, opacity: .78}}>
        Viewing: <strong>{scope}</strong> · <strong>{currentMatchup ? `${currentMatchup.awayTeam} @ ${currentMatchup.homeTeam}` : 'All Round 1 matchups'}</strong> · Preview fixtures
      </div>

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
          {currentMatchup && <div style={{fontSize: 13, marginTop: 4, opacity: .72}}>{currentMatchup.awayTeam} @ {currentMatchup.homeTeam}</div>}
        </header>
        <div>
          {visible.length === 0 ? (
            <div style={{padding: 18, fontSize: 13, opacity: .72}}>No preview fixture in this category for the selected matchup.</div>
          ) : visible.map((item, index) => {
            const isSelected = selected.includes(item.id);
            return (
              <article key={item.id} style={{display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: 14, borderTop: index ? '1px solid rgba(127,127,127,.2)' : undefined}}>
                <strong style={{fontSize: 18, textAlign: 'center'}}>{index + 1}</strong>
                <div style={{minWidth: 0}}>
                  <div style={{fontSize: 12, fontWeight: 800, opacity: .68, marginBottom: 3}}>{matchupLabel(item.matchupId)}</div>
                  <strong>{item.headline}</strong>
                  <div style={{fontWeight: 700, marginTop: 5}}>{item.players}</div>
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
                <span><strong>{item.headline}</strong><br /><small>{matchupLabel(item.matchupId)} · {item.players} · {item.category} · {item.value}</small></span>
                <button type="button" onClick={() => toggleSelected(item.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
