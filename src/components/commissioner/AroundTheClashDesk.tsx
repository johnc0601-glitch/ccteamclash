'use client';

import {useEffect, useMemo, useState} from 'react';
import type {AroundFact} from '@/services/media/AroundTheClashService';

type Scope = 'Current Round' | 'Match' | 'Season' | 'All-Time';
type Category = 'Upsets' | 'CI Gaps' | 'Above Expected' | 'Road' | 'Home' | 'Singles' | 'Doubles' | 'CI +/-' | 'Closest';

type RankedItem = {
  key: string;
  factId: string;
  category: Category;
  headline: string;
  detail: string;
  value: string;
};

type AroundTheClashDeskProps = {
  facts: AroundFact[];
  activeSeasonId: string | null;
  seasonNames: Record<string, string>;
};

const scopes: Scope[] = ['Current Round', 'Match', 'Season', 'All-Time'];
const categories: Category[] = ['Upsets', 'CI Gaps', 'Above Expected', 'Road', 'Home', 'Singles', 'Doubles', 'CI +/-', 'Closest'];

export function AroundTheClashDesk({facts, activeSeasonId, seasonNames}: AroundTheClashDeskProps) {
  const [scope, setScope] = useState<Scope>('Current Round');
  const [category, setCategory] = useState<Category>('Upsets');
  const [seasonId, setSeasonId] = useState(activeSeasonId ?? facts[0]?.seasonId ?? '');
  const [matchId, setMatchId] = useState('');
  const [selected, setSelected] = useState<RankedItem[]>([]);

  const seasonOptions = useMemo(() => {
    const ids = [...new Set(facts.map((fact) => fact.seasonId))];
    return ids.sort((a, b) => newestFactOrder(facts, b) - newestFactOrder(facts, a));
  }, [facts]);

  const currentSeasonId = activeSeasonId ?? seasonOptions[0] ?? '';
  const currentSeasonFacts = useMemo(
    () => facts.filter((fact) => fact.seasonId === currentSeasonId),
    [facts, currentSeasonId],
  );
  const currentRoundOrder = currentSeasonFacts.length
    ? Math.max(...currentSeasonFacts.map((fact) => fact.eventOrder))
    : null;

  const matchOptions = useMemo(() => {
    const seen = new Map<string, {id: string; label: string; order: number}>();
    for (const fact of facts) {
      if (!fact.matchId) continue;
      const current = seen.get(fact.matchId);
      if (!current || fact.eventOrder > current.order) {
        seen.set(fact.matchId, {
          id: fact.matchId,
          label: fact.eventLabel || fact.matchId,
          order: fact.eventOrder,
        });
      }
    }
    return [...seen.values()].sort((a, b) => b.order - a.order || a.label.localeCompare(b.label));
  }, [facts]);

  useEffect(() => {
    if (!seasonId && seasonOptions[0]) setSeasonId(seasonOptions[0]);
  }, [seasonId, seasonOptions]);

  useEffect(() => {
    if (!matchId && matchOptions[0]) setMatchId(matchOptions[0].id);
    if (matchId && !matchOptions.some((match) => match.id === matchId)) {
      setMatchId(matchOptions[0]?.id ?? '');
    }
  }, [matchId, matchOptions]);

  const scopedFacts = useMemo(() => {
    switch (scope) {
      case 'Current Round':
        if (!currentSeasonId || currentRoundOrder === null) return [];
        return facts.filter((fact) => fact.seasonId === currentSeasonId && fact.eventOrder === currentRoundOrder);
      case 'Match':
        return matchId ? facts.filter((fact) => fact.matchId === matchId) : [];
      case 'Season':
        return seasonId ? facts.filter((fact) => fact.seasonId === seasonId) : [];
      default:
        return facts;
    }
  }, [scope, facts, currentSeasonId, currentRoundOrder, matchId, seasonId]);

  const visible = useMemo(() => rankFacts(scopedFacts, category), [scopedFacts, category]);
  const scopeLabel = describeScope(scope, currentRoundOrder, matchId, matchOptions, seasonId, seasonNames);

  function toggleSelected(item: RankedItem) {
    setSelected((current) => current.some((selectedItem) => selectedItem.key === item.key)
      ? current.filter((selectedItem) => selectedItem.key !== item.key)
      : [...current, item]);
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

      {scope === 'Season' && seasonOptions.length > 0 ? (
        <label style={{display: 'grid', gap: 5, maxWidth: 320, fontSize: 13, fontWeight: 800}}>
          Season
          <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
            {seasonOptions.map((id) => <option value={id} key={id}>{seasonNames[id] ?? id}</option>)}
          </select>
        </label>
      ) : null}

      {scope === 'Match' && matchOptions.length > 0 ? (
        <label style={{display: 'grid', gap: 5, maxWidth: 420, fontSize: 13, fontWeight: 800}}>
          Match
          <select value={matchId} onChange={(event) => setMatchId(event.target.value)}>
            {matchOptions.map((match) => <option value={match.id} key={match.id}>{match.label} · {match.id}</option>)}
          </select>
        </label>
      ) : null}

      <div style={{fontSize: 13, opacity: .75}}>
        Viewing: <strong>{scopeLabel}</strong> · {scopedFacts.length} canonical CI ledger row{scopedFacts.length === 1 ? '' : 's'}
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
        </header>
        <div>
          {visible.length === 0 ? (
            <div style={{padding: 20, opacity: .72}}>
              {facts.length === 0
                ? 'No rated CI results exist yet. This desk will populate automatically when canonical rating events are recorded.'
                : 'No results in this scope meet the selected category.'}
            </div>
          ) : visible.map((item, index) => {
            const isSelected = selected.some((selectedItem) => selectedItem.key === item.key);
            return (
              <article key={item.key} style={{display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: 14, borderTop: index ? '1px solid rgba(127,127,127,.2)' : undefined}}>
                <strong style={{fontSize: 18, textAlign: 'center'}}>{index + 1}</strong>
                <div style={{minWidth: 0}}>
                  <strong>{item.headline}</strong>
                  <div style={{fontSize: 13, opacity: .72, marginTop: 3}}>{item.detail}</div>
                </div>
                <div style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                  <strong>{item.value}</strong>
                  <button type="button" onClick={() => toggleSelected(item)}>{isSelected ? 'Remove' : 'Add'}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside style={{borderTop: '1px solid rgba(127,127,127,.35)', paddingTop: 14}}>
        <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center'}}>
          <strong>Selected facts ({selected.length})</strong>
          {selected.length > 0 && <button type="button" onClick={() => setSelected([])}>Clear</button>}
        </div>
        {selected.length === 0 ? (
          <p style={{marginBottom: 0}}>Add noteworthy rated results while reviewing the round. These stay as factual source notes for recap writing.</p>
        ) : (
          <div style={{display: 'grid', gap: 8, marginTop: 10}}>
            {selected.map((item) => (
              <div key={item.key} style={{display: 'flex', justifyContent: 'space-between', gap: 12, border: '1px solid rgba(127,127,127,.25)', borderRadius: 8, padding: 10}}>
                <span><strong>{item.headline}</strong><br /><small>{item.category} · {item.value}</small></span>
                <button type="button" onClick={() => toggleSelected(item)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function rankFacts(facts: AroundFact[], category: Category): RankedItem[] {
  let ranked = [...facts];

  switch (category) {
    case 'Upsets':
      ranked = ranked.filter((fact) => won(fact) && fact.expectedScore < 0.5).sort((a, b) => a.expectedScore - b.expectedScore);
      break;
    case 'CI Gaps':
      ranked = ranked.filter((fact) => won(fact) && ratingDeficit(fact) > 0).sort((a, b) => ratingDeficit(b) - ratingDeficit(a));
      break;
    case 'Above Expected':
      ranked = ranked.filter((fact) => fact.actualScore > fact.expectedScore).sort((a, b) => performanceAboveExpected(b) - performanceAboveExpected(a));
      break;
    case 'Road':
      ranked = ranked.filter((fact) => won(fact) && normalize(fact.side) === 'away').sort((a, b) => a.expectedScore - b.expectedScore);
      break;
    case 'Home':
      ranked = ranked.filter((fact) => won(fact) && normalize(fact.side) === 'home').sort((a, b) => a.expectedScore - b.expectedScore);
      break;
    case 'Singles':
      ranked = ranked.filter((fact) => won(fact) && isSingles(fact) && fact.expectedScore < 0.5).sort((a, b) => a.expectedScore - b.expectedScore);
      break;
    case 'Doubles':
      ranked = ranked.filter((fact) => won(fact) && isDoubles(fact) && fact.expectedScore < 0.5).sort((a, b) => a.expectedScore - b.expectedScore);
      break;
    case 'CI +/-':
      ranked.sort((a, b) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta));
      break;
    case 'Closest':
      ranked.sort((a, b) => Math.abs(a.expectedScore - 0.5) - Math.abs(b.expectedScore - 0.5));
      break;
  }

  return dedupeForCategory(ranked, category).slice(0, 12).map((fact) => toRankedItem(fact, category));
}

function dedupeForCategory(facts: AroundFact[], category: Category): AroundFact[] {
  if (category === 'CI +/-') return facts;
  const seen = new Set<string>();
  const result: AroundFact[] = [];

  for (const fact of facts) {
    let key: string;
    if (category === 'Closest') {
      key = `${fact.matchId}:${fact.contestId}`;
    } else if (isDoubles(fact)) {
      const pair = [fact.playerId, fact.partnerPlayerId ?? ''].filter(Boolean).sort().join('+');
      key = `${fact.matchId}:${fact.contestId}:${pair}`;
    } else {
      key = fact.id;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(fact);
  }
  return result;
}

function toRankedItem(fact: AroundFact, category: Category): RankedItem {
  const entity = entityName(fact);
  const opponent = opponentName(fact);
  const event = fact.eventLabel || `Event ${fact.eventOrder}`;
  const detailParts = [event, labelFormat(fact.format), labelSide(fact.side), opponent ? `vs ${opponent}` : ''].filter(Boolean);

  let value: string;
  switch (category) {
    case 'CI Gaps':
      value = `${Math.round(ratingDeficit(fact))} CI`;
      break;
    case 'Above Expected':
      value = `+${Math.round(performanceAboveExpected(fact) * 100)} pts`;
      break;
    case 'CI +/-':
      value = `${fact.totalDelta >= 0 ? '+' : ''}${fact.totalDelta.toFixed(1)} CI`;
      break;
    case 'Closest': {
      const pct = Math.round(fact.expectedScore * 100);
      value = `${pct}–${100 - pct}`;
      break;
    }
    default:
      value = `${Math.round(fact.expectedScore * 100)}% expected`;
  }

  return {
    key: `${category}:${fact.id}`,
    factId: fact.id,
    category,
    headline: category === 'CI +/-' ? `${entity} CI movement` : `${entity}${opponent ? ` vs ${opponent}` : ''}`,
    detail: detailParts.join(' · '),
    value,
  };
}

function entityName(fact: AroundFact): string {
  if (!isDoubles(fact) || !fact.partnerName) return fact.playerName;
  return [fact.playerName, fact.partnerName].sort().join(' + ');
}

function opponentName(fact: AroundFact): string {
  return [fact.opponentOneName, fact.opponentTwoName].filter((value): value is string => Boolean(value)).sort().join(' + ');
}

function ratingDeficit(fact: AroundFact): number {
  const own = isDoubles(fact) ? (fact.ownPairRating ?? fact.ratingBefore) : fact.ratingBefore;
  const opponent = isDoubles(fact)
    ? (fact.opponentPairRating ?? fact.opponentOneRating ?? own)
    : (fact.opponentOneRating ?? own);
  return opponent - own;
}

function performanceAboveExpected(fact: AroundFact): number {
  return fact.actualScore - fact.expectedScore;
}

function won(fact: AroundFact): boolean {
  return normalize(fact.outcome) === 'w' || normalize(fact.outcome) === 'win';
}

function isSingles(fact: AroundFact): boolean {
  return normalize(fact.format).includes('single');
}

function isDoubles(fact: AroundFact): boolean {
  return normalize(fact.format).includes('double');
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function labelFormat(value: string): string {
  if (isDoubles({format: value} as AroundFact)) return 'Doubles';
  if (isSingles({format: value} as AroundFact)) return 'Singles';
  return value;
}

function labelSide(value: string): string {
  const side = normalize(value);
  return side === 'away' ? 'Road' : side === 'home' ? 'Home' : value;
}

function newestFactOrder(facts: AroundFact[], seasonId: string): number {
  return facts.reduce((max, fact) => fact.seasonId === seasonId ? Math.max(max, fact.eventOrder) : max, -1);
}

function describeScope(
  scope: Scope,
  currentRoundOrder: number | null,
  matchId: string,
  matches: {id: string; label: string; order: number}[],
  seasonId: string,
  seasonNames: Record<string, string>,
): string {
  if (scope === 'Current Round') return currentRoundOrder === null ? 'Current round' : `Current round · Event ${currentRoundOrder}`;
  if (scope === 'Match') return matches.find((match) => match.id === matchId)?.label ?? 'Match';
  if (scope === 'Season') return seasonNames[seasonId] ?? seasonId || 'Season';
  return 'All rated history';
}
