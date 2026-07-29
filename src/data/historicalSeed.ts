import {HISTORICAL_RECORD_SOURCES} from '@/data/historicalRecords';
import type {HistoricalPlayerRecordInput} from '@/domain/history/HistoricalRecord';
import type {Player} from '@/models/Player';
import type {Team} from '@/models/Team';
import {createSlug} from '@/shared/utils';

type HistoricalRecordSummary = {
  wins: number;
  losses: number;
  ties: number;
};

export type HistoricalTeamSeedSummary = {
  teamId: string;
  seasonId: string;
  seasonName: string;
  matchesPlayed: number;
  record: HistoricalRecordSummary;
  pointsEarned: number;
  pointsAvailable: number;
  pointsPercentage: number;
};

export type HistoricalPlayerSeedSummary = {
  playerId: string;
  matchesPlayed: number;
  singlesRecord: HistoricalRecordSummary;
  doublesRecord: HistoricalRecordSummary;
  overallRecord: HistoricalRecordSummary;
  winPercentage: number;
};

export type HistoricalPlayerSeasonSummary = HistoricalPlayerSeedSummary & {
  playerName: string;
  teamId: string;
  teamName: string;
  seasonId: string;
  seasonName: string;
};

export type HistoricalTeamSeasonStanding = HistoricalTeamSeedSummary & {
  teamName: string;
  rank: number;
};

export type HistoricalSeasonArchive = {
  seasonId: string;
  seasonName: string;
  sourceFilename: string;
  championTeamId?: string;
  championTeamName?: string;
  standings: HistoricalTeamSeasonStanding[];
  playerSummaries: HistoricalPlayerSeasonSummary[];
};

const HISTORICAL_IMPORTED_AT = '2026-07-19T00:00:00.000Z';
const HISTORICAL_TEAM_DESCRIPTION = 'Imported from historical Coastal Clash records.';
const HISTORICAL_TEAM_CITY = 'Wilmington';
const HISTORICAL_TEAM_STATE = 'NC';
const HISTORICAL_PRIMARY_COLOR = '#121814';
const HISTORICAL_SECONDARY_COLOR = '#f4f6f2';
const PREVIOUS_COMPLETED_HISTORICAL_SEASON_ID = 'coastal-clash-2024-2025';
const HISTORICAL_TEAM_LOGOS: Record<string, string> = {
  'cougar-country': '/team-logos/cougar-country.jpg',
  'hayneous-og-s': '/team-logos/hayneous-ogs.jpg',
  kb: '/team-logos/kb.png',
  ninjas: '/team-logos/ninjas.jpg',
  riptide: '/team-logos/riptide.jpg',
  'wild-turkey': '/team-logos/wild-turkey.jpg',
};
const HISTORICAL_TEAM_HOME_COURSES: Record<string, string> = {
  'beast-mode': 'Beast on Honey Hill',
  'cougar-country': 'Cougar Country',
  'dark-knights': 'Castle Hayne Park',
  'hayneous-og-s': 'Castle Hayne Park',
  kb: 'Joe Eakes Park',
  ninjas: 'Northeast Creek Park',
  riptide: 'Splinter City',
  'wild-turkey': 'Wild Turkey',
};
const HISTORICAL_PLAYER_NAME_CANONICALS: Record<string, string> = {
  'ariel cosmo': 'Ariel Cosimo',
  'ariel cosimo': 'Ariel Cosimo',
  'cecelia costin': 'CeCelia Costin',
  'cecilia costin': 'CeCelia Costin',
  'chad hassenflow': 'Chad Hassenflow',
  'chad hessenflow': 'Chad Hassenflow',
  'isaac cotson': 'Isaac Cotson',
  'isaac kotson': 'Isaac Cotson',
  'jodie lehman': 'Jodie Lehman',
  'jodie lehmann': 'Jodie Lehman',
  'josh matheson': 'Josh Matheson',
  'joshua matheson': 'Josh Matheson',
};
const HISTORICAL_SEASON_CHAMPIONS: Record<string, string> = {
  'coastal-clash-2024-2025': 'dark-knights',
  'coastal-clash-2025-2026': 'riptide',
};
const HISTORICAL_FEMALE_PLAYERS = new Set([
  'alisica fussell',
  'angel mabee',
  'ariel cosimo',
  'ashlee hynds',
  'brianna kinsman',
  'candy mcclernan',
  'cecelia costin',
  'crystal fussell',
  'currie istre',
  'jamie hensley',
  'jasmine pollack',
  'jodie lehman',
  'kim mchale',
  'lani evans',
  'logan canale',
  'misti lee',
  'nadya gutierrez',
  'nicole pierre',
  'rosa carroll',
  'shannon boney',
  'shannon johnson',
]);

