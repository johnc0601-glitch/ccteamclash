'use client';

import {useState} from 'react';

type SyncSummary = {
  updated: number;
  unchanged: number;
  'no-current-rating': number;
  'not-found': number;
  error: number;
};

type SyncResponse = {
  ok?: boolean;
  total?: number;
  summary?: SyncSummary;
  error?: string;
};

export function PdgaRatingSyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch('/api/commissioner/pdga/sync', {
        method: 'POST',
      });
      const payload = await response.json() as SyncResponse;

      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? 'PDGA rating sync failed.');
      }

      const summary = payload.summary;
      setMessage(
        `PDGA sync complete: ${summary.updated} updated, ${summary.unchanged} unchanged, ` +
        `${summary['no-current-rating']} without a current rating, ${summary['not-found']} not found, ${summary.error} errors.`,
      );
      setIsError(summary.error > 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PDGA rating sync failed.');
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
            Refresh ratings for active players with a PDGA number.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Syncing PDGA ratings…' : 'Sync PDGA Ratings'}
        </button>
      </div>
      {message ? (
        <p className={`mt-3 text-sm ${isError ? 'text-red-700' : 'text-emerald-700'}`}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
