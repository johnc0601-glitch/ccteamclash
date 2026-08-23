'use client';

import {useMemo, useState} from 'react';

type Scope = 'Current Round' | 'Match' | 'Season' | 'All-Time';
type Category = 'Upsets' | 'Road' | 'Home' | 'Doubles' | 'CI +/-' | 'Closest';
type HistoricalMatchup = {id: string; awayTeam: string; homeTeam: string};
type HistoricalStat = {
  id: string;
  matchupId: string;
  headline: string;
  players: string;
  detail: string;
  value: string;
  category: Category;
  rank: number;
};

const scopes: Scope[] = ['Current Round', 'Match', 'Season', 'All-Time'];
const categories: Category[] = ['Upsets', 'Road', 'Home', 'Doubles', 'CI +/-', 'Closest'];

const matchups: HistoricalMatchup[] = [
  {id: 'dk-ninjas', awayTeam: 'Dark Knights', homeTeam: 'Ninjas'},
  {id: 'kb-og', awayTeam: 'KB', homeTeam: "Hayneous OG's"},
  {id: 'cougar-beast', awayTeam: 'Cougar Country', homeTeam: 'Beast Mode'},
  {id: 'riptide-wt', awayTeam: 'Riptide', homeTeam: 'Wild Turkey'},
];

// Reconstructed pre-February values from the archived 2025-26 rating workbook.
// A null value means the workbook does not contain enough rating history to show a reliable CI.
const preMatchCi: Record<string, number | null> = {
  'Blake Eadie': 822,
  'AJ Lehmann': 910,
  'Jeff Parsley': 837,
  'Zach Philips': 903,
  'Ben Morrow': 786,
  'Tommy Phillips': 920,
  'Javon Goddard': 969,
  'Chase Thomley': 881,
  'Peter Hourigan': 873,
  'Chad Heacock': 930,
  'Jamieson Vollbrecht': 784,
  'Eric Pierre': 808,
  'Rudy Dixon': 847,
  'Ernie Raymond': 844,
  'Chad Crom': 880,
  'Will Barwick': 907,
  'Keith Connolly': 840,
  'Austin Gratton': 903,
  'Conner Garrett': 919,
  'Ashlee Hynds': 701,
  'Ariel Cosmo': 763,
  'Jeff King': 907,
  'David Redlon': 959,
  'Mike Matthews': 859,
  'Brandon Burckhalter': 905,
  'Hastin McGill': 915,
  'David Harding': 862,
  'Jonathan Glass': 911,
  'Bruce Baginski': 927,
  'J Baus': null,
  'Alex Karp': 959,
  'Owen Shields': 928,
  'Keegan Wroten': 970,
  'Drew Massey': 967,
  'Anthony Hardee': 861,
  'Timothy Range': 862,
  'Daniel Johnson': 919,
  'Scott Keaton': 884,
  'Will Deering': 995,
  'Andrew Lamont': 992,
  'Nick King': 898,
  'Aidan Prince': 877,
};

function playerWithCi(name: string) {
  const ci = preMatchCi[name];
  return `${name} (CI ${ci ?? '—'})`;
}

function playersWithCi(players: string) {
  return players
    .split(' vs ')
    .map((side) => side.split(' + ').map((name) => playerWithCi(name)).join(' + '))
    .join(' vs ');
}

