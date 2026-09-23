'use client';

import {useState} from 'react';

type SyncSummary = {
  updated: number;
  unchanged: number;
  'no-current-rating': number;
  'not-found': number;
  deferred: number;
  error: number;
};

type SyncResponse = {
  ok?: boolean;
  total?: number;
  processed?: number;
  summary?: SyncSummary;
  stoppedEarly?: boolean;
  stopReason?: string;
  error?: string;
};

type ImportResponse = {
  ok?: boolean;
  total?: number;
  updated?: number;
  unchanged?: number;
  conflicts?: Array<{id: string; current: string; recovered: string}>;
  missing?: string[];
  error?: string;
};

export function PdgaRatingSyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [rolloverPreview, setRolloverPreview] = useState<Array<{playerId: string; name: string; previousCi: number | null; startingCi: number; rule: string}> | null>(null);

  async function handleRollover(apply: boolean) {
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const response = await fetch('/api/commissioner/ci/rollover', {method: apply ? 'POST' : 'GET'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'CI rollover failed.');
      setRolloverPreview(apply ? null : result.players);
      setMessage(apply ? `Starting CI saved for ${result.players.length} players.` : 'Review the starting CIs below, then apply before the season starts.');
    } catch (error) {
      setRolloverPreview(null);
      setMessage(error instanceof Error ? error.message : 'CI rollover failed.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  async function runSync(): Promise<SyncResponse> {
    const response = await fetch('/api/commissioner/pdga/sync', {method: 'POST'});
    const payload = await response.json() as SyncResponse;
    if (!response.ok || !payload.summary) {
      throw new Error(payload.error ?? 'PDGA rating sync failed.');
    }
    return payload;
  }

  async function handleSync() {
    setRolloverPreview(null);
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const result = await runSync();
      const summary = result.summary!;
      setMessage(formatSyncSummary('PDGA sync complete:', summary, result.stopReason));
      setIsError(summary.error > 0 || summary.deferred > 0 || Boolean(result.stoppedEarly));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PDGA rating sync failed.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setRolloverPreview(null);
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch('/api/commissioner/pdga/import-recovered', {method: 'POST'});
      const imported = await response.json() as ImportResponse;
      if (!response.ok || !imported.ok) {
        throw new Error(imported.error ?? 'Recovered PDGA import failed.');
      }

      const sync = await runSync();
      const summary = sync.summary!;
      const conflicts = imported.conflicts?.length ?? 0;
      const missing = imported.missing?.length ?? 0;
      const importPrefix =
        `Imported ${imported.updated ?? 0} recovered PDGA numbers, ${imported.unchanged ?? 0} already matched, ` +
        `${conflicts} conflicts, ${missing} missing records. Ratings:`;
      setMessage(formatSyncSummary(importPrefix, summary, sync.stopReason));
      setIsError(
        conflicts > 0
        || missing > 0
        || summary.error > 0
        || summary.deferred > 0
        || Boolean(sync.stoppedEarly)
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Recovered PDGA import failed.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">PDGA ratings</h2>
          <p className="text-sm text-slate-600">
            Import recovered PDGA numbers or refresh ratings for active players.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Working…' : 'Import Recovered PDGA Data'}
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Working…' : 'Sync PDGA Ratings'}
          </button>
        </div>
      </div>
      {message ? (
        <p className={`mt-3 text-sm ${isError ? 'text-red-700' : 'text-emerald-700'}`}>
          {message}
        </p>
      ) : null}
      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-sm text-slate-600">Season starting CI: 50/50 when the PDGA rating is newer than the player’s final prior-season match; otherwise 80/20. No PDGA carries CI forward; new players start from PDGA.</p>
        <button type="button" disabled={loading} onClick={() => handleRollover(false)} className="mt-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60">Preview starting CI</button>
        {rolloverPreview ? <div className="mt-3">
          <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Player</th><th>Current CI</th><th>Starting CI</th></tr></thead><tbody>
            {rolloverPreview.map((player) => <tr key={player.playerId}><td>{player.name}</td><td>{player.previousCi ?? '—'}</td><td>{player.startingCi}</td></tr>)}
          </tbody></table></div>
          <button type="button" disabled={loading} onClick={() => handleRollover(true)} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Apply starting CI</button>
        </div> : null}
      </div>
    </section>
  );
}

function formatSyncSummary(prefix: string, summary: SyncSummary, stopReason?: string): string {
  const base =
    `${prefix} ${summary.updated} updated, ${summary.unchanged} unchanged, ` +
    `${summary['no-current-rating']} without a current rating, ${summary['not-found']} not found, ` +
    `${summary.deferred} deferred, ${summary.error} errors.`;
  return stopReason ? `${base} ${stopReason}` : base;
}
