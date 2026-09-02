'use client';

import {useEffect, useMemo, useState} from 'react';
import {
  pulseFactBundle,
  pulseFactChatText,
  pulseFactHeadline,
  pulseFactSummary,
  pulseFactText,
  pulseSeasonLabel,
  pulseTriggerLabels,
} from '@/domain/story-engine/PulseFactFormatter';
import type {StoryCandidate, StoryTriggerType} from '@/domain/story-engine/StoryCandidate';

type PulseReport = {
  seasonId: string;
  seasonName: string;
  resultRows: number;
  candidateCount: number;
  countsByTrigger: Partial<Record<StoryTriggerType, number>>;
  countsByImportance: Record<'candidate' | 'notable' | 'strong' | 'major', number>;
  topCandidates: StoryCandidate[];
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
    return (Object.keys(pulseTriggerLabels) as StoryTriggerType[]).filter((item) => found.has(item));
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
            {(payload?.seasonIds ?? []).map((item) => <option key={item} value={item}>{pulseSeasonLabel(item)}</option>)}
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
                {pulseTriggerLabels[item]} ({payload.report?.countsByTrigger[item] ?? 0})
              </button>
            ))}
          </nav>

          <section style={{display: 'grid', gap: 12}}>
            <header style={{padding: '0 2px', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'}}>
              <h3 style={{margin: 0}}>{trigger === 'ALL' ? 'Top verified facts' : pulseTriggerLabels[trigger]}</h3>
              <span style={{fontSize: 12, opacity: .7}}>Verified data · deterministic wording · no AI generation</span>
            </header>
            <div style={{display: 'grid', gap: 12}}>
              {visible.length === 0 ? <p style={{padding: 16, margin: 0}}>No facts in this category.</p> : null}
              {visible.map((candidate, index) => {
                const isSelected = selected.includes(candidate.id);
                const factText = pulseFactText(candidate);
                return (
                  <article key={candidate.id} style={{display: 'grid', gap: 12, padding: 16, border: '1px solid rgba(127,127,127,.3)', borderRadius: 12, minWidth: 0}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'}}>
                      <span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, height: 34, padding: '0 8px', borderRadius: 999, border: '1px solid rgba(127,127,127,.35)', fontWeight: 800}}>
                        #{index + 1}
                      </span>
                      <strong title="Editorial interest score" style={{whiteSpace: 'nowrap'}}>{Math.round(candidate.storyScore)} pts</strong>
                    </div>
                    <div style={{minWidth: 0}}>
                      <strong style={{display: 'block', fontSize: 18, lineHeight: 1.3, overflowWrap: 'anywhere'}}>{pulseFactHeadline(candidate)}</strong>
                      <div style={{fontSize: 14, lineHeight: 1.55, opacity: .8, marginTop: 8, overflowWrap: 'anywhere'}}>{pulseFactSummary(candidate)}</div>
                      <div style={{fontSize: 11, lineHeight: 1.45, opacity: .58, marginTop: 8, overflowWrap: 'anywhere'}}>{pulseTriggerLabels[candidate.triggerType]} · {candidate.eventId ?? candidate.matchId ?? candidate.seasonId}</div>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8}}>
                      <button type="button" onClick={() => copyToClipboard(`fact:${candidate.id}`, pulseFactChatText(candidate))}>
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
                  <button type="button" onClick={() => copyToClipboard('tray', pulseFactBundle(selectedItems))}>
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
                  <div key={candidate.id} style={{display: 'grid', gap: 10, border: '1px solid rgba(127,127,127,.25)', borderRadius: 8, padding: 10}}>
                    <span style={{overflowWrap: 'anywhere'}}><strong>{pulseFactText(candidate)}</strong><br /><small>{pulseTriggerLabels[candidate.triggerType]} · {Math.round(candidate.storyScore)} pts</small></span>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8}}>
                      <button type="button" onClick={() => copyToClipboard(`tray-visual:${candidate.id}`, pulseFactText(candidate))}>
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
