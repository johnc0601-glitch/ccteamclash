'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import styles from './ClashRatingFinalization.module.css';

// Keep write actions invisible until the staging HTTP flows have been verified.
const FINALIZATION_ACTION_ENABLED = false;
const CORRECTION_ACTION_ENABLED = false;

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

type RebuildSummary = {
  correctionId: string | null;
  rebuiltEvents: number;
  failedEvent: {eventKey: string; eventOrder: number; message: string} | null;
  remainingEvents: number;
};

type FinalizeResponse = {
  ok?: boolean;
  mode?: 'preview' | 'finalize';
  runId?: string;
  preview?: PreviewSummary;
  rebuild?: RebuildSummary;
  error?: string;
};

type FinalizationStatus = {
  ok?: boolean;
  finalized?: boolean;
  eventOrder?: number | null;
  eventLabel?: string | null;
  finalizedAt?: string | null;
  error?: string;
};

type CorrectionSummary = {
  correctionId?: string;
  seasonId: string;
  startingEventOrder: number;
  invalidatedEvents: number;
  invalidatedPlayerRows: number;
  affectedPlayers: number;
};

type CorrectionResponse = {
  ok?: boolean;
  summary?: CorrectionSummary;
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
  const [correctionArmed, setCorrectionArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [finalized, setFinalized] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
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
    let cancelled = false;
    setPreview(null);
    setCorrectionArmed(false);
    setMessage('');
    setError('');
    setFinalized(false);

    if (!selectedRoundId) return () => { cancelled = true; };

    setCheckingStatus(true);
    void requestFinalizationStatus(selectedRoundId)
      .then((status) => {
        if (!cancelled) setFinalized(Boolean(status.finalized));
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to check Clash rating status.');
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingStatus(false);
      });

    return () => { cancelled = true; };
  }, [selectedRoundId]);

  async function reviewFinalization() {
    if (!selectedRoundId || !complete || finalized || busy) return;
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
    if (!selectedRoundId || !preview || finalized || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await requestFinalization(selectedRoundId, 'finalize');
      setPreview(null);
      setFinalized(true);

      const roundNumber = response.preview?.eventOrder ?? round?.number ?? '';
      const rebuild = response.rebuild;
      if (rebuild?.failedEvent) {
        setMessage(`Round ${roundNumber} finalized. Automatic rebuild stopped at Round ${rebuild.failedEvent.eventOrder}.`);
        setError(rebuild.failedEvent.message);
      } else if (rebuild?.correctionId && rebuild.rebuiltEvents > 1) {
        setMessage(`Round ${roundNumber} finalized and ${rebuild.rebuiltEvents - 1} later rating event${rebuild.rebuiltEvents === 2 ? '' : 's'} rebuilt automatically.`);
      } else {
        setMessage(`Round ${roundNumber} Clash Index ratings finalized.`);
      }
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to finalize Clash ratings.');
    } finally {
      setBusy(false);
    }
  }

  async function prepareCorrection() {
    if (!selectedRoundId || !finalized || !correctionArmed || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await requestCorrection(selectedRoundId);
      if (!response.summary) throw new Error('The correction reset returned no summary.');
      setCorrectionArmed(false);
      setFinalized(false);
      setMessage(
        `Clash ratings reset from Round ${response.summary.startingEventOrder}. `
        + `${response.summary.invalidatedEvents} event${response.summary.invalidatedEvents === 1 ? '' : 's'} will rebuild after the corrected result is republished and finalized.`,
      );
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to prepare Clash rating correction.');
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = finalized
    ? 'Finalized'
    : checkingStatus
      ? 'Checking status'
      : complete
        ? 'Ready to finalize'
        : 'Waiting for results';

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
        {finalized ? <p className={styles.message}>This event&apos;s Clash Index ratings are finalized.</p> : null}
        {message ? <p className={styles.message} role="status">{message}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
      <div className={styles.actionArea}>
        <span className={finalized ? styles.finalized : complete ? styles.ready : styles.waiting}>
          {statusLabel}
        </span>

        {FINALIZATION_ACTION_ENABLED && complete && !finalized && !preview ? (
          <button type="button" disabled={busy || checkingStatus} onClick={() => void reviewFinalization()}>
            {busy ? 'Checking ratings…' : 'Finalize Event & Update Clash Index'}
          </button>
        ) : null}

        {FINALIZATION_ACTION_ENABLED && preview && !finalized ? (
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

        {CORRECTION_ACTION_ENABLED && finalized && !correctionArmed ? (
          <button type="button" className={styles.secondary} disabled={busy} onClick={() => setCorrectionArmed(true)}>
            Correct Finalized Results
          </button>
        ) : null}

        {CORRECTION_ACTION_ENABLED && finalized && correctionArmed ? (
          <div className={styles.confirmation}>
            <strong>Prepare rating correction?</strong>
            <p>
              This removes Clash rating updates for this event and every later finalized event. Match results stay in place until you reopen the result you need to fix.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => setCorrectionArmed(false)}>
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={() => void prepareCorrection()}>
                {busy ? 'Resetting ratings…' : 'Confirm Rating Reset'}
              </button>
            </div>
          </div>
        ) : null}

        {!FINALIZATION_ACTION_ENABLED || !CORRECTION_ACTION_ENABLED ? (
          <small>
            Rating finalization and correction are being verified in staging. No rating write action is exposed yet.
          </small>
        ) : finalized ? (
          <small>This event has already been finalized.</small>
        ) : !complete ? (
          <small>Publish every eligible match result before ratings can be finalized.</small>
        ) : null}
      </div>
    </section>
  );
}

async function requestFinalizationStatus(roundId: string): Promise<FinalizationStatus> {
  const response = await fetch(`/api/commissioner/clash-ratings/finalize?roundId=${encodeURIComponent(roundId)}`, {
    method: 'GET',
    cache: 'no-store',
  });
  const body = await response.json() as FinalizationStatus;
  if (!response.ok) throw new Error(body.error || 'Clash rating status request failed.');
  return body;
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

async function requestCorrection(roundId: string): Promise<CorrectionResponse> {
  const response = await fetch('/api/commissioner/clash-ratings/correction', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({roundId}),
  });
  const body = await response.json() as CorrectionResponse;
  if (!response.ok) throw new Error(body.error || 'Clash rating correction request failed.');
  return body;
}
