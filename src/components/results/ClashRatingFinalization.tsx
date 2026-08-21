'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import styles from './ClashRatingFinalization.module.css';

// Keep the write action invisible until the staging HTTP flow has been verified.
const FINALIZATION_ACTION_ENABLED = false;

type ClashRatingFinalizationProps = {
  rounds: Round[];
  matches: Match[];
  results: MatchResult[];
  selectedRoundId: string;
};

type PreviewSummary = {
  roundId: string;
  seasonId: string;
  eventOrder: number;
  eventLabel: string;
  eligibleMatches: number;
  publishedMatches: number;
  participatingPlayers: number;
  ratedContests: number;
};

type FinalizeResponse = {
  ok?: boolean;
  mode?: 'preview' | 'finalize';
  runId?: string;
  preview?: PreviewSummary;
  error?: string;
};

export function ClashRatingFinalization({
  rounds,
  matches,
  results,
  selectedRoundId,
}: ClashRatingFinalizationProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const round = rounds.find((candidate) => candidate.id === selectedRoundId);
  const roundMatches = useMemo(
    () => matches.filter((match) =>
      match.roundId === selectedRoundId
      && match.status !== 'Cancelled'
      && match.status !== 'Postponed'),
    [matches, selectedRoundId],
  );
  const publishedIds = useMemo(
    () => new Set(results.filter((result) => result.status === 'Published').map((result) => result.matchId)),
    [results],
  );
  const publishedCount = roundMatches.filter((match) => publishedIds.has(match.id)).length;
  const complete = roundMatches.length > 0 && publishedCount === roundMatches.length;

  useEffect(() => {
    setPreview(null);
    setMessage('');
    setError('');
  }, [selectedRoundId]);

  async function reviewFinalization() {
    if (!selectedRoundId || !complete || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await requestFinalization(selectedRoundId, 'preview');
      if (!response.preview) throw new Error('The rating preview returned no event summary.');
      setPreview(response.preview);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to preview Clash ratings.');
    } finally {
      setBusy(false);
    }
  }

  async function finalizeRatings() {
    if (!selectedRoundId || !preview || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await requestFinalization(selectedRoundId, 'finalize');
      setPreview(null);
      setMessage(`Round ${response.preview?.eventOrder ?? round?.number ?? ''} Clash Index ratings finalized.`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to finalize Clash ratings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="clash-rating-finalization-title">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>Clash Index</span>
        <h2 id="clash-rating-finalization-title">Finalize event ratings</h2>
        <p>
          {round
            ? `${publishedCount} of ${roundMatches.length} eligible match results are published for Round ${round.number}.`
            : 'Select a round to review rating readiness.'}
        </p>
        {message ? <p className={styles.message} role="status">{message}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
      <div className={styles.actionArea}>
        <span className={complete ? styles.ready : styles.waiting}>
          {complete ? 'Ready to finalize' : 'Waiting for results'}
        </span>

        {FINALIZATION_ACTION_ENABLED && complete && !preview ? (
          <button type="button" disabled={busy} onClick={() => void reviewFinalization()}>
            {busy ? 'Checking ratings…' : 'Finalize Event & Update Clash Index'}
          </button>
        ) : null}

        {FINALIZATION_ACTION_ENABLED && preview ? (
          <div className={styles.confirmation}>
            <strong>Confirm {preview.eventLabel}</strong>
            <p>
              {preview.publishedMatches} matches · {preview.ratedContests} player contests · {preview.participatingPlayers} players
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => setPreview(null)}>
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={() => void finalizeRatings()}>
                {busy ? 'Finalizing…' : 'Confirm & Update Ratings'}
              </button>
            </div>
          </div>
        ) : null}

        {!FINALIZATION_ACTION_ENABLED ? (
          <small>
            Rating finalization is being verified in staging. No write action is exposed yet.
          </small>
        ) : !complete ? (
          <small>Publish every eligible match result before ratings can be finalized.</small>
        ) : null}
      </div>
    </section>
  );
}

async function requestFinalization(roundId: string, mode: 'preview' | 'finalize'): Promise<FinalizeResponse> {
  const response = await fetch('/api/commissioner/clash-ratings/finalize', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({roundId, mode}),
  });
  const body = await response.json() as FinalizeResponse;
  if (!response.ok) throw new Error(body.error || 'Clash rating request failed.');
  return body;
}
