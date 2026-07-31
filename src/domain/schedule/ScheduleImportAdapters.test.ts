import assert from 'node:assert/strict';
import test from 'node:test';
import {MockCourseRepository} from '@/domain/course/CourseRepository';
import {
  SCHEDULE_IMPORT_SCHEMA_VERSION,
  validateScheduleImport,
} from '@/domain/schedule/ScheduleImport';
import {
  parseCsv,
  parseScheduleImportFile,
  parseXlsxSchedule,
  ScheduleImportConversionError,
  scheduleRowsToImport,
} from '@/domain/schedule/ScheduleImportAdapters';
import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {MockTeamRepository} from '@/repositories/TeamRepository';

test('CSV schedule rows convert into the canonical JSON schedule model', () => {
  const rows = parseCsv([
    'schemaVersion,seasonId,scheduleName,description,roundNumber,roundName,roundDate,homeTeamId,awayTeamId,courseId,time,notes',
    '1,summer-team-clash-2026,2026 Schedule,"Monthly, commissioner schedule",1,Opening Round,2026-07-18,dark-knights,ninjas,castle-hayne-park,09:00,"First ""featured"" match"',
    '1,summer-team-clash-2026,2026 Schedule,"Monthly, commissioner schedule",1,Opening Round,2026-07-18,chain-hawks,bogey-men,castle-hayne-park,10:30,',
  ].join('\r\n'));

  const result = scheduleRowsToImport(rows);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.name, '2026 Schedule');
  assert.equal(result.description, 'Monthly, commissioner schedule');
  assert.equal(result.rounds.length, 1);
  assert.equal(result.rounds[0].matches.length, 2);
  assert.equal(result.rounds[0].matches[0].notes, 'First "featured" match');
  assert.equal(result.rounds[0].matches[1].date, '2026-07-18');
});

test('spreadsheet date and time cells convert into canonical strings', () => {
  const result = scheduleRowsToImport([
    ['schemaVersion', 'seasonId', 'scheduleName', 'description', 'roundNumber', 'roundName', 'roundDate', 'homeTeamId', 'awayTeamId', 'courseId', 'time', 'notes'],
    [1, 'summer-team-clash-2026', '2026 Schedule', '', 1, 'Opening Round', 46221, 'dark-knights', 'ninjas', 'castle-hayne-park', 0.375, ''],
  ]);

  assert.equal(result.rounds[0].date, '2026-07-18');
  assert.equal(result.rounds[0].matches[0].time, '09:00');
});

test('commissioner-facing headers and team names resolve to canonical IDs', async () => {
  const teams = await new MockTeamRepository().getAll();
  const courses = await new MockCourseRepository().getAll();
  const season = (await new MockSeasonRepository().getAll())
    .find((candidate) => candidate.active)!;
  const result = scheduleRowsToImport([
    ['Event', 'Date', 'Home Team', 'Away Team', 'Course', 'Time'],
    ['Opening Round', '2026-07-18', teams[0].name, teams[1].name, courses[0].name, '09:00'],
  ], teams, courses, season);

  assert.equal(result.schemaVersion, 1);
  assert.equal(result.seasonId, season.id);
  assert.equal(result.name, `${season.year} Schedule`);
  assert.equal(result.rounds[0].number, 1);
  assert.equal(result.rounds[0].matches[0].homeTeamId, teams[0].id);
  assert.equal(result.rounds[0].matches[0].awayTeamId, teams[1].id);
  assert.equal(result.rounds[0].matches[0].courseId, courses[0].id);
});

test('commissioner import permits optional scheduling details to remain unset', async () => {
  const teams = await new MockTeamRepository().getAll();
  const season = (await new MockSeasonRepository().getAll())
    .find((candidate) => candidate.active)!;
  const result = scheduleRowsToImport([
    ['Event', 'Away Team', 'Home Team'],
    ['Monthly Event', teams[1].name, teams[0].name],
  ], teams, [], season);

  assert.equal(result.rounds[0].date, null);
  assert.equal(result.rounds[0].matches[0].courseId, null);
  assert.equal(result.rounds[0].matches[0].date, null);
  assert.equal(result.rounds[0].matches[0].time, null);
});

test('tabular schedule imports report missing canonical columns', () => {
  assert.throws(
    () => scheduleRowsToImport([['seasonId'], ['summer-team-clash-2026']]),
    /Missing required columns/,
  );
});

test('conversion errors can retain successful parse diagnostics', () => {
  const error = new ScheduleImportConversionError('Missing required column: Course.', {
    format: 'CSV',
    columns: ['Event', 'Away Team', 'Home Team'],
    matchCount: 20,
    mappings: [],
    ambiguities: [],
  });
  assert.equal(error.diagnostics.format, 'CSV');
  assert.deepEqual(error.diagnostics.columns, ['Event', 'Away Team', 'Home Team']);
  assert.equal(error.diagnostics.matchCount, 20);
});

