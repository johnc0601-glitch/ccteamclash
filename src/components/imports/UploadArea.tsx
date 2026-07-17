'use client';

import {useState} from 'react';
import type {ImportFieldErrors, ImportJobInput} from '@/domain/import/ImportJob';
import type {ImportWorkspace} from '@/domain/import/ImportService';
import {getChallengeLabel, getTeamName} from '@/components/imports/importDisplay';
import styles from './ImportManagement.module.css';

type UploadAreaProps = {
  workspace: ImportWorkspace;
  fieldErrors: ImportFieldErrors;
  submitting: boolean;
  onSubmit: (values: ImportJobInput) => void;
  onCancel: () => void;
};

const DEFAULT_VALUES: ImportJobInput = {
  seasonId: '',
  challengeId: '',
  homeTeamId: '',
  awayTeamId: '',
  filename: '',
  source: 'Official Scoring Export',
  importedBy: 'Commissioner',
};

export function UploadArea({
  workspace,
  fieldErrors,
  submitting,
  onSubmit,
  onCancel,
}: UploadAreaProps) {
  const [values, setValues] = useState<ImportJobInput>(DEFAULT_VALUES);

  function setValue<Key extends keyof ImportJobInput>(key: Key, value: ImportJobInput[Key]) {
    setValues((current) => ({...current, [key]: value}));
  }

  function handleChallengeChange(challengeId: string) {
    const challenge = workspace.challenges.find((candidate) => candidate.id === challengeId);
    setValues((current) => ({
      ...current,
      challengeId,
      seasonId: challenge?.seasonId ?? current.seasonId,
      homeTeamId: challenge?.homeTeamId ?? current.homeTeamId,
      awayTeamId: challenge?.awayTeamId ?? current.awayTeamId,
    }));
  }

  return (
    <form
      className={styles.importForm}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className={styles.uploadDropzone}>
        <span>Upload file</span>
        <strong>{values.filename || 'Choose an official scoring export'}</strong>
        <input
          data-initial-focus
          type="file"
          accept=".json,.csv"
          aria-invalid={Boolean(fieldErrors.filename)}
          onChange={(event) => setValue('filename', event.target.files?.[0]?.name ?? '')}
        />
        {fieldErrors.filename ? <span className={styles.fieldError}>{fieldErrors.filename}</span> : null}
      </div>

      <div className={styles.formGrid}>
        <label className={styles.fullField}>
          <span>Challenge</span>
          <select
            value={values.challengeId}
            aria-invalid={Boolean(fieldErrors.challengeId)}
            onChange={(event) => handleChallengeChange(event.target.value)}
          >
            <option value="">Select a scheduled challenge</option>
            {workspace.challenges.map((challenge) => (
              <option key={challenge.id} value={challenge.id}>
                {getChallengeLabel(challenge, workspace.teams)}
              </option>
            ))}
          </select>
          {fieldErrors.challengeId ? <span className={styles.fieldError}>{fieldErrors.challengeId}</span> : null}
        </label>

        <label>
          <span>Season</span>
          <select
            value={values.seasonId}
            aria-invalid={Boolean(fieldErrors.seasonId)}
            onChange={(event) => setValue('seasonId', event.target.value)}
          >
            <option value="">Select season</option>
            {workspace.seasons.map((season) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
          {fieldErrors.seasonId ? <span className={styles.fieldError}>{fieldErrors.seasonId}</span> : null}
        </label>

        <label>
          <span>Source</span>
          <select
            value={values.source}
            aria-invalid={Boolean(fieldErrors.source)}
            onChange={(event) => setValue('source', event.target.value)}
          >
            <option value="Official Scoring Export">Official Scoring Export</option>
            <option value="Manual Preview">Manual Preview</option>
            <option value="REST API">REST API</option>
            <option value="Live Sync">Live Sync</option>
          </select>
          {fieldErrors.source ? <span className={styles.fieldError}>{fieldErrors.source}</span> : null}
        </label>

        <label>
          <span>Home team</span>
          <select
            value={values.homeTeamId}
            aria-invalid={Boolean(fieldErrors.homeTeamId)}
            onChange={(event) => setValue('homeTeamId', event.target.value)}
          >
            <option value="">Select home team</option>
            {workspace.teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          {fieldErrors.homeTeamId ? <span className={styles.fieldError}>{fieldErrors.homeTeamId}</span> : null}
        </label>

        <label>
          <span>Away team</span>
          <select
            value={values.awayTeamId}
            aria-invalid={Boolean(fieldErrors.awayTeamId)}
            onChange={(event) => setValue('awayTeamId', event.target.value)}
          >
            <option value="">Select away team</option>
            {workspace.teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          {fieldErrors.awayTeamId ? <span className={styles.fieldError}>{fieldErrors.awayTeamId}</span> : null}
        </label>

        <label className={styles.fullField}>
          <span>Imported by</span>
          <input
            value={values.importedBy}
            aria-invalid={Boolean(fieldErrors.importedBy)}
            onChange={(event) => setValue('importedBy', event.target.value)}
          />
          {fieldErrors.importedBy ? <span className={styles.fieldError}>{fieldErrors.importedBy}</span> : null}
        </label>
      </div>

      <div className={styles.uploadHint}>
        {values.homeTeamId && values.awayTeamId
          ? `${getTeamName(values.homeTeamId, workspace.teams)} vs ${getTeamName(values.awayTeamId, workspace.teams)}`
          : 'Select a challenge to populate season and team fields.'}
      </div>

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.primaryButton} disabled={submitting}>
          {submitting ? 'Uploading...' : 'Create import job'}
        </button>
      </div>
    </form>
  );
}

