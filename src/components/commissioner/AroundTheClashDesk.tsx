'use client';

import {useEffect, useMemo, useState} from 'react';

type StoryTriggerType =
  | 'WIN_STREAK'
  | 'STREAK_SNAPPED'
  | 'UPSET'
  | 'CI_SURGE'
  | 'RANK_MILESTONE'
  | 'CAREER_MILESTONE'
  | 'PERSONAL_BEST'
  | 'FIRST_SINCE'
  | 'HEAD_TO_HEAD'
  | 'TEAM_SERIES'
  | 'DOUBLES_CHEMISTRY'
  | 'RECORD';

type FactValue = string | number | boolean | null;

type PulseCandidate = {
  id: string;
  triggerType: StoryTriggerType;
  seasonId: string;
  eventId?: string;
  matchId?: string;
  playerIds: string[];
  teamIds: string[];
  headlineFacts: Record<string, FactValue>;
  contextFacts: Record<string, FactValue>;
  storyScore: number;
  confidence: 'verified';
};

type PulseReport = {
  seasonId: string;
  seasonName: string;
  resultRows: number;
  candidateCount: number;
  countsByTrigger: Partial<Record<StoryTriggerType, number>>;
  countsByImportance: Record<'candidate' | 'notable' | 'strong' | 'major', number>;
  topCandidates: PulseCandidate[];
};

type PulsePayload = {
  build: {
    sourceFactRows: number;
    sourceContests: number;
    emittedContests: number;
    quarantinedContests: number;
  };
  seasonIds: string[];
  report: PulseReport | null;
  error?: string;
};

type TriggerFilter = 'ALL' | StoryTriggerType;

const triggerLabels: Record<StoryTriggerType, string> = {
  WIN_STREAK: 'Win streaks',
  STREAK_SNAPPED: 'Streaks snapped',
  UPSET: 'Upsets',
  CI_SURGE: 'CI surges',
  RANK_MILESTONE: 'Rank milestones',
  CAREER_MILESTONE: 'Career milestones',
  PERSONAL_BEST: 'Personal bests',
  FIRST_SINCE: 'First since',
  HEAD_TO_HEAD: 'Head-to-head',
  TEAM_SERIES: 'Team series',
  DOUBLES_CHEMISTRY: 'Doubles chemistry',
  RECORD: 'Records',
};