test('an Excel worksheet converts into the canonical JSON schedule model', async () => {
  const worksheet = `<?xml version="1.0" encoding="UTF-8"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
      <row r="1">
        ${['schemaVersion', 'seasonId', 'scheduleName', 'description', 'roundNumber', 'roundName', 'roundDate', 'homeTeamId', 'awayTeamId', 'courseId', 'time', 'notes']
          .map((value, index) => inlineCell(index, 1, value)).join('')}
      </row>
      <row r="2">
        ${inlineCell(0, 2, '1')}
        ${inlineCell(1, 2, 'summer-team-clash-2026')}
        ${inlineCell(2, 2, 'Excel Schedule')}
        ${inlineCell(3, 2, '')}
        ${inlineCell(4, 2, '1')}
        ${inlineCell(5, 2, 'Opening Round')}
        ${inlineCell(6, 2, '2026-07-18')}
        ${inlineCell(7, 2, 'dark-knights')}
        ${inlineCell(8, 2, 'ninjas')}
        ${inlineCell(9, 2, 'castle-hayne-park')}
        ${inlineCell(10, 2, '09:00')}
        ${inlineCell(11, 2, 'Excel import')}
      </row>
    </sheetData></worksheet>`;
  const result = await parseXlsxSchedule(createStoredZip({
    'xl/worksheets/sheet1.xml': worksheet,
  }));

  assert.equal(result.name, 'Excel Schedule');
  assert.equal(result.rounds[0].matches[0].homeTeamId, 'dark-knights');
  assert.equal(result.rounds[0].matches[0].notes, 'Excel import');
});

test('validation identifies unknown teams and duplicate matchups by name', async () => {
  const teams = await new MockTeamRepository().getAll();
  const courses = await new MockCourseRepository().getAll();
  const seasons = await new MockSeasonRepository().getAll();
  const activeTeams = teams.filter((team) => team.active);
  const course = courses.find((candidate) => candidate.active)!;
  const baseMatch = {
    homeTeamId: activeTeams[0].id,
    awayTeamId: activeTeams[1].id,
    courseId: course.id,
    date: '2026-07-18',
    time: '09:00',
    status: 'Scheduled' as const,
    notes: '',
  };
  const unknown = validateScheduleImport({
    schemaVersion: SCHEDULE_IMPORT_SCHEMA_VERSION,
    seasonId: 'summer-team-clash-2026',
    name: 'Imported Schedule',
    description: '',
    rounds: [{
      number: 1,
      name: 'Opening Round',
      date: '2026-07-18',
      matches: [{...baseMatch, homeTeamId: "Hayneous OG's"}],
    }],
  }, seasons, teams, courses);
  assert.ok(unknown.errors.includes(`Team "Hayneous OG's" not found.`));

  const duplicate = validateScheduleImport({
    schemaVersion: SCHEDULE_IMPORT_SCHEMA_VERSION,
    seasonId: 'summer-team-clash-2026',
    name: 'Imported Schedule',
    description: '',
    rounds: [
      {number: 1, name: 'Opening Round', date: '2026-07-18', matches: [baseMatch]},
      {number: 2, name: 'Second Round', date: '2026-07-25', matches: [baseMatch]},
    ],
  }, seasons, teams, courses);
  assert.ok(duplicate.errors.includes(
    `Duplicate matchup: ${activeTeams[0].name} vs ${activeTeams[1].name}.`,
  ));
});

test('team display names and saved aliases resolve automatically and are reported', async () => {
  const teams = await new MockTeamRepository().getAll();
  const season = (await new MockSeasonRepository().getAll()).find((candidate) => candidate.active)!;
  const csv = [
    'Event,Away Team,Home Team',
    `Opening,${teams[1].shortName},Previous Champions`,
  ].join('\n');
  const file = {
    name: 'schedule.csv',
    text: async () => csv,
  } as File;
  const result = await parseScheduleImportFile(
    file,
    season,
    teams,
    [],
    [{alias: 'Previous Champions', teamId: teams[0].id}],
  );

  assert.equal(result.ambiguities.length, 0);
  assert.ok(result.mappings.some((mapping) =>
    mapping.importedName === 'Previous Champions' && mapping.teamId === teams[0].id));
});

test('multiple exact team display-name matches require commissioner resolution', async () => {
  const teams = await new MockTeamRepository().getAll();
  const season = (await new MockSeasonRepository().getAll()).find((candidate) => candidate.active)!;
  const ambiguousTeams = [
    {...teams[0], shortName: 'Clash'},
    {...teams[1], shortName: 'Clash'},
  ];
  const file = {
    name: 'schedule.csv',
    text: async () => 'Event,Away Team,Home Team\nOpening,Clash,Clash',
  } as File;
  const result = await parseScheduleImportFile(file, season, ambiguousTeams);

  assert.equal(result.ambiguities.length, 1);
  assert.equal(result.ambiguities[0].importedName, 'Clash');
  assert.equal(result.ambiguities[0].candidates.length, 2);
});

function inlineCell(column: number, row: number, value: string): string {
  const reference = `${String.fromCharCode(65 + column)}${row}`;
  return `<c r="${reference}" t="inlineStr"><is><t>${value}</t></is></c>`;
}

function createStoredZip(files: Record<string, string>): ArrayBuffer {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);
    const local = new Uint8Array(30 + nameBytes.length + contentBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(contentBytes, 30 + nameBytes.length);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, localOffset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    localOffset += local.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centralParts.length, true);
  endView.setUint16(10, centralParts.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);

  const archive = new Uint8Array(localOffset + centralSize + end.length);
  let offset = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    archive.set(part, offset);
    offset += part.length;
  }
  return archive.buffer;
}
