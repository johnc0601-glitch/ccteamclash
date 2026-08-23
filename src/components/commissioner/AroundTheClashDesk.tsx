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
  rankScore: number;
};

const scopes: Scope[] = ['Current Round', 'Match', 'Season', 'All-Time'];
const categories: Category[] = ['Upsets', 'CI Gaps', 'Above Expected', 'Road', 'Home', 'Singles', 'Doubles', 'CI +/-', 'Closest'];

const previewMatchups: PreviewMatchup[] = [
  {id: 'dk-wt', round: 'Round 1', awayTeam: 'Wild Turkey', homeTeam: 'Dark Knights'},
  {id: 'kb-og', round: 'Round 1', awayTeam: 'Kure Beach', homeTeam: "Hayneous OG's"},
  {id: 'ninjas-riptide', round: 'Round 1', awayTeam: 'Ninjas', homeTeam: 'Riptide'},
  {id: 'focus-beast', round: 'Round 1', awayTeam: 'Team Focus', homeTeam: 'Beast Mode'},
];

const categoryMeta: Record<Category, {headline: string; detail: string; values: string[]}> = {
  Upsets: {headline: 'Lower-CI side wins', detail: 'Ranked by pre-match expectation', values: ['18% win chance', '21% win chance', '24% win chance', '27% win chance', '31% win chance']},
  'CI Gaps': {headline: 'CI gap overcome', detail: 'Winning side entered lower', values: ['−84 CI', '−77 CI', '−69 CI', '−61 CI', '−55 CI']},
  'Above Expected': {headline: 'Result above expectation', detail: 'Result versus pre-match model', values: ['+31 pts', '+28 pts', '+25 pts', '+23 pts', '+20 pts']},
  Road: {headline: 'Road performance', detail: 'Away-side result', values: ['+24 pts', '+22 pts', '+20 pts', '+18 pts', '+16 pts']},
  Home: {headline: 'Home performance', detail: 'Home-side result', values: ['+22 pts', '+20 pts', '+18 pts', '+16 pts', '+15 pts']},
  Singles: {headline: 'Singles result', detail: 'Rated head-to-head', values: ['+28 pts', '+25 pts', '+23 pts', '+21 pts', '+19 pts']},
  Doubles: {headline: 'Doubles result', detail: 'Team CI uses stronger-player weighting', values: ['+25 pts', '+23 pts', '+21 pts', '+19 pts', '+17 pts']},
  'CI +/-': {headline: 'CI gain', detail: 'Post-match movement', values: ['+14 CI', '+12 CI', '+11 CI', '+10 CI', '+9 CI']},
  Closest: {headline: 'Closest rated matchup', detail: 'Nearly even pre-match expectation', values: ['50.1–49.9', '50.5–49.5', '51–49', '51.5–48.5', '52–48']},
};

const matchupPlayers: Record<string, string[]> = {
  'dk-wt': ['Demo A vs Demo B', 'Demo C vs Demo D', 'Demo E vs Demo F', 'Demo G vs Demo H', 'Demo I vs Demo J'],
  'kb-og': ['Demo K vs Demo L', 'Demo M vs Demo N', 'Demo O vs Demo P', 'Demo Q vs Demo R', 'Demo S vs Demo T'],
  'ninjas-riptide': ['Demo U vs Demo V', 'Demo W vs Demo X', 'Demo Y vs Demo Z', 'Demo AA vs Demo BB', 'Demo CC vs Demo DD'],
  'focus-beast': ['Demo EE vs Demo FF', 'Demo GG vs Demo HH', 'Demo II vs Demo JJ', 'Demo KK vs Demo LL', 'Demo MM vs Demo NN'],
};

function buildPreviewFixtures(): PreviewStat[] {
  return categories.flatMap((category, categoryIndex) => previewMatchups.flatMap((matchup, matchupIndex) => {
    const meta = categoryMeta[category];
    return meta.values.map((value, resultIndex) => {
      const doubles = category === 'Doubles';
      const basePlayers = matchupPlayers[matchup.id][resultIndex];
      const players = doubles
        ? basePlayers.replace(' vs ', ' + Demo Partner vs ') + ' + Demo Partner'
        : basePlayers;
      return {
        id: `${categoryIndex}-${matchup.id}-${resultIndex}`,
        matchupId: matchup.id,
        category,
        headline: resultIndex === 0 ? `Top ${meta.headline.toLowerCase()}` : meta.headline,
        players,
        detail: `${doubles ? 'Doubles' : 'Singles'} · ${meta.detail}`,
        value,
        rankScore: 1000 - resultIndex * 50 - matchupIndex * 3,
      };
    });
  }));
}

// Deliberately labeled fixtures: these exercise the commissioner workflow without
// presenting invented league results as real data. The live desk will use rated Matchday rows.
const fixtures = buildPreviewFixtures();

export function AroundTheClashDesk() {
  const [scope, setScope] = useState<Scope>('Current Round');
  const [category, setCategory] = useState<Category>('Upsets');
  const [matchupId, setMatchupId] = useState<string>('all');
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => fixtures
    .filter((item) => item.category === category && (matchupId === 'all' || item.matchupId === matchupId))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 5), [category, matchupId]);

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
          <h3 style={{margin: 0}}>Top 5 · {category}</h3>
          <div style={{fontSize: 13, marginTop: 4, opacity: .72}}>
            {currentMatchup ? `${currentMatchup.awayTeam} @ ${currentMatchup.homeTeam}` : 'Across all Round 1 matchups'}
          </div>
        </header>
        <div>
          {visible.map((item, index) => {
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
                <div style={{display: 'grid', gap: 8, justifyItems: 'end'}}>
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
          <p style={{marginBottom: 0}}>Choose from the top five ranked results in any category. Selected results become the handoff into recap writing.</p>
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
