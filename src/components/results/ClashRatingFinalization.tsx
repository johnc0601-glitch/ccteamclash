'use client';

import {useMemo} from 'react';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import styles from './ClashRatingFinalization.module.css';

type ClashRatingFinalizationProps = {
  rounds: Round[];
  matches: Match[];
  results: MatchResult[];
  selectedRoundId: string;
};

export function ClashRatingFinalization({
  rounds,
  matches,
  results,
  selectedRoundId,
}: ClashRatingFinalizationProps) {
  const round = rounds.find((candidate) => candidate.id === selectedRoundId);
  const roundMatches = useMemo(
    () => matches.filter((match) => match.roundId === selectedRoundId),
    [matches, selectedRoundId],
  );
  const publishedIds = useMemo(
    () => new Set(results.filter((result) => result.status === 'Published').map((result) => result.matchId)),
    [results],
  );
  const publishedCount = roundMatches.filter((match) => publishedIds.has(match.id)).length;
  const complete = roundMatches.length > 0 && publishedCount === roundMatches.length;

  return (
    <section className={styles.panel} aria-labelledby="clash-rating-finalization-title">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>Clash Index</span>
        <h2 id="clash-rating-finalization-title">Finalize event ratings</h2>
        <p>
          {round
            ? `${publishedCount} of ${roundMatches.length} match results are published for Round ${round.number}.`
            : 'Select a round to review rating readiness.'}
        </p>
      </div>
      <div className={styles.actionArea}>
        <span className={complete ? styles.ready : styles.waiting}>
          {complete ? 'Ready to finalize' : 'Waiting for results'}
        </span>
        <button type="button" disabled title="Rating writer connection is being completed on this feature branch.">
          Finalize Event & Update Clash Index
        </button>
        <small>
          The action remains locked until all match results are published and the rating writer passes end-to-end testing.
        </small>
      </div>
    </section>
  );
}