export function buildHistoricalTeamSeedData(): Team[] {
  const teamsByName = new Map<string, Team>();
  const captainByTeam = getCaptainByTeam(HISTORICAL_RECORD_SOURCES);
  const usedShortNames = new Set<string>();

  for (const source of HISTORICAL_RECORD_SOURCES) {
    for (const record of source.teamRecords) {
      const teamKey = normalize(record.teamName);
      if (teamsByName.has(teamKey)) continue;

      const shortName = createShortName(record.teamName, usedShortNames);
      usedShortNames.add(normalize(shortName));
      teamsByName.set(teamKey, {
        id: createSlug(record.teamName),
        name: record.teamName,
        shortName,
        city: HISTORICAL_TEAM_CITY,
        state: HISTORICAL_TEAM_STATE,
        captain: captainByTeam.get(teamKey) ?? '',
        homeCourse: HISTORICAL_TEAM_HOME_COURSES[createSlug(record.teamName)] ?? '',
        logo: HISTORICAL_TEAM_LOGOS[createSlug(record.teamName)] ?? '',
        primaryColor: HISTORICAL_PRIMARY_COLOR,
        secondaryColor: HISTORICAL_SECONDARY_COLOR,
        website: '',
        facebook: '',
        description: HISTORICAL_TEAM_DESCRIPTION,
        active: true,
        createdAt: HISTORICAL_IMPORTED_AT,
        updatedAt: HISTORICAL_IMPORTED_AT,
      });
    }
  }

  return Array.from(teamsByName.values()).sort((first, second) => first.name.localeCompare(second.name));
}

export function buildHistoricalPlayerSeedData(): Player[] {
  const playersByName = new Map<string, Player>();

  for (const source of HISTORICAL_RECORD_SOURCES) {
    for (const record of source.playerRecords) {
      const playerName = getCanonicalPlayerName(record.playerName);
      const playerKey = normalize(playerName);
      if (playersByName.has(playerKey)) continue;

      playersByName.set(playerKey, {
        id: createSlug(playerName),
        name: playerName,
        teamId: '',
        pdgaNumber: record.pdgaNumber,
        pdgaRating: record.pdgaRating,
        gender: HISTORICAL_FEMALE_PLAYERS.has(playerKey) ? 'Female' : 'Male',
        active: true,
        createdAt: HISTORICAL_IMPORTED_AT,
        updatedAt: HISTORICAL_IMPORTED_AT,
      });
    }
  }

  return Array.from(playersByName.values()).sort((first, second) => first.name.localeCompare(second.name));
}

export function isHistoricalFemalePlayer(playerName: string): boolean {
  return HISTORICAL_FEMALE_PLAYERS.has(normalize(getCanonicalPlayerName(playerName)));
}

export function getHistoricalTeamSeedSummary(teamId: string): HistoricalTeamSeedSummary | undefined {
  const summaries = getHistoricalTeamSeasonSummaries(teamId);
  if (!summaries.length) return undefined;

  const aggregateSummary = summaries.reduce<HistoricalTeamSeedSummary>((summary, entry) => ({
    teamId,
    seasonId: 'historical',
    seasonName: 'Historical record',
    matchesPlayed: summary.matchesPlayed + entry.matchesPlayed,
    record: addRecords(summary.record, entry.record),
    pointsEarned: summary.pointsEarned + entry.pointsEarned,
    pointsAvailable: summary.pointsAvailable + entry.pointsAvailable,
    pointsPercentage: 0,
  }), {
    teamId,
    seasonId: 'historical',
    seasonName: 'Historical record',
    matchesPlayed: 0,
    record: emptyRecord(),
    pointsEarned: 0,
    pointsAvailable: 0,
    pointsPercentage: 0,
  });

  return {
    ...aggregateSummary,
    pointsPercentage: calculatePercentage(aggregateSummary.pointsEarned, aggregateSummary.pointsAvailable),
  };
}

