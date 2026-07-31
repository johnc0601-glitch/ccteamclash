import {
  SCHEDULE_IMPORT_SCHEMA_VERSION,
  type ScheduleImportData,
  type ScheduleImportRound,
} from '@/domain/schedule/ScheduleImport';
import type {Course} from '@/domain/course/Course';
import type {Team} from '@/models/Team';
import type {Season} from '@/domain/season/Season';
import type {TeamAlias} from '@/repositories/TeamRepository';

const COLUMNS = {
  schemaVersion: {label: 'Schema Version', aliases: ['schema version', 'schemaversion']},
  seasonId: {label: 'Season ID', aliases: ['season id', 'seasonid']},
  scheduleName: {label: 'Schedule Name', aliases: ['schedule name', 'schedulename']},
  description: {label: 'Description', aliases: ['description']},
  roundNumber: {label: 'Event Number', aliases: ['event number', 'round number', 'roundnumber', 'eventnumber']},
  roundName: {label: 'Event', aliases: ['event', 'event name', 'round', 'round name', 'roundname']},
  roundDate: {label: 'Date', aliases: ['date', 'event date', 'round date', 'rounddate']},
  homeTeamId: {label: 'Home Team', aliases: ['home team', 'home team id', 'hometeam', 'hometeamid']},
  awayTeamId: {label: 'Away Team', aliases: ['away team', 'away team id', 'awayteam', 'awayteamid']},
  courseId: {label: 'Course', aliases: ['course', 'course id', 'courseid']},
  time: {label: 'Time', aliases: ['time', 'scheduled time', 'tee time']},
  notes: {label: 'Notes', aliases: ['notes']},
} as const;

type CanonicalColumn = keyof typeof COLUMNS;
const CANONICAL_REQUIRED_COLUMNS = Object.keys(COLUMNS)
  .filter((column) => !['description', 'notes'].includes(column)) as CanonicalColumn[];
const COMMISSIONER_REQUIRED_COLUMNS: CanonicalColumn[] = ['roundName', 'homeTeamId', 'awayTeamId'];

type TabularValue = string | number | boolean;
type TabularRow = TabularValue[];

export type ScheduleImportParseResult = {
  data: unknown;
  format: 'JSON' | 'CSV' | 'Excel';
  columns: string[];
  matchCount: number;
  mappings: TeamImportMapping[];
  ambiguities: TeamImportAmbiguity[];
};

export type TeamImportMapping = {importedName: string; teamId: string; teamName: string};
export type TeamImportAmbiguity = {importedName: string; candidates: Team[]};

export class ScheduleImportConversionError extends Error {
  constructor(
    message: string,
    readonly diagnostics: Omit<ScheduleImportParseResult, 'data'>,
  ) {
    super(message);
    this.name = 'ScheduleImportConversionError';
  }
}

export async function parseScheduleImportFile(
  file: File,
  season?: Season,
  teams: Team[] = [],
  courses: Course[] = [],
  aliases: TeamAlias[] = [],
): Promise<ScheduleImportParseResult> {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase();
  if (extension === 'json') {
    const parsed = JSON.parse(await file.text()) as unknown;
    if (season && isCommissionerJson(parsed)) {
      const rows = objectRows(Array.isArray(parsed) ? parsed : parsed.matches);
      const resolutions = createResolutionState();
      const data = scheduleRowsToImport(rows, teams, courses, season, aliases, resolutions);
      return {
        data,
        format: 'JSON',
        columns: rows[0]?.map(String) ?? [],
        matchCount: data.rounds.reduce((total, round) => total + round.matches.length, 0),
        ...resolutions,
      };
    }
    const data = parsed;
    return {data, format: 'JSON', columns: [], matchCount: countMatches(data), mappings: [], ambiguities: []};
  }
  const rows = extension === 'csv'
    ? parseCsv(await file.text())
    : extension === 'xlsx'
      ? await parseFirstWorksheet(await file.arrayBuffer())
      : null;
  if (rows) {
    const format: 'CSV' | 'Excel' = extension === 'csv' ? 'CSV' : 'Excel';
    const diagnostics: Omit<ScheduleImportParseResult, 'data'> = {
      format,
      columns: rows[0]?.map((value) => String(value).trim()).filter(Boolean) ?? [],
      matchCount: Math.max(0, rows.length - 1),
      mappings: [],
      ambiguities: [],
    };
    try {
      const resolutions = createResolutionState();
      const data = scheduleRowsToImport(rows, teams, courses, season, aliases, resolutions);
      return {
        data,
        ...diagnostics,
        matchCount: data.rounds.reduce((total, round) => total + round.matches.length, 0),
        ...resolutions,
      };
    } catch (error) {
      throw new ScheduleImportConversionError(
        error instanceof Error ? error.message : 'The schedule rows could not be converted.',
        diagnostics,
      );
    }
  }
  throw new Error('Select a .json, .csv, or .xlsx file.');
}

