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
import {ClashLineTrayPublisher} from '@/components/commissioner/ClashLineTrayPublisher';

type PulseEvent = {
  eventId: string;
  eventLabel: string;
  eventOrder: number | null;
  resultRows: number;
  teamMatchCount: number;
  candidateCount: number;
  topScore: number | null;
};

type PulseReport = {
  seasonId: string;
  seasonName: string;
  resultRows: number;
  events: PulseEvent[];
  candidateCount: number;
  countsByTrigger: Partial<Record<StoryTriggerType, number>>;
  countsByImportance: Record<'candidate' | 'notable' | 'strong' | 'major', number>;
  topCandidates: StoryCandidate[];
};

type PulsePayload = {
  source: 'snapshot' | 'live-fallback' | 'live-debug';
  snapshot: {generatedAt: string; refreshTrigger: string} | null;
  build: {
    sourceFactRows: number;
    sourceContests: number;
    emittedContests: number;
    quarantinedContests: number;
  };
  seasonIds: string[];
  activeTrigger?: StoryTriggerType | null;
  activeEventId?: string | null;
  report: PulseReport | null;
  error?: string;
};

type TriggerFilter = 'ALL' | StoryTriggerType;

function eventOptionLabel(event: PulseEvent): string {
  const label = event.eventLabel?.trim() || (event.eventOrder !== null ? `Matchday ${event.eventOrder}` : 'Matchday');
  const matchWord = event.teamMatchCount === 1 ? 'team match' : 'team matches';
  return `${label} (${event.teamMatchCount} ${matchWord})`;
}

const selectorStyle = {
  width: '100%',
  minHeight: 50,
  padding: '10px 42px 10px 13px',
  border: '1px solid rgba(35,35,35,.42)',
  borderRadius: 10,
  background: 'rgba(255,255,255,.38)',
  color: 'inherit',
  font: 'inherit',
  fontSize: 17,
  fontWeight: 650,
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  cursor: 'pointer',
};

function SelectShell({children}: {children: React.ReactNode}) {
  return (
    <div style={{position: 'relative', width: '100%'}}>
      {children}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-52%)',
          fontSize: 20,
          lineHeight: 1,
          pointerEvents: 'none',
          opacity: .75,
        }}
      >
        ▾
      </span>
    </div>
  );
}