export function getHistoricalTeamSeasonSummaries(teamId: string): HistoricalTeamSeedSummary[] {
  return HISTORICAL_RECORD_SOURCES.flatMap((source) =>
    source.teamRecords
      .filter((record) => createSlug(record.teamName) === teamId)
      .map((record) => ({
        teamId,
        seasonId: source.id,
        seasonName: source.name,
        matchesPlayed: record.matchesPlayed,
        record: {
          wins: record.wins,
          losses: record.losses,
          ties: record.ties,
        },
        pointsEarned: record.pointsEarned,
        pointsAvailable: record.pointsAvailable,
        pointsPercentage: calculatePercentage(record.pointsEarned, record.pointsAvailable),
      })));
}

export function getHistoricalTeamSeasonTitles(teamId: string): HistoricalTeamSeedSummary[] {
  return getHistoricalTeamSeasonSummaries(teamId)
    .filter((summary) => HISTORICAL_SEASON_CHAMPIONS[summary.seasonId] === teamId);
}

export function getHistoricalPlayerSeedSummary(playerId: string): HistoricalPlayerSeedSummary | undefined {
  const records = HISTORICAL_RECORD_SOURCES.flatMap((source) =>
    source.playerRecords.filter((record) => createSlug(getCanonicalPlayerName(record.playerName)) === playerId));
  if (!records.length) return undefined;

  const singlesRecord = records.reduce((summary, record) => addRecords(summary, record.singles), emptyRecord());
  const doublesRecord = records.reduce((summary, record) => addRecords(summary, record.doubles), emptyRecord());
  const overallRecord = addRecords(singlesRecord, doublesRecord);

  return {
    playerId,
    matchesPlayed: countMatches(overallRecord),
    singlesRecord,
    doublesRecord,
    overallRecord,
    winPercentage: calculateWinPercentage(overallRecord),
  };
}

export function getLatestHistoricalSeasonName(): string {
  return getLatestHistoricalSeason()?.name ?? 'Imported last season';
}

export function getLatestHistoricalTeamStandings(): HistoricalTeamSeasonStanding[] {
  const latestSeason = getLatestHistoricalSeason();
  return latestSeason ? buildTeamStandingsForSeason(latestSeason) : [];
}

export function getPreviousHistoricalSeasonName(): string {
  return getPreviousCompletedHistoricalSeason()?.name ?? 'Previous season';
}

export function getPreviousHistoricalTeamStandings(): HistoricalTeamSeasonStanding[] {
  const previousSeason = getPreviousCompletedHistoricalSeason();
  return previousSeason ? buildTeamStandingsForSeason(previousSeason) : [];
}

export function getLatestHistoricalPlayerSeasonSummaries(): HistoricalPlayerSeasonSummary[] {
  const latestSeason = getLatestHistoricalSeason();
  return latestSeason ? buildPlayerSummariesForSeason(latestSeason) : [];
}

export function getPreviousHistoricalPlayerSeasonSummaries(): HistoricalPlayerSeasonSummary[] {
  const previousSeason = getPreviousCompletedHistoricalSeason();
  return previousSeason ? buildPlayerSummariesForSeason(previousSeason) : [];
}

export function getHistoricalSeasonArchives(): HistoricalSeasonArchive[] {
  return [...HISTORICAL_RECORD_SOURCES]
    .reverse()
    .map((source) => {
      const championTeamId = HISTORICAL_SEASON_CHAMPIONS[source.id];
      return {
        seasonId: source.id,
        seasonName: source.name,
        sourceFilename: source.sourceFilename,
        championTeamId,
        championTeamName: source.teamRecords.find((record) => createSlug(record.teamName) === championTeamId)?.teamName,
        standings: buildTeamStandingsForSeason(source),
        playerSummaries: buildPlayerSummariesForSeason(source),
      };
    });
}

function buildTeamStandingsForSeason(
  season: typeof HISTORICAL_RECORD_SOURCES[number],
): HistoricalTeamSeasonStanding[] {
  return season.teamRecords
    .map((record) => ({
      teamId: createSlug(record.teamName),
      teamName: record.teamName,
      seasonId: season.id,
      seasonName: season.name,
      matchesPlayed: record.matchesPlayed,
      record: {
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
      },
      pointsEarned: record.pointsEarned,
      pointsAvailable: record.pointsAvailable,
      pointsPercentage: calculatePercentage(record.pointsEarned, record.pointsAvailable),
      rank: 0,
    }))
    .sort((first, second) =>
      second.record.wins - first.record.wins
      || first.record.losses - second.record.losses
      || second.pointsPercentage - first.pointsPercentage
      || second.pointsEarned - first.pointsEarned
      || first.teamName.localeCompare(second.teamName, undefined, {sensitivity: 'base'}))
    .map((standing, index) => ({...standing, rank: index + 1}));
}