export async function parseXlsxSchedule(buffer: ArrayBuffer): Promise<ScheduleImportData> {
  return scheduleRowsToImport(await parseFirstWorksheet(buffer));
}

export function parseCsv(value: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && value[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('The CSV contains an unterminated quoted value.');
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function scheduleRowsToImport(
  rows: TabularRow[],
  teams: Team[] = [],
  courses: Course[] = [],
  season?: Season,
  aliases: TeamAlias[] = [],
  resolutions = createResolutionState(),
): ScheduleImportData {
  if (rows.length < 2) throw new Error('The spreadsheet must contain a header and at least one match.');
  const headers = rows[0].map((value) => String(value).trim());
  const columnIndexes = new Map<CanonicalColumn, number>();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    const canonical = (Object.entries(COLUMNS) as [CanonicalColumn, typeof COLUMNS[CanonicalColumn]][])
      .find(([, details]) => details.aliases.some((alias) => normalizeHeader(alias) === normalized))?.[0];
    if (canonical && !columnIndexes.has(canonical)) columnIndexes.set(canonical, index);
  });
  const requiredColumns = season ? COMMISSIONER_REQUIRED_COLUMNS : CANONICAL_REQUIRED_COLUMNS;
  const missing = requiredColumns.filter((column) => !columnIndexes.has(column));
  if (missing.length) {
    throw new Error(`Missing required column${missing.length === 1 ? '' : 's'}: ${missing.map((column) => COLUMNS[column].label).join(', ')}.`);
  }

  const read = (row: TabularRow, column: CanonicalColumn): TabularValue =>
    row[columnIndexes.get(column) ?? -1] ?? '';
  const readText = (row: TabularRow, column: CanonicalColumn): string =>
    String(read(row, column)).trim();
  const first = rows[1];
  const rounds = new Map<number, ScheduleImportRound>();
  const roundNumbers = new Map<string, number>();
  const teamIds = createTeamLookup(teams, aliases);
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const courseIds = createIdentifierLookup(courses);

  for (const row of rows.slice(1)) {
    if (!row.some((value) => String(value).trim())) continue;
    const roundName = readText(row, 'roundName');
    const roundKey = roundName.toLocaleLowerCase();
    const roundNumber = season
      ? roundNumbers.get(roundKey) ?? roundNumbers.size + 1
      : Number(read(row, 'roundNumber'));
    if (season && !roundNumbers.has(roundKey)) roundNumbers.set(roundKey, roundNumber);
    const rowDate = formatSpreadsheetDate(read(row, 'roundDate')) || null;
    let round = rounds.get(roundNumber);
    if (!round) {
      round = {
        number: roundNumber,
        name: roundName,
        date: rowDate,
        matches: [],
      };
      rounds.set(roundNumber, round);
    } else if (rowDate && round.date && rowDate !== round.date) {
      throw new Error(`Event "${roundName}" contains conflicting dates: ${round.date} and ${rowDate}.`);
    } else if (rowDate && !round.date) {
      round.date = rowDate;
    }
    round.matches.push({
      homeTeamId: resolveTeam(readText(row, 'homeTeamId'), teamIds, teamById, resolutions),
      awayTeamId: resolveTeam(readText(row, 'awayTeamId'), teamIds, teamById, resolutions),
      courseId: resolveIdentifier(readText(row, 'courseId'), courseIds) || null,
      date: rowDate ?? round.date,
      time: formatSpreadsheetTime(read(row, 'time')) || null,
      status: 'Scheduled',
      notes: readText(row, 'notes'),
    });
  }

  return {
    schemaVersion: season
      ? SCHEDULE_IMPORT_SCHEMA_VERSION
      : Number(read(first, 'schemaVersion')) as typeof SCHEDULE_IMPORT_SCHEMA_VERSION,
    seasonId: season?.id ?? readText(first, 'seasonId'),
    name: season ? `${season.year} Schedule` : readText(first, 'scheduleName'),
    description: season ? '' : readText(first, 'description'),
    rounds: [...rounds.values()],
  };
}

async function parseFirstWorksheet(buffer: ArrayBuffer): Promise<TabularRow[]> {
  const entries = await unzip(buffer);
  const worksheetName = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, {numeric: true}))[0];
  if (!worksheetName) throw new Error('The Excel file does not contain a worksheet.');

  const sharedStringsXml = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedStringsXml
    ? [...decodeXml(sharedStringsXml).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)]
      .map((match) => [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
        .map((text) => decodeXmlEntities(text[1])).join(''))
    : [];
  const worksheet = decodeXml(entries.get(worksheetName)!);

  return [...worksheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row: TabularRow = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const reference = /\br="([A-Z]+\d+)"/.exec(attributes)?.[1] ?? '';
      const column = columnIndex(reference);
      const type = /\bt="([^"]+)"/.exec(attributes)?.[1] ?? '';
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1]
        ?? /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1]
        ?? '';
      const decoded = decodeXmlEntities(raw);
      row[column] = type === 's'
        ? sharedStrings[Number(decoded)] ?? ''
        : type === 'inlineStr' || type === 'str'
          ? decoded
          : decoded !== '' && Number.isFinite(Number(decoded))
            ? Number(decoded)
            : decoded;
    }
    return row;
  });
}

