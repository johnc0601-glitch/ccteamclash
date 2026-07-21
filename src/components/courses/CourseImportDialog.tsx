'use client';

import {useMemo, useState, type FormEvent} from 'react';
import {DialogShell} from '@/components/teams/DialogShell';
import type {CourseImportInput, CourseImportResult} from '@/domain/course/Course';
import type {Team} from '@/models/Team';
import styles from './CourseManagement.module.css';

type CourseImportDialogProps = {
  teams: Team[];
  submitting: boolean;
  result: CourseImportResult | null;
  onImport: (courses: CourseImportInput[]) => void;
  onClose: () => void;
};

type ParsedRow = CourseImportInput & {
  row: number;
};

const SAMPLE_IMPORT = `name,city,state,googleMapsUrl,udiscUrl,homeTeam,active
Castle Hayne Disc Golf Course,Wilmington,NC,https://maps.app.goo.gl/example,https://udisc.com/courses/example,Riptide,true`;

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ',' && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseActive(value: string): boolean | undefined {
  const normalized = normalize(value);
  if (!normalized) return undefined;
  return ['true', 'yes', 'y', '1', 'active'].includes(normalized);
}

function createTeamLookup(teams: Team[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const team of teams) {
    lookup.set(normalize(team.id), team.id);
    lookup.set(normalize(team.name), team.id);
    lookup.set(normalize(team.shortName), team.id);
  }
  return lookup;
}

function parseCourseImport(text: string, teams: Team[]): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => normalize(header));
  const teamLookup = createTeamLookup(teams);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const rowValues = new Map(headers.map((header, valueIndex) => [header, values[valueIndex] ?? '']));
    const homeTeam = rowValues.get('hometeam') ?? rowValues.get('home team') ?? '';
    const homeTeamId = rowValues.get('hometeamid') || rowValues.get('home team id') || teamLookup.get(normalize(homeTeam));

    return {
      row: index + 2,
      name: rowValues.get('name') ?? '',
      city: rowValues.get('city') ?? '',
      state: rowValues.get('state') ?? 'NC',
      address: rowValues.get('address') ?? '',
      mapUrl: rowValues.get('googlemapsurl')
        ?? rowValues.get('google maps url')
        ?? rowValues.get('mapurl')
        ?? rowValues.get('map url')
        ?? '',
      udiscUrl: rowValues.get('udiscurl') ?? rowValues.get('udisc url') ?? '',
      homeTeamId: homeTeamId || undefined,
      active: parseActive(rowValues.get('active') ?? ''),
    };
  });
}

export function CourseImportDialog({
  teams,
  submitting,
  result,
  onImport,
  onClose,
}: CourseImportDialogProps) {
  const [text, setText] = useState(SAMPLE_IMPORT);
  const parsedRows = useMemo(() => parseCourseImport(text, teams), [teams, text]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onImport(parsedRows);
  }

  return (
    <DialogShell title="Import courses" eyebrow="Course directory" onClose={onClose} size="large">
      <form className={styles.courseForm} onSubmit={handleSubmit}>
        <div className={styles.importIntro}>
          <p>Paste rows from a spreadsheet. Google Maps should be the direct place link. UDisc is optional.</p>
          <strong>{parsedRows.length} {parsedRows.length === 1 ? 'course' : 'courses'} ready</strong>
        </div>
        <label className={styles.fullWidth}>
          <span>Course import</span>
          <textarea
            className={styles.importText}
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
          />
        </label>
        {result ? (
          <div className={styles.importResult} role="status">
            <strong>{result.created.length} created</strong>
            <strong>{result.updated.length} updated</strong>
            <strong>{result.skipped.length} skipped</strong>
          </div>
        ) : null}
        {result?.skipped.length ? (
          <ul className={styles.importErrors}>
            {result.skipped.map((skipped) => (
              <li key={skipped.row}>Row {skipped.row}: {skipped.message}</li>
            ))}
          </ul>
        ) : null}
        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          <button type="submit" className={styles.primaryButton} disabled={submitting || parsedRows.length === 0}>
            {submitting ? 'Importing...' : 'Import courses'}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