function buildPlayerSummariesForSeason(
  season: typeof HISTORICAL_RECORD_SOURCES[number],
): HistoricalPlayerSeasonSummary[] {
  const summariesByPlayer = new Map<string, HistoricalPlayerSeasonSummary>();

  for (const record of season.playerRecords) {
    const playerName = getCanonicalPlayerName(record.playerName);
    const playerId = createSlug(playerName);
    const existingSummary = summariesByPlayer.get(playerId);
    const singlesRecord = existingSummary
      ? addRecords(existingSummary.singlesRecord, record.singles)
      : {...record.singles};
    const doublesRecord = existingSummary
      ? addRecords(existingSummary.doublesRecord, record.doubles)
      : {...record.doubles};
    const overallRecord = addRecords(singlesRecord, doublesRecord);

    summariesByPlayer.set(playerId, {
      playerId,
      playerName,
      teamId: createSlug(record.teamName),
      teamName: record.teamName,
      seasonId: season.id,
      seasonName: season.name,
      matchesPlayed: countMatches(overallRecord),
      singlesRecord,
      doublesRecord,
      overallRecord,
      winPercentage: calculateWinPercentage(overallRecord),
    });
  }

  return Array.from(summariesByPlayer.values())
    .filter((summary) => summary.matchesPlayed > 0)
    .sort((first, second) =>
      second.overallRecord.wins - first.overallRecord.wins
      || second.winPercentage - first.winPercentage
      || second.matchesPlayed - first.matchesPlayed
      || first.playerName.localeCompare(second.playerName, undefined, {sensitivity: 'base'}));
}

function getLatestHistoricalSeason() {
  return HISTORICAL_RECORD_SOURCES[HISTORICAL_RECORD_SOURCES.length - 1];
}

function getPreviousCompletedHistoricalSeason() {
  return HISTORICAL_RECORD_SOURCES.find((source) => source.id === PREVIOUS_COMPLETED_HISTORICAL_SEASON_ID);
}

function getCaptainByTeam(
  sources: ReadonlyArray<{playerRecords: ReadonlyArray<HistoricalPlayerRecordInput>}>,
): Map<string, string> {
  const captainByTeam = new Map<string, string>();
  for (const source of sources) {
    for (const record of source.playerRecords) {
      const teamKey = normalize(record.teamName);
      if (!captainByTeam.has(teamKey)) {
        captainByTeam.set(teamKey, getCanonicalPlayerName(record.playerName));
      }
    }
  }
  return captainByTeam;
}

function createShortName(teamName: string, usedShortNames: Set<string>): string {
  const words = teamName.match(/[a-z0-9]+/gi) ?? [teamName];
  const base = words.length === 1
    ? words[0].slice(0, 3)
    : words.map((word) => word[0]).join('').slice(0, 4);
  let candidate = base.toLocaleUpperCase() || 'TM';
  let suffix = 2;

  while (usedShortNames.has(normalize(candidate))) {
    candidate = `${base.toLocaleUpperCase().slice(0, 3)}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function normalize(value: string): string {
  return normalizeDisplayName(value).toLocaleLowerCase();
}

function getCanonicalPlayerName(value: string): string {
  const normalizedName = normalizeDisplayName(value);
  return HISTORICAL_PLAYER_NAME_CANONICALS[normalizedName.toLocaleLowerCase()] ?? normalizedName;
}

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function emptyRecord(): HistoricalRecordSummary {
  return {wins: 0, losses: 0, ties: 0};
}

function addRecords(first: HistoricalRecordSummary, second: HistoricalRecordSummary): HistoricalRecordSummary {
  return {
    wins: first.wins + second.wins,
    losses: first.losses + second.losses,
    ties: first.ties + second.ties,
  };
}

function countMatches(record: HistoricalRecordSummary): number {
  return record.wins + record.losses + record.ties;
}

function calculateWinPercentage(record: HistoricalRecordSummary): number {
  const matchesPlayed = countMatches(record);
  if (!matchesPlayed) return 0;
  return ((record.wins + record.ties * 0.5) / matchesPlayed) * 100;
}

function calculatePercentage(pointsEarned: number, pointsAvailable: number): number {
  if (!pointsAvailable) return 0;
  return (pointsEarned / pointsAvailable) * 100;
}
