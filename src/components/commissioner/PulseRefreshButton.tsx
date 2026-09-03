'use client';

import {useState} from 'react';

export function PulseRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function refreshPulse() {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch('/api/stories/pulse', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({trigger: 'commissioner-manual'}),
      });
      const result = await response.json() as {error?: string};
      if (!response.ok) throw new Error(result.error || 'Clash Pulse could not be refreshed.');
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Clash Pulse could not be refreshed.');
      setRefreshing(false);
    }
  }

  return (
    <div style={{display: 'grid', gap: 5, justifyItems: 'start'}}>
      <button
        type="button"
        onClick={refreshPulse}
        disabled={refreshing}
        aria-label="Refresh Clash Pulse facts"
        style={{
          appearance: 'none',
          border: '2px solid #1f2326',
          borderRadius: 9,
          background: refreshing ? '#d7d3c8' : '#1f2326',
          color: refreshing ? '#555' : '#fff',
          padding: '10px 16px',
          minHeight: 44,
          whiteSpace: 'nowrap',
          fontSize: 15,
          lineHeight: 1,
          fontWeight: 850,
          letterSpacing: '.01em',
          boxShadow: refreshing ? 'none' : '0 2px 0 rgba(0,0,0,.18)',
          cursor: refreshing ? 'wait' : 'pointer',
        }}
      >
        {refreshing ? 'Refreshing Pulse…' : '↻ Refresh Pulse'}
      </button>
      <span style={{fontSize: 11, opacity: .62}}>Rebuild verified facts</span>
      {error ? <span style={{fontSize: 11, color: '#9d2f2f', maxWidth: 220}}>{error}</span> : null}
    </div>
  );
}