export function AroundTheClashDesk() {
  const [payload, setPayload] = useState<PulsePayload | null>(null);
  const [seasonId, setSeasonId] = useState('');
  const [eventId, setEventId] = useState('');
  const [trigger, setTrigger] = useState<TriggerFilter>('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({limit: '100'});
    if (seasonId) params.set('seasonId', seasonId);
    if (eventId) params.set('eventId', eventId);
    if (trigger !== 'ALL') params.set('trigger', trigger);

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
  }, [seasonId, eventId, trigger]);

  const candidates = payload?.report?.topCandidates ?? [];
  const displayedSeasonId = seasonId || payload?.report?.seasonId || '';
  const events = payload?.report?.events ?? [];
  const activeEvent = eventId ? events.find((item) => item.eventId === eventId) ?? null : null;
  const availableTriggers = useMemo(() => {
    const counts = payload?.report?.countsByTrigger ?? {};
    return (Object.keys(pulseTriggerLabels) as StoryTriggerType[])
      .filter((item) => (counts[item] ?? 0) > 0);
  }, [payload?.report?.countsByTrigger]);
  const selectedItems = candidates.filter((candidate) => selected.includes(candidate.id));

  function chooseTrigger(next: TriggerFilter) {
    if (next === trigger) return;
    setTrigger(next);
  }

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

      <div style={{display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end', width: '100%'}}>
          <label style={{display: 'grid', gap: 6, minWidth: 0}}>
            <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase'}}>Season</span>
            <SelectShell>
              <select
                value={displayedSeasonId}
                onChange={(event) => {
                  setTrigger('ALL');
                  setEventId('');
                  setSeasonId(event.target.value);
                  setSelected([]);
                }}
                disabled={loading || !payload?.seasonIds.length}
                style={selectorStyle}
              >
                {(payload?.seasonIds ?? []).map((item) => <option key={item} value={item}>{pulseSeasonLabel(item)}</option>)}
              </select>
            </SelectShell>
          </label>

          <label style={{display: 'grid', gap: 6, minWidth: 0}}>
            <span style={{fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase'}}>Matchday</span>
            <SelectShell>
              <select
                value={eventId}
                onChange={(event) => {
                  setTrigger('ALL');
                  setEventId(event.target.value);
                  setSelected([]);
                }}
                disabled={loading || events.length === 0}
                style={selectorStyle}
              >
                <option value="">All Matchdays</option>
                {events.map((item) => <option key={item.eventId} value={item.eventId}>{eventOptionLabel(item)}</option>)}
              </select>
            </SelectShell>
          </label>
        </div>

        {payload?.report ? (
          <div style={{display: 'flex', gap: '7px 16px', flexWrap: 'wrap', fontSize: 13}}>
            <span><strong>{payload.report.candidateCount}</strong> verified facts</span>
            {activeEvent
              ? <span><strong>{activeEvent.teamMatchCount}</strong> team matches</span>
              : <span><strong>{payload.build.emittedContests}</strong> verified contests</span>}
            <span><strong>{payload.build.quarantinedContests}</strong> quarantined</span>
          </div>
        ) : null}
      </div>

      {error ? <div style={{border: '1px solid rgba(180,50,50,.45)', borderRadius: 10, padding: 12}}>{error}</div> : null}

      {payload?.report ? (
        <>
          <div style={{fontSize: 13, opacity: .78}}>
            <strong>{payload.report.seasonName}</strong>
            {activeEvent ? ` · ${eventOptionLabel(activeEvent)}` : ''}
            {' · '}{payload.report.resultRows} normalized result sides · strongest facts ranked first
            <br />
            {payload.snapshot && payload.source !== 'live-debug'
              ? `${payload.source === 'snapshot' ? 'Saved snapshot' : 'Snapshot created'} · ${new Date(payload.snapshot.generatedAt).toLocaleString()}`
              : payload.source === 'live-debug'
                ? 'Live debug · snapshot bypassed'
                : 'Live fallback · snapshot unavailable'}
          </div>

          <nav style={{display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4}} aria-label="Clash Pulse fact triggers">
            <button
              type="button"
              onClick={() => chooseTrigger('ALL')}
              aria-pressed={trigger === 'ALL'}
              style={{whiteSpace: 'nowrap', borderRadius: 999, fontWeight: trigger === 'ALL' ? 800 : 500, outline: trigger === 'ALL' ? '2px solid currentColor' : undefined}}
            >
              All ({payload.report.candidateCount})
            </button>
            {availableTriggers.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => chooseTrigger(item)}
                aria-pressed={trigger === item}
                style={{whiteSpace: 'nowrap', borderRadius: 999, fontWeight: trigger === item ? 800 : 500, outline: trigger === item ? '2px solid currentColor' : undefined}}
              >
                {pulseTriggerLabels[item]} ({payload.report?.countsByTrigger[item] ?? 0})
              </button>
            ))}
          </nav>

          <section style={{display: 'grid', gap: 10}}>
            <header style={{padding: '0 2px', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline'}}>
              <h3 style={{margin: 0, fontSize: 'clamp(22px, 5vw, 28px)', lineHeight: 1.15}}>{trigger === 'ALL' ? (activeEvent ? `${activeEvent.eventLabel} verified facts` : 'Top verified facts') : pulseTriggerLabels[trigger]}</h3>
              <span style={{fontSize: 11, opacity: .68}}>{loading ? 'Loading selected facts…' : 'Verified data · deterministic wording · no AI generation'}</span>
            </header>
            <div key={`${displayedSeasonId}:${eventId || 'ALL'}:${trigger}:${payload.activeTrigger ?? 'ALL'}`} style={{display: 'grid', gap: 10, opacity: loading ? .55 : 1}}>
              {!loading && candidates.length === 0 ? <p style={{padding: 16, margin: 0}}>No facts in this category.</p> : null}
              {candidates.map((candidate, index) => {
                const isSelected = selected.includes(candidate.id);
                const factText = pulseFactText(candidate);
                return (
                  <article key={candidate.id} style={{display: 'grid', gap: 10, padding: '14px 14px 13px', border: '1px solid rgba(127,127,127,.3)', borderRadius: 12, minWidth: 0}}>
                    <div style={{display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 10, alignItems: 'start', minWidth: 0}}>
                      <span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 36, padding: '0 8px', borderRadius: 999, border: '1px solid rgba(127,127,127,.35)', fontSize: 14, lineHeight: 1, fontWeight: 800, marginTop: 1}}>
                        #{index + 1}
                      </span>
                      <strong style={{display: 'block', fontSize: 'clamp(24px, 5.6vw, 34px)', lineHeight: 1.14, letterSpacing: '-.018em', overflowWrap: 'anywhere'}}>{pulseFactHeadline(candidate)}</strong>
                    </div>
                    <div style={{minWidth: 0, paddingLeft: 46}}>
                      <div style={{fontSize: 'clamp(15px, 3.8vw, 18px)', lineHeight: 1.48, opacity: .82, overflowWrap: 'anywhere'}}>{pulseFactSummary(candidate)}</div>
                      <div style={{fontSize: 10, lineHeight: 1.35, opacity: .52, marginTop: 7, overflowWrap: 'anywhere'}}>{pulseTriggerLabels[candidate.triggerType]} · {candidate.eventId ?? candidate.matchId ?? candidate.seasonId}</div>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 7, paddingLeft: 46}}>
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
                    <span style={{overflowWrap: 'anywhere'}}><strong>{pulseFactText(candidate)}</strong><br /><small>{pulseTriggerLabels[candidate.triggerType]}</small></span>
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
            <ClashLineTrayPublisher selectedItems={selectedItems} seasonId={displayedSeasonId} />
          </aside>
        </>
      ) : loading ? <p style={{margin: 0}}>Analyzing verified Clash history...</p> : null}
    </div>
  );
}