async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const eocd = findSignature(view, 0x06054b50);
  if (eocd < 0) throw new Error('The Excel file is not a valid .xlsx archive.');
  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map<string, Uint8Array>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('The Excel archive directory is invalid.');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const filenameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const filename = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + filenameLength));
    const localFilenameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localFilenameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    entries.set(filename, await decompressEntry(compressed, method));
    offset += 46 + filenameLength + extraLength + commentLength;
  }
  return entries;
}

async function decompressEntry(value: Uint8Array, method: number): Promise<Uint8Array> {
  if (method === 0) return value;
  if (method !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('This Excel compression format is not supported.');
  }
  const stream = new Blob([value as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findSignature(view: DataView, signature: number): number {
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === signature) return offset;
  }
  return -1;
}

function decodeXml(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/)?.[0] ?? 'A';
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function formatSpreadsheetDate(value: TabularValue): string {
  if (typeof value !== 'number') return String(value).trim();
  const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(value)));
  return date.toISOString().slice(0, 10);
}

function formatSpreadsheetTime(value: TabularValue): string {
  if (typeof value !== 'number') return String(value).trim();
  const totalMinutes = Math.round((value % 1) * 24 * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
}

function createIdentifierLookup(items: Array<{id: string; name: string}>): Map<string, string> {
  return new Map(items.flatMap((item) => [
    [item.id.toLocaleLowerCase(), item.id],
    [item.name.toLocaleLowerCase(), item.id],
  ]));
}

function createTeamLookup(teams: Team[], aliases: TeamAlias[]): Map<string, Set<string>> {
  const lookup = new Map<string, Set<string>>();
  const add = (value: string, teamId: string) => {
    const key = value.trim().toLocaleLowerCase();
    if (!key) return;
    const ids = lookup.get(key) ?? new Set<string>();
    ids.add(teamId);
    lookup.set(key, ids);
  };
  teams.forEach((team) => {
    add(team.id, team.id);
    add(team.name, team.id);
    add(team.shortName, team.id);
  });
  aliases.forEach((alias) => add(alias.alias, alias.teamId));
  return lookup;
}

function createResolutionState(): {
  mappings: TeamImportMapping[];
  ambiguities: TeamImportAmbiguity[];
} {
  return {mappings: [], ambiguities: []};
}

function resolveTeam(
  value: string,
  lookup: Map<string, Set<string>>,
  teams: Map<string, Team>,
  resolutions: ReturnType<typeof createResolutionState>,
): string {
  const candidates = [...(lookup.get(value.toLocaleLowerCase()) ?? [])]
    .map((teamId) => teams.get(teamId))
    .filter((team): team is Team => Boolean(team));
  if (candidates.length === 1) {
    const team = candidates[0];
    if (value.toLocaleLowerCase() !== team.id.toLocaleLowerCase()) {
      const mapping = {importedName: value, teamId: team.id, teamName: team.name};
      if (!resolutions.mappings.some((candidate) =>
        candidate.importedName.toLocaleLowerCase() === value.toLocaleLowerCase()
        && candidate.teamId === team.id)) {
        resolutions.mappings.push(mapping);
      }
    }
    return team.id;
  }
  if (candidates.length > 1 && !resolutions.ambiguities.some((candidate) =>
    candidate.importedName.toLocaleLowerCase() === value.toLocaleLowerCase())) {
    resolutions.ambiguities.push({importedName: value, candidates});
  }
  return value;
}

function resolveIdentifier(value: string, lookup: Map<string, string>): string {
  return lookup.get(value.toLocaleLowerCase()) ?? value;
}

function countMatches(value: unknown): number {
  if (!value || typeof value !== 'object' || !('rounds' in value) || !Array.isArray(value.rounds)) {
    return 0;
  }
  return value.rounds.reduce((total: number, round: unknown) => {
    if (!round || typeof round !== 'object' || !('matches' in round) || !Array.isArray(round.matches)) {
      return total;
    }
    return total + round.matches.length;
  }, 0);
}

function isCommissionerJson(
  value: unknown,
): value is Record<string, unknown>[] | {matches: Record<string, unknown>[]} {
  if (Array.isArray(value)) {
    return value.every((row) => Boolean(row) && typeof row === 'object' && !Array.isArray(row));
  }
  return value !== null
    && typeof value === 'object'
    && 'matches' in value
    && Array.isArray(value.matches);
}

function objectRows(values: Record<string, unknown>[]): TabularRow[] {
  if (!values.length) throw new Error('The schedule file does not contain any matches.');
  const headers = [...new Set(values.flatMap((value) => Object.keys(value)))];
  return [
    headers,
    ...values.map((value) => headers.map((header) => {
      const cell = value[header];
      return typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean'
        ? cell
        : '';
    })),
  ];
}