const rows: HistoricalStat[] = [
  // Upsets = one expectation-based story. CI Gaps and Above Expected were removed because
  // they were effectively re-ranking the same rating-gap information.
  {id:'u1',category:'Upsets',rank:1,matchupId:'kb-og',headline:'Biggest upset',players:'Blake Eadie vs AJ Lehmann',detail:'Singles · KB road win · historical expectation',value:'1.9% win chance'},
  {id:'u3',category:'Upsets',rank:2,matchupId:'riptide-wt',headline:'Upset win',players:'Jeff Parsley vs Zach Philips',detail:'Singles · Wild Turkey home win · historical expectation',value:'4.0% win chance'},
  {id:'u4',category:'Upsets',rank:3,matchupId:'riptide-wt',headline:'Doubles upset',players:'Ben Morrow + Tommy Phillips vs Javon Goddard + Chase Thomley',detail:'Doubles · Wild Turkey home win · historical expectation',value:'4.8% win chance'},
  {id:'u5',category:'Upsets',rank:4,matchupId:'riptide-wt',headline:'Upset win',players:'Peter Hourigan vs Chad Heacock',detail:'Singles · Wild Turkey home win · historical expectation',value:'7.7% win chance'},

  // Road keeps a venue-specific story angle.
  {id:'r1',category:'Road',rank:1,matchupId:'kb-og',headline:'Top road performance',players:'Blake Eadie vs AJ Lehmann',detail:'Singles · KB away',value:'+29 rating'},
  {id:'r2',category:'Road',rank:2,matchupId:'dk-ninjas',headline:'Road performance',players:'Jamieson Vollbrecht vs Eric Pierre',detail:'Singles · Dark Knights away',value:'+18 rating'},
  {id:'r3',category:'Road',rank:3,matchupId:'dk-ninjas',headline:'Road performance',players:'Rudy Dixon + Jamieson Vollbrecht vs Ernie Raymond + Chad Crom',detail:'Doubles · Dark Knights away',value:'+12 rating'},
  {id:'r4',category:'Road',rank:4,matchupId:'kb-og',headline:'Road performance',players:'Will Barwick + Keith Connolly vs Austin Gratton + Conner Garrett',detail:'Doubles · KB away',value:'+10 rating'},
  {id:'r5',category:'Road',rank:5,matchupId:'kb-og',headline:'Road performance',players:'Ashlee Hynds vs Ariel Cosmo',detail:'Singles · KB away · tie',value:'+7 rating'},

  // Home keeps the corresponding home-venue story angle.
  {id:'h1',category:'Home',rank:1,matchupId:'riptide-wt',headline:'Top home performance',players:'Jeff Parsley vs Zach Philips',detail:'Singles · Wild Turkey home',value:'+28 rating'},
  {id:'h3',category:'Home',rank:2,matchupId:'riptide-wt',headline:'Home performance',players:'Jeff King vs David Redlon',detail:'Singles · Wild Turkey home',value:'+25 rating'},
  {id:'h4',category:'Home',rank:3,matchupId:'riptide-wt',headline:'Home performance',players:'Peter Hourigan vs Chad Heacock',detail:'Singles · Wild Turkey home',value:'+25 rating'},
  {id:'h5',category:'Home',rank:4,matchupId:'cougar-beast',headline:'Home performance',players:'Mike Matthews vs Brandon Burckhalter',detail:'Singles · Beast Mode home',value:'+24 rating'},

  // Doubles remains because it isolates team-play performances; Singles was removed because
  // it nearly duplicated the overall CI movement list.
  {id:'d1',category:'Doubles',rank:1,matchupId:'riptide-wt',headline:'Top doubles result',players:'Ben Morrow + Tommy Phillips vs Javon Goddard + Chase Thomley',detail:'Doubles · archived February result',value:'+14 rating'},
  {id:'d2',category:'Doubles',rank:2,matchupId:'dk-ninjas',headline:'Doubles result',players:'Rudy Dixon + Jamieson Vollbrecht vs Ernie Raymond + Chad Crom',detail:'Doubles · archived February result',value:'+12 rating'},
  {id:'d3',category:'Doubles',rank:3,matchupId:'kb-og',headline:'Doubles result',players:'Will Barwick + Keith Connolly vs Austin Gratton + Conner Garrett',detail:'Doubles · archived February result',value:'+10 rating'},
  {id:'d4',category:'Doubles',rank:4,matchupId:'cougar-beast',headline:'Doubles result',players:'Hastin McGill + David Harding vs Brandon Burckhalter + Jonathan Glass',detail:'Doubles · archived February result',value:'+9 rating'},
  {id:'d5',category:'Doubles',rank:5,matchupId:'dk-ninjas',headline:'Doubles result',players:'Bruce Baginski + J Baus vs Alex Karp + Owen Shields',detail:'Doubles · archived February result · one CI unavailable',value:'+9 rating'},

  // CI +/- is the single overall movement leaderboard.
  {id:'c1',category:'CI +/-',rank:1,matchupId:'kb-og',headline:'Biggest rating gain',players:'Blake Eadie vs AJ Lehmann',detail:'Singles · reconstructed historical movement',value:'+29 rating'},
  {id:'c2',category:'CI +/-',rank:2,matchupId:'riptide-wt',headline:'Rating gain',players:'Jeff Parsley vs Zach Philips',detail:'Singles · reconstructed historical movement',value:'+28 rating'},
  {id:'c4',category:'CI +/-',rank:3,matchupId:'riptide-wt',headline:'Rating gain',players:'Jeff King vs David Redlon',detail:'Singles · reconstructed historical movement',value:'+25 rating'},
  {id:'c5',category:'CI +/-',rank:4,matchupId:'riptide-wt',headline:'Rating gain',players:'Peter Hourigan vs Chad Heacock',detail:'Singles · reconstructed historical movement',value:'+25 rating'},

  // Closest is pre-match competitive balance rather than result magnitude.
  {id:'q1',category:'Closest',rank:1,matchupId:'riptide-wt',headline:'Closest rated matchup',players:'Keegan Wroten vs Drew Massey',detail:'Singles · tie · historical pre-match expectation',value:'51.2–48.8'},
  {id:'q2',category:'Closest',rank:2,matchupId:'riptide-wt',headline:'Close rated matchup',players:'Anthony Hardee vs Timothy Range',detail:'Singles · historical pre-match expectation',value:'48.8–51.2'},
  {id:'q3',category:'Closest',rank:3,matchupId:'riptide-wt',headline:'Close rated matchup',players:'Daniel Johnson + Scott Keaton vs Zach Philips + Timothy Range',detail:'Doubles · historical pre-match expectation',value:'52.3–47.7'},
  {id:'q4',category:'Closest',rank:4,matchupId:'riptide-wt',headline:'Close rated matchup',players:'Will Deering vs Andrew Lamont',detail:'Singles · historical pre-match expectation',value:'53.4–46.6'},
  {id:'q5',category:'Closest',rank:5,matchupId:'cougar-beast',headline:'Close rated matchup',players:'Nick King vs Aidan Prince',detail:'Singles · historical pre-match expectation',value:'46.6–53.4'},
];

