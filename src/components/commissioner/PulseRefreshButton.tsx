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
    <div style={{display: 'grid', gap: 4}}>
      <button
        type="button"
        onClick={refreshPulse}
        disabled={refreshing}
        style={{whiteSpace: 'nowrap', fontWeight: 800}}
      >
        {refreshing ? 'Refreshing Pulse…' : 'Refresh Pulse'}
      </button>
      {error ? <span style={{fontSize: 11, color: '#9d2f2f', maxWidth: 220}}>{error}</span> : null}
    </div>
  );
}
