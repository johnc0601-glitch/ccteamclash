'use client';

import {useState, type FormEvent} from 'react';
import {DialogShell} from '@/components/teams/DialogShell';
import type {Player} from '@/models/Player';
import type {Team} from '@/models/Team';
import type {PlayerFieldErrors, PlayerInput} from '@/types/player';
import styles from './PlayerManagement.module.css';

type PlayerFormDialogProps = {
  player?: Player;
  teams: Team[];
  fieldErrors: PlayerFieldErrors;
  submitting: boolean;
  onSubmit: (input: PlayerInput) => void;
  onClose: () => void;
};

function getInitialValues(player?: Player): PlayerInput {
  return player ? {
    name: player.name,
    teamId: player.teamId,
    pdgaNumber: player.pdgaNumber,
    pdgaRating: player.pdgaRating,
    eligibleForWomensRanking: player.eligibleForWomensRanking,
  } : {
    name: '',
    teamId: '',
    pdgaNumber: '',
    pdgaRating: null,
    eligibleForWomensRanking: false,
  };
}

export function PlayerFormDialog({
  player,
  teams,
  fieldErrors,
  submitting,
  onSubmit,
  onClose,
}: PlayerFormDialogProps) {
  const [values, setValues] = useState<PlayerInput>(() => getInitialValues(player));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <DialogShell
      title={player ? 'Edit player' : 'Add player'}
      eyebrow="Player management"
      onClose={onClose}
    >
      <form className={styles.playerForm} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          <label>
            <span>Player name</span>
            <input
              autoFocus
              data-initial-focus
              value={values.name}
              onChange={(event) => setValues((current) => ({...current, name: event.target.value}))}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? <small>{fieldErrors.name}</small> : null}
          </label>
          <label>
            <span>Current team</span>
            <select
              value={values.teamId}
              onChange={(event) => setValues((current) => ({...current, teamId: event.target.value}))}
              aria-invalid={Boolean(fieldErrors.teamId)}
            >
              <option value="">Select team</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
            {fieldErrors.teamId ? <small>{fieldErrors.teamId}</small> : null}
          </label>
          <label>
            <span>PDGA number (optional)</span>
            <input
              inputMode="numeric"
              value={values.pdgaNumber}
              onChange={(event) => setValues((current) => ({...current, pdgaNumber: event.target.value}))}
              aria-invalid={Boolean(fieldErrors.pdgaNumber)}
            />
            {fieldErrors.pdgaNumber ? <small>{fieldErrors.pdgaNumber}</small> : null}
          </label>
          <label>
            <span>PDGA rating (optional)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={values.pdgaRating ?? ''}
              onChange={(event) => setValues((current) => ({
                ...current,
                pdgaRating: event.target.value ? Number(event.target.value) : null,
              }))}
              aria-invalid={Boolean(fieldErrors.pdgaRating)}
            />
            {fieldErrors.pdgaRating ? <small>{fieldErrors.pdgaRating}</small> : null}
          </label>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={values.eligibleForWomensRanking}
              onChange={(event) => setValues((current) => ({
                ...current,
                eligibleForWomensRanking: event.target.checked,
              }))}
            />
            <span>Eligible for Women&apos;s Top 10</span>
          </label>
        </div>
        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.primaryButton} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save player'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
