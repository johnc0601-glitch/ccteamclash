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

  async function runSync() {
    const response = await fetch('/api/commissioner/pdga/sync', {method: 'POST'});
    const payload = await response.json() as SyncResponse;
    if (!response.ok || !payload.summary) {
      throw new Error(payload.error ?? 'PDGA rating sync failed.');
    }
    return payload.summary;
  }

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const summary = await runSync();
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

  async function handleImport() {
    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch('/api/commissioner/pdga/import-recovered', {method: 'POST'});
      const imported = await response.json() as ImportResponse;
      if (!response.ok || !imported.ok) {
        throw new Error(imported.error ?? 'Recovered PDGA import failed.');
      }

      const summary = await runSync();
      const conflicts = imported.conflicts?.length ?? 0;
      const missing = imported.missing?.length ?? 0;
      setMessage(
        `Imported ${imported.updated ?? 0} recovered PDGA numbers, ${imported.unchanged ?? 0} already matched, ` +
        `${conflicts} conflicts, ${missing} missing records. Ratings: ${summary.updated} updated, ` +
        `${summary.unchanged} unchanged, ${summary['no-current-rating']} without a current rating, ` +
        `${summary['not-found']} not found, ${summary.error} errors.`,
      );
      setIsError(conflicts > 0 || missing > 0 || summary.error > 0);
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
    </section>
  );
}
