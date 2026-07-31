'use client';

import {useState, type ChangeEvent} from 'react';
import {DialogShell} from '@/components/teams/DialogShell';
import type {Course} from '@/domain/course/Course';
import {
  parseScheduleImportFile,
  ScheduleImportConversionError,
  type ScheduleImportParseResult,
} from '@/domain/schedule/ScheduleImportAdapters';
import {
  validateScheduleImport,
  type ScheduleImportData,
} from '@/domain/schedule/ScheduleImport';
import type {Season} from '@/domain/season/Season';
import type {Team} from '@/models/Team';
import {services} from '@/core/ServiceContainer';
import styles from './ScheduleManagement.module.css';

export type {ScheduleImportData} from '@/domain/schedule/ScheduleImport';

type Props = {
  seasons: Season[];
  teams: Team[];
  courses: Course[];
  importing: boolean;
  onImport: (data: ScheduleImportData) => void;
  onClose: () => void;
};

export function ScheduleImportDialog({
  seasons,
  teams,
  courses,
  importing,
  onImport,
  onClose,
}: Props) {
  const [filename, setFilename] = useState('');
  const [preview, setPreview] = useState<ScheduleImportData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<ScheduleImportParseResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingAlias, setSavingAlias] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
    setFilename(file?.name ?? '');
    setPreview(null);
    setErrors([]);
    setDiagnostics(null);
    if (!file) return;
    await processFile(file);
  }

  async function processFile(file: File) {
    const activeSeason = seasons.find((season) => season.active && !season.archived);
    if (!activeSeason) {
      setErrors(['No active season is available for this import.']);
      return;
    }

    try {
      const aliases = await services.schedules.getTeamAliases();
      const parsed = await parseScheduleImportFile(file, activeSeason, teams, courses, aliases);
      setDiagnostics(parsed);
      if (parsed.ambiguities.length) return;
      const result = validateScheduleImport(parsed.data, seasons, teams, courses);
      setErrors(result.errors);
      setPreview(result.data);
    } catch (error) {
      if (error instanceof ScheduleImportConversionError) {
        setDiagnostics({data: null, ...error.diagnostics});
      }
      setErrors([error instanceof Error ? error.message : 'The schedule file could not be parsed.']);
    }
  }

  async function rememberTeamMapping(importedName: string, teamId: string) {
    if (!selectedFile || !teamId) return;
    setSavingAlias(true);
    try {
      await services.schedules.saveTeamAlias(importedName, teamId);
      await processFile(selectedFile);
    } catch {
      setErrors([`The mapping for "${importedName}" could not be saved.`]);
    } finally {
      setSavingAlias(false);
    }
  }

  return (
    <DialogShell title="Import schedule" eyebrow="Schedule file" onClose={onClose} size="large">
      <div className={styles.scheduleImport}>
        <label className={styles.importFile}>
          <span>JSON, CSV, or Excel file</span>
          <input
            autoFocus
            data-initial-focus
            type="file"
            accept="application/json,text/csv,.json,.csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFile}
          />
        </label>

        {diagnostics ? (
          <section className={styles.importDiagnostics} aria-live="polite">
            <strong>{diagnostics.format} parsed successfully.</strong>
            {diagnostics.columns.length ? (
              <>
                <span>Found columns:</span>
                <ul>{diagnostics.columns.map((column) => <li key={column}>{column}</li>)}</ul>
                <span>Converting...</span>
              </>
            ) : null}
            {diagnostics.matchCount ? (
              <p>{diagnostics.matchCount} {diagnostics.matchCount === 1 ? 'match' : 'matches'} detected.</p>
            ) : null}
            {diagnostics.mappings.length ? (
              <div className={styles.importMappings}>
                <strong>Team mappings</strong>
                <ul>{diagnostics.mappings.map((mapping) => (
                  <li key={`${mapping.importedName}-${mapping.teamId}`}>
                    “{mapping.importedName}” → {mapping.teamName}
                  </li>
                ))}</ul>
              </div>
            ) : null}
            {diagnostics.ambiguities.map((ambiguity) => (
              <label key={ambiguity.importedName} className={styles.importChoice}>
                <span>Which team is “{ambiguity.importedName}”?</span>
                <select
                  defaultValue=""
                  disabled={savingAlias}
                  onChange={(event) => void rememberTeamMapping(ambiguity.importedName, event.target.value)}
                >
                  <option value="" disabled>Choose a team</option>
                  {ambiguity.candidates.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>
        ) : null}

        {errors.length ? (
          <div className={styles.importErrors} role="alert">
            <ul>{errors.map((error) => <li key={error}>❌ {error}</li>)}</ul>
          </div>
        ) : null}

        {preview ? (
          <section className={styles.importPreview} aria-label="Schedule import preview">
            <span>Preview</span>
            <h3>{preview.name}</h3>
            <p>{filename} &middot; {preview.rounds.length} {preview.rounds.length === 1 ? 'round' : 'rounds'} &middot;{' '}
              {preview.rounds.reduce((total, round) => total + round.matches.length, 0)} matches
            </p>
            <ol>
              {preview.rounds.map((round) => (
                <li key={`${round.number}-${round.name}`}>
                  <strong>Round {round.number}: {round.name}</strong>
                  <span>{round.date} &middot; {round.matches.length} matches</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!preview || importing}
            onClick={() => preview && onImport(preview)}
          >
            {importing ? 'Importing...' : 'Import schedule'}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