export function AroundTheClashDesk() {
  const [scope, setScope] = useState<Scope>('Current Round');
  const [matchupId, setMatchupId] = useState('all');
  const [category, setCategory] = useState<Category>('Upsets');
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => rows
    .filter((item) => item.category === category && (matchupId === 'all' || item.matchupId === matchupId))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5), [category, matchupId]);

  const selectedItems = rows.filter((item) => selected.includes(item.id));
  const currentMatchup = matchups.find((item) => item.id === matchupId);

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function matchupLabel(id: string) {
    const matchup = matchups.find((item) => item.id === id);
    return matchup ? `${matchup.awayTeam} @ ${matchup.homeTeam}` : 'All February matchups';
  }

  return (
    <div style={{display: 'grid', gap: 16}}>
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}} aria-label="Stats scope">
        {scopes.map((item) => (
          <button key={item} type="button" onClick={() => setScope(item)} aria-pressed={scope === item} style={{fontWeight: scope === item ? 800 : 500}}>{item}</button>
        ))}
      </div>

      <div style={{border: '1px solid rgba(127,127,127,.28)', borderRadius: 10, padding: 12, fontSize: 13}}>
        <strong>February 2026 historical test.</strong> Player results are from the archived 2025–26 matchup data. Pre-match CI is shown beside each player when the archived workbook can support a reconstruction; unavailable values are shown as CI —.
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12}}>
        <label style={{display: 'grid', gap: 5, fontSize: 13, fontWeight: 700}}>
          Event
          <select defaultValue="feb-2026" aria-label="Event">
            <option value="feb-2026">February 2026</option>
          </select>
        </label>

        <label style={{display: 'grid', gap: 5, fontSize: 13, fontWeight: 700}}>
          Matchup
          <select value={matchupId} onChange={(event) => setMatchupId(event.target.value)} aria-label="Matchup">
            <option value="all">All February matchups</option>
            {matchups.map((matchup) => <option key={matchup.id} value={matchup.id}>{matchup.awayTeam} @ {matchup.homeTeam}</option>)}
          </select>
        </label>

        <label style={{display: 'grid', gap: 5, fontSize: 13, fontWeight: 700}}>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)} aria-label="Category">
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div style={{fontSize: 13, opacity: .78}}>Viewing: <strong>{scope}</strong> · <strong>{currentMatchup ? `${currentMatchup.awayTeam} @ ${currentMatchup.homeTeam}` : 'All February matchups'}</strong> · <strong>{category}</strong></div>

      <section style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 12, overflow: 'hidden'}}>
        <header style={{padding: 16, borderBottom: '1px solid rgba(127,127,127,.25)'}}>
          <h3 style={{margin: 0}}>Top 5 · {category}</h3>
          <div style={{fontSize: 13, marginTop: 4, opacity: .72}}>{currentMatchup ? `${currentMatchup.awayTeam} @ ${currentMatchup.homeTeam}` : 'Across all February 2026 matchups'}</div>
        </header>
        <div>
          {visible.length === 0 ? <div style={{padding: 16, fontSize: 13, opacity: .7}}>No qualifying result in this category for the selected matchup.</div> : visible.map((item, index) => {
            const isSelected = selected.includes(item.id);
            return (
              <article key={item.id} style={{display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: 14, borderTop: index ? '1px solid rgba(127,127,127,.18)' : undefined}}>
                <strong style={{fontSize: 17, textAlign: 'center'}}>{index + 1}</strong>
                <div style={{minWidth: 0}}>
                  <div style={{fontSize: 12, fontWeight: 800, opacity: .68, marginBottom: 3}}>{matchupLabel(item.matchupId)}</div>
                  <strong>{item.headline}</strong>
                  <div style={{fontWeight: 700, marginTop: 5}}>{playersWithCi(item.players)}</div>
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
        {selectedItems.length === 0 ? <p style={{marginBottom: 0}}>Choose a category, review the top five February results, and add the ones worth using in the recap.</p> : (
          <div style={{display: 'grid', gap: 8, marginTop: 10}}>{selectedItems.map((item) => (
            <div key={item.id} style={{display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid rgba(127,127,127,.25)', borderRadius: 8, padding: 10}}>
              <span><strong>{item.headline}</strong><br /><small>{matchupLabel(item.matchupId)} · {playersWithCi(item.players)} · {item.category} · {item.value}</small></span>
              <button type="button" onClick={() => toggleSelected(item.id)}>Remove</button>
            </div>
          ))}</div>
        )}
      </aside>
    </div>
  );
}