export function AroundTheClashDesk() {
  const [payload, setPayload] = useState<PulsePayload | null>(null);
  const [seasonId, setSeasonId] = useState('');
  const [trigger, setTrigger] = useState<TriggerFilter>('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({limit: '100'});
    if (seasonId) params.set('seasonId', seasonId);

    setLoading(true);
    setError('');
    fetch(`/api/stories/pulse?${params.toString()}`, {cache: 'no-store'})
      .then(async (response) => {
        const next = await response.json() as PulsePayload;
        if (!response.ok) throw new Error(next.error || 'Clash Pulse could not load.');
        return next;
      })
      .then((next) => {
        if (cancelled) return;
        setPayload(next);
        if (!seasonId && next.report?.seasonId) setSeasonId(next.report.seasonId);
        setSelected([]);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : 'Clash Pulse could not load.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [seasonId]);

  const candidates = payload?.report?.topCandidates ?? [];
  const availableTriggers = useMemo(() => {
    const found = new Set(candidates.map((candidate) => candidate.triggerType));
    return (Object.keys(triggerLabels) as StoryTriggerType[]).filter((item) => found.has(item));
  }, [candidates]);
  const visible = useMemo(
    () => trigger === 'ALL' ? candidates : candidates.filter((candidate) => candidate.triggerType === trigger),
    [candidates, trigger],
  );
  const selectedItems = candidates.filter((candidate) => selected.includes(candidate.id));

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function copyToClipboard(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => current === key ? '' : current), 1600);
    } catch {
      setCopied('');
    }
  }

  return (
    <div style={{display: 'grid', gap: 16}}>
      <div style={{border: '1px solid rgba(127,127,127,.28)', borderRadius: 12, padding: 14}}>
        <strong>Clash Pulse is the fact engine.</strong>
        <p style={{margin: '6px 0 0', fontSize: 13, opacity: .78}}>
          It finds and verifies interesting league facts. It does not write articles or invent details. Copy facts into ChatGPT for a story, or copy the short visual version into the Random Fact graphic.
        </p>
      </div>

      <div style={{display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap'}}>
        <label style={{display: 'grid', gap: 5, minWidth: 240}}>
          <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase'}}>Season</span>
          <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} disabled={loading || !payload?.seasonIds.length}>
            {(payload?.seasonIds ?? []).map((item) => <option key={item} value={item}>{seasonLabel(item)}</option>)}
          </select>
        </label>

        {payload?.report ? (
          <div style={{display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13}}>
            <span><strong>{payload.report.candidateCount}</strong> verified facts</span>
            <span><strong>{payload.build.emittedContests}</strong> verified contests</span>
            <span><strong>{payload.build.quarantinedContests}</strong> quarantined</span>
          </div>
        ) : null}
      </div>

      {error ? <div style={{border: '1px solid rgba(180,50,50,.45)', borderRadius: 10, padding: 12}}>{error}</div> : null}
      {loading ? <p style={{margin: 0}}>Analyzing verified Clash history...</p> : null}

      {!loading && payload?.report ? (
        <>
          <div style={{fontSize: 13, opacity: .78}}>
            <strong>{payload.report.seasonName}</strong> · {payload.report.resultRows} normalized result sides · strongest facts ranked first
          </div>

          <nav style={{display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4}} aria-label="Clash Pulse fact triggers">
            <button type="button" onClick={() => setTrigger('ALL')} aria-pressed={trigger === 'ALL'} style={{whiteSpace: 'nowrap', borderRadius: 999, fontWeight: trigger === 'ALL' ? 800 : 500}}>
              All ({candidates.length})
            </button>
            {availableTriggers.map((item) => (
              <button key={item} type="button" onClick={() => setTrigger(item)} aria-pressed={trigger === item} style={{whiteSpace: 'nowrap', borderRadius: 999, fontWeight: trigger === item ? 800 : 500}}>
                {triggerLabels[item]} ({payload.report?.countsByTrigger[item] ?? 0})
              </button>
            ))}
          </nav>

          <section style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 12, overflow: 'hidden'}}>
            <header style={{padding: 16, borderBottom: '1px solid rgba(127,127,127,.25)', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'}}>
              <h3 style={{margin: 0}}>{trigger === 'ALL' ? 'Top verified facts' : triggerLabels[trigger]}</h3>
              <span style={{fontSize: 12, opacity: .7}}>Verified data · deterministic wording · no AI generation</span>
            </header>
            <div>
              {visible.length === 0 ? <p style={{padding: 16, margin: 0}}>No facts in this category.</p> : null}
              {visible.map((candidate, index) => {
                const isSelected = selected.includes(candidate.id);
                const factText = candidateFactText(candidate);
                return (
                  <article key={candidate.id} style={{display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: 14, borderTop: index ? '1px solid rgba(127,127,127,.2)' : undefined}}>
                    <strong style={{fontSize: 18, textAlign: 'center'}}>{index + 1}</strong>
                    <div style={{minWidth: 0}}>
                      <strong>{candidateHeadline(candidate)}</strong>
                      <div style={{fontSize: 13, opacity: .78, marginTop: 4}}>{candidateFactSummary(candidate)}</div>
                      <div style={{fontSize: 11, opacity: .58, marginTop: 5}}>{triggerLabels[candidate.triggerType]} · {candidate.eventId ?? candidate.matchId ?? candidate.seasonId}</div>
                    </div>
                    <div style={{display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                      <strong title="Editorial interest score">{Math.round(candidate.storyScore)} pts</strong>
                      <button type="button" onClick={() => copyToClipboard(`fact:${candidate.id}`, candidateChatFact(candidate))}>
                        {copied === `fact:${candidate.id}` ? 'Copied' : 'Copy fact'}
                      </button>
                      <button type="button" onClick={() => copyToClipboard(`visual:${candidate.id}`, factText)}>
                        {copied === `visual:${candidate.id}` ? 'Copied' : 'Copy visual'}
                      </button>
                      <button type="button" onClick={() => toggleSelected(candidate.id)}>{isSelected ? 'Remove' : 'Add to tray'}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside style={{borderTop: '1px solid rgba(127,127,127,.35)', paddingTop: 14}}>
            <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
              <div>
                <strong>Fact tray ({selectedItems.length})</strong>
                <div style={{fontSize: 12, opacity: .68, marginTop: 3}}>Collect facts for a recap, post, or Random Fact visual.</div>
              </div>
              <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
                {selectedItems.length > 0 && (
                  <button type="button" onClick={() => copyToClipboard('tray', candidateBundle(selectedItems))}>
                    {copied === 'tray' ? 'Copied' : 'Copy all for ChatGPT'}
                  </button>
                )}
                {selectedItems.length > 0 && <button type="button" onClick={() => setSelected([])}>Clear</button>}
              </div>
            </div>
            {selectedItems.length === 0 ? (
              <p style={{marginBottom: 0}}>Add any useful facts above. Nothing is published or saved to the database from this tray.</p>
            ) : (
              <div style={{display: 'grid', gap: 8, marginTop: 10}}>
                {selectedItems.map((candidate) => (
                  <div key={candidate.id} style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', border: '1px solid rgba(127,127,127,.25)', borderRadius: 8, padding: 10}}>
                    <span><strong>{candidateFactText(candidate)}</strong><br /><small>{triggerLabels[candidate.triggerType]} · {Math.round(candidate.storyScore)} pts</small></span>
                    <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                      <button type="button" onClick={() => copyToClipboard(`tray-visual:${candidate.id}`, candidateFactText(candidate))}>
                        {copied === `tray-visual:${candidate.id}` ? 'Copied' : 'Copy visual'}
                      </button>
                      <button type="button" onClick={() => toggleSelected(candidate.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}

function candidateHeadline(candidate: PulseCandidate): string {
  const facts = candidate.headlineFacts;
  const subject = firstFact(facts, ['winner', 'player', 'players', 'pair', 'team', 'leader', 'holder', 'subject']);
  const opponent = firstFact(facts, ['opponentTeam', 'opponent', 'opponentName']);
  const label = triggerLabels[candidate.triggerType];

  if (subject && opponent) return `${label}: ${subject} vs ${opponent}`;
  if (subject) return `${label}: ${subject}`;
  return label;
}

function candidateFactSummary(candidate: PulseCandidate): string {
  const hidden = new Set(['resultId', 'modelVersion', 'upsetConfidence', 'probabilityConfidence']);
  const facts = Object.entries(candidate.headlineFacts)
    .filter(([key, value]) => !hidden.has(key) && value !== null && value !== '' && typeof value !== 'boolean')
    .slice(0, 5)
    .map(([key, value]) => `${humanizeKey(key)} ${formatFactValue(key, value)}`);
  return facts.join(' · ') || 'Verified Clash fact';
}

function candidateFactText(candidate: PulseCandidate): string {
  const facts = candidate.headlineFacts;
  const player = firstFact(facts, ['player', 'winner', 'players', 'pair', 'leader', 'holder', 'subject']);
  const team = firstFact(facts, ['team']);
  const opponent = firstFact(facts, ['opponentTeam', 'opponent', 'opponentName']);
  const format = firstFact(facts, ['format']);

  switch (candidate.triggerType) {
    case 'WIN_STREAK': {
      const length = numberFact(facts, 'streakLength');
      return player && length ? `${player} has won ${length} straight ${format ? `${format.toLowerCase()} ` : ''}matches.` : fallbackFactText(candidate);
    }
    case 'CI_SURGE': {
      const gain = numberFact(facts, 'ciGain');
      const matchdays = numberFact(facts, 'matchdays');
      return player && gain && matchdays ? `${player} has gained ${signed(gain)} CI over the last ${matchdays} Matchdays.` : fallbackFactText(candidate);
    }
    case 'UPSET': {
      const probability = numberFact(facts, 'winProbability');
      const deficit = numberFact(facts, 'ciDeficit');
      if (player && opponent && probability !== null) return `${player} beat ${opponent} after entering with a ${Math.round(probability * 100)}% model win chance.`;
      if (player && opponent && deficit !== null) return `${player} beat ${opponent} despite a ${Math.round(Math.abs(deficit))}-point CI disadvantage.`;
      return fallbackFactText(candidate);
    }
    case 'DOUBLES_CHEMISTRY':
      return fallbackFactText(candidate);
    case 'TEAM_SERIES':
      return fallbackFactText(candidate);
    default:
      if (player && team && opponent) return `${player} (${team}) vs ${opponent}: ${candidateFactSummary(candidate)}.`;
      return fallbackFactText(candidate);
  }
}

function fallbackFactText(candidate: PulseCandidate): string {
  const summary = candidateFactSummary(candidate);
  return `${candidateHeadline(candidate)} — ${summary}.`;
}

function candidateChatFact(candidate: PulseCandidate): string {
  const lines = [
    'VERIFIED CLASH FACT',
    `Fact: ${candidateFactText(candidate)}`,
    `Type: ${triggerLabels[candidate.triggerType]}`,
    `Season: ${seasonLabel(candidate.seasonId)}`,
    `Context: ${candidate.eventId ?? candidate.matchId ?? candidate.seasonId}`,
    `Verified details: ${candidateFactSummary(candidate)}`,
    'Source: Clash Pulse verified league result data.',
  ];
  if (candidate.contextFacts.editorialReviewRequired === true) {
    lines.push('Caution: rating evidence requires commissioner review; do not state an exact probability unless it appears in the verified details.');
  }
  return lines.join('\n');
}

function candidateBundle(candidates: PulseCandidate[]): string {
  return [
    'VERIFIED CLASH FACTS',
    'Use only these supplied facts as factual claims. Do not invent names, records, scores, streaks, probabilities, dates, or historical context.',
    '',
    ...candidates.flatMap((candidate, index) => [
      `${index + 1}. ${candidateFactText(candidate)}`,
      `   ${candidateFactSummary(candidate)}`,
      `   ${seasonLabel(candidate.seasonId)} · ${triggerLabels[candidate.triggerType]}`,
      '',
    ]),
  ].join('\n').trim();
}

function firstFact(facts: Record<string, FactValue>, keys: string[]): string {
  for (const key of keys) {
    const value = facts[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function numberFact(facts: Record<string, FactValue>, key: string): number | null {
  const value = facts[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function humanizeKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLocaleLowerCase();
}

function formatFactValue(key: string, value: FactValue): string {
  if (typeof value === 'number') {
    if (/probability/i.test(key)) return `${Math.round(value * 100)}%`;
    if (/delta|deficit|gain|change|surge/i.test(key)) return signed(Math.round(value));
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${Math.round(value)}`;
}

function seasonLabel(seasonId: string): string {
  const match = seasonId.match(/(20\d{2})-(20\d{2})/);
  return match ? `${match[1]}–${match[2].slice(-2)}` : seasonId;
}
