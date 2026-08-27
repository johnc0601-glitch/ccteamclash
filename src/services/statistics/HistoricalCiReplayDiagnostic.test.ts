import {describe, expect, it} from 'vitest';
import {formatHistoricalCiReplayFailure} from '@/services/statistics/HistoricalCiReplayDiagnostic';

describe('formatHistoricalCiReplayFailure', () => {
  it('preserves the ledger validation reason when replay lacks the service-role key', () => {
    const message = formatHistoricalCiReplayFailure(
      'historical CI ledger/source count mismatch: 2567 facts vs 2568 matchup rows',
      new Error('Missing SUPABASE_SERVICE_ROLE_KEY.'),
    );

    expect(message).toContain('historical CI ledger/source count mismatch: 2567 facts vs 2568 matchup rows');
    expect(message).toContain('Missing SUPABASE_SERVICE_ROLE_KEY.');
    expect(message).toContain('deterministic replay fallback failed');
  });
});
