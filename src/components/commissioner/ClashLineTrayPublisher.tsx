'use client';

import {useCallback, useEffect, useState} from 'react';
import {pulseTriggerLabels} from '@/domain/story-engine/PulseFactFormatter';
import type {StoryCandidate} from '@/domain/story-engine/StoryCandidate';

type LiveItem = {
  id: string;
  sourceCandidateId: string;
  triggerType: string;
  text: string;
  publishedAt: string;
};

export function ClashLineTrayPublisher({selectedItems, seasonId}: {selectedItems: StoryCandidate[]; seasonId: string}) {
  const [liveItems, setLiveItems] = useState<LiveItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadLive = useCallback(async () => {
    try {
      const response = await fetch('/api/stories/clash-line', {cache: 'no-store'});
      if (!response.ok) return;
      const payload = await response.json() as {items?: LiveItem[]};
      setLiveItems(payload.items ?? []);
    } catch {
      // The manager is secondary to Pulse; leave the current view intact on read failure.
    }
  }, []);

  useEffect(() => {
    void loadLive();
  }, [loadLive]);

  async function publishSelected() {
    if (!seasonId || selectedItems.length === 0 || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/stories/clash-line', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({seasonId, candidateIds: selectedItems.map((item) => item.id)}),
      });
      const payload = await response.json() as {published?: number; error?: string};
      if (!response.ok) throw new Error(payload.error || 'Clash Line publish failed.');
      setMessage(`${payload.published ?? selectedItems.length} fact${(payload.published ?? selectedItems.length) === 1 ? '' : 's'} published to Clash Line.`);
      await loadLive();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Clash Line publish failed.');
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/stories/clash-line', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id}),
      });
      const payload = await response.json() as {error?: string};
      if (!response.ok) throw new Error(payload.error || 'Could not remove Clash Line fact.');
      await loadLive();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove Clash Line fact.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(127,127,127,.25)', display: 'grid', gap: 10}}>
      <div style={{display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
        <div>
          <strong>Clash Line ({liveItems.length} live)</strong>
          <div style={{fontSize: 12, opacity: .68, marginTop: 3}}>These verified facts rotate across the bottom of the public website.</div>
        </div>
        {selectedItems.length > 0 ? (
          <button
            type="button"
            onClick={publishSelected}
            disabled={busy || !seasonId}
            style={{minHeight: 42, padding: '8px 14px', fontWeight: 800}}
          >
            {busy ? 'Publishing…' : `Publish ${selectedItems.length} to Clash Line`}
          </button>
        ) : null}
      </div>

      {message ? <div style={{fontSize: 12, fontWeight: 700}}>{message}</div> : null}

      {liveItems.length === 0 ? (
        <div style={{fontSize: 13, opacity: .72}}>No live Clash Line facts yet. Add facts to the tray, then publish them here.</div>
      ) : (
        <div style={{display: 'grid', gap: 7}}>
          {liveItems.map((item) => (
            <div key={item.id} style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center', padding: 10, border: '1px solid rgba(127,127,127,.22)', borderRadius: 9}}>
              <div style={{minWidth: 0}}>
                <div style={{fontSize: 11, fontWeight: 900, opacity: .62, textTransform: 'uppercase', letterSpacing: '.05em'}}>{pulseTriggerLabels[item.triggerType as keyof typeof pulseTriggerLabels] ?? 'League fact'}</div>
                <div style={{fontSize: 13, lineHeight: 1.4, overflowWrap: 'anywhere'}}>{item.text}</div>
              </div>
              <button type="button" onClick={() => removeItem(item.id)} disabled={busy} style={{minHeight: 38}}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
