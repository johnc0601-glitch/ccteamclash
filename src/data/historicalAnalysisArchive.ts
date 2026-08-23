import type {
  HistoricalAnalysisArchive,
  HistoricalAnalysisRecord,
  HistoricalCompetitionPhase,
  HistoricalMatchFormat,
  HistoricalResult,
  HistoricalSeasonAnalysisManifest,
} from '@/domain/history/HistoricalAnalysis';

export const HISTORICAL_ANALYSIS_MANIFESTS: HistoricalSeasonAnalysisManifest[] = [
  {
    seasonId: 'coastal-clash-2024-2025',
    seasonName: 'Coastal Clash Match Play 2024-2025',
    sourceFilenames: [
      "Coastal Clash Match Play '24_'25.xlsx",
      'CC_Team_Clash_Historical_Stats_2024-2026.xlsx',
    ],
    regularSeason: 'Partial',
    playoffs: 'Complete',
    knownGaps: [
      'Detailed regular-season rows still need to be normalized into canonical matchup records.',
    ],
  },
  {
    seasonId: 'coastal-clash-2025-2026',
    seasonName: 'Coastal Clash Match Play 2025-2026',
    sourceFilenames: [
      "Coastal Clash Match Play '25_'26.xlsx",
      'CC_Team_Clash_Historical_Stats_2024-2026.xlsx',
      'CCTC Elo Calc - Clash Rating.xlsx',
    ],
    regularSeason: 'Partial',
    playoffs: 'Missing',
    knownGaps: [
      'Detailed matchup rows exist in source workbooks but still need canonical event/team/home-away normalization.',
      'Playoff matchup detail is incomplete and may be appended later.',
    ],
  },
];

type PlayoffSinglesSource = {
  row: number;
  awayPlayer: string;
  awayResult: HistoricalResult;
  homePlayer: string;
  homeResult: HistoricalResult;
};

type PlayoffDoublesSource = {
  row: number;
  awayPlayers: [string, string];
  awayResult: HistoricalResult;
  homePlayers: [string, string];
  homeResult: HistoricalResult;
};

type PlayoffMatchupSource = {
  id: string;
  eventId: string;
  eventName: string;
  roundNumber: number;
  away: string;
  home: string;
  singles: PlayoffSinglesSource[];
  doubles: PlayoffDoublesSource[];
};

const PLAYOFF_MATCHUPS_2025: PlayoffMatchupSource[] = [
  {
    id: 'sf1',
    eventId: '2025-playoffs-semifinal-1',
    eventName: 'April 2025 Semifinal 1',
    roundNumber: 1,
    away: "Hayneous OG's",
    home: 'Dark Knights',
    singles: [
      {row: 3, awayPlayer: 'Brandon Cosimo', awayResult: 'Loss', homePlayer: 'Philip Murray', homeResult: 'Win'},
      {row: 4, awayPlayer: 'Randy Roy', awayResult: 'Loss', homePlayer: 'Jamieson Vollbrecht', homeResult: 'Win'},
      {row: 5, awayPlayer: 'Alan Layh', awayResult: 'Loss', homePlayer: 'Justin Kent', homeResult: 'Win'},
      {row: 6, awayPlayer: 'Alisica Fussell', awayResult: 'Loss', homePlayer: 'Guy Seifert', homeResult: 'Win'},
      {row: 7, awayPlayer: 'Chris Carter', awayResult: 'Loss', homePlayer: 'Alex Karp', homeResult: 'Win'},
      {row: 8, awayPlayer: 'Kurty McGurty', awayResult: 'Win', homePlayer: 'Dwain Gunnels', homeResult: 'Loss'},
      {row: 9, awayPlayer: 'Chris Lamarsh', awayResult: 'Win', homePlayer: 'Michael Nassisi', homeResult: 'Loss'},
    ],
    doubles: [
      {row: 26, awayPlayers: ['Eric England', 'Jake Lehmann'], awayResult: 'Win', homePlayers: ['Owen Shields', 'Christo Henry'], homeResult: 'Loss'},
      {row: 27, awayPlayers: ['Clay Held', 'Austin Gratton'], awayResult: 'Loss', homePlayers: ['Stone Tippett', 'Ian Roberts'], homeResult: 'Win'},
      {row: 28, awayPlayers: ['Ray Ledbetter', 'Michael Snipes'], awayResult: 'Loss', homePlayers: ['Alex Wetherell', 'Eli Batazhan'], homeResult: 'Win'},
      {row: 29, awayPlayers: ['Jodie Lehman', 'Ariel Cosimo'], awayResult: 'Loss', homePlayers: ['Rosa Carroll', 'Hope Brown'], homeResult: 'Win'},
      {row: 30, awayPlayers: ['John Moncrief', 'Scott Crouch'], awayResult: 'Loss', homePlayers: ['John Carroll', 'Chuck Myers'], homeResult: 'Win'},
    ],
  },
  {
    id: 'sf2',
    eventId: '2025-playoffs-semifinal-2',
    eventName: 'April 2025 Semifinal 2',
    roundNumber: 1,
    away: 'KB',
    home: 'Cougar Country',
    singles: [
      {row: 3, awayPlayer: 'John Blackburn', awayResult: 'Win', homePlayer: 'Kevin Truett', homeResult: 'Loss'},
      {row: 4, awayPlayer: 'Mitchell Puttbach', awayResult: 'Tie', homePlayer: 'Jason Helms', homeResult: 'Tie'},
      {row: 5, awayPlayer: 'Dan Moles', awayResult: 'Tie', homePlayer: 'Darell Matthews', homeResult: 'Tie'},
      {row: 6, awayPlayer: 'Bryce Behrendt', awayResult: 'Win', homePlayer: 'Seth Stetson', homeResult: 'Loss'},
      {row: 7, awayPlayer: 'Jimbo Lemire', awayResult: 'Loss', homePlayer: 'Josh Beardsley', homeResult: 'Win'},
      {row: 8, awayPlayer: 'Mike Bloch', awayResult: 'Loss', homePlayer: 'Charlie Johnson', homeResult: 'Win'},
      {row: 9, awayPlayer: 'Logan Hitchcock', awayResult: 'Win', homePlayer: 'Logan McHale', homeResult: 'Loss'},
    ],
    doubles: [
      {row: 26, awayPlayers: ['Scott Strickland', 'Mike Duncan'], awayResult: 'Win', homePlayers: ['Scott Prince', 'Albert Ducharme'], homeResult: 'Loss'},
      {row: 27, awayPlayers: ['Sawyer Webster', 'Jordan Darby'], awayResult: 'Loss', homePlayers: ['Seth Stetson', 'Aidan Prince'], homeResult: 'Win'},
      {row: 28, awayPlayers: ['Isaac Cotson', 'Dalton Medlin'], awayResult: 'Tie', homePlayers: ['James Higgins', 'Eddie Mylod'], homeResult: 'Tie'},
      {row: 29, awayPlayers: ['Derek Hynds', 'David Thompson'], awayResult: 'Loss', homePlayers: ['Khalil Peterson', 'Joshua Matheson'], homeResult: 'Win'},
      {row: 30, awayPlayers: ['Steve Lipke', 'Ashlee Hynds'], awayResult: 'Loss', homePlayers: ['Robert Scribner', 'Logan Canale'], homeResult: 'Win'},
    ],
  },
  {
    id: 'final',
    eventId: '2025-playoffs-championship',
    eventName: 'April 2025 Championship',
    roundNumber: 2,
    away: 'Cougar Country',
    home: 'Dark Knights',
    singles: [
      {row: 3, awayPlayer: 'Darell Matthews', awayResult: 'Tie', homePlayer: 'Owen Shields', homeResult: 'Tie'},
      {row: 4, awayPlayer: 'Seth Brown', awayResult: 'Tie', homePlayer: 'Philip Murray', homeResult: 'Tie'},
      {row: 5, awayPlayer: 'Jason Helms', awayResult: 'Win', homePlayer: 'Michael Nassisi', homeResult: 'Loss'},
      {row: 6, awayPlayer: 'Khalil Peterson', awayResult: 'Loss', homePlayer: 'Guy Seifert', homeResult: 'Win'},
      {row: 7, awayPlayer: 'Kevin Truett', awayResult: 'Loss', homePlayer: 'Ian Roberts', homeResult: 'Win'},
      {row: 8, awayPlayer: 'Joshua Matheson', awayResult: 'Loss', homePlayer: 'Christo Henry', homeResult: 'Win'},
      {row: 9, awayPlayer: 'Josh Beardsley', awayResult: 'Loss', homePlayer: 'Justin Kent', homeResult: 'Win'},
      {row: 10, awayPlayer: 'Charlie Johnson', awayResult: 'Win', homePlayer: 'Jamieson Vollbrecht', homeResult: 'Loss'},
    ],
    doubles: [
      {row: 26, awayPlayers: ['Robert Scribner', 'Logan Canale'], awayResult: 'Loss', homePlayers: ['Hope Brown', 'Alex Karp'], homeResult: 'Win'},
      {row: 27, awayPlayers: ['Seth Brown', 'Aidan Prince'], awayResult: 'Loss', homePlayers: ['John Carroll', 'Chuck Myers'], homeResult: 'Win'},
      {row: 28, awayPlayers: ['Eddie Mylod', 'James Higgins'], awayResult: 'Win', homePlayers: ['Alex Wetherell', 'Eli Batazhan'], homeResult: 'Loss'},
      {row: 29, awayPlayers: ['Scott Prince', 'Albert Ducharme'], awayResult: 'Loss', homePlayers: ['Stone Tippett', 'Dwain Gunnels'], homeResult: 'Win'},
    ],
  },
];

export const HISTORICAL_ANALYSIS_RECORDS: HistoricalAnalysisRecord[] = buildPlayoffRecords(PLAYOFF_MATCHUPS_2025);

function buildPlayoffRecords(matchups: PlayoffMatchupSource[]): HistoricalAnalysisRecord[] {
  const records: HistoricalAnalysisRecord[] = [];

  for (const matchup of matchups) {
    const matchupId = `coastal-clash-2024-2025-playoffs-${matchup.id}`;

    for (let index = 0; index < matchup.singles.length; index += 1) {
      const source = matchup.singles[index];
      const matchNumber = index + 1;
      records.push(
        playoffRecord({
          id: `${matchupId}-singles-${matchNumber}-away-${slug(source.awayPlayer)}`,
          matchup,
          matchupId,
          sourceRow: source.row,
          venueSide: 'Away',
          format: 'Singles',
          result: source.awayResult,
          playerName: source.awayPlayer,
          playerTeam: matchup.away,
          opponentNames: [source.homePlayer],
          opponentTeam: matchup.home,
        }),
        playoffRecord({
          id: `${matchupId}-singles-${matchNumber}-home-${slug(source.homePlayer)}`,
          matchup,
          matchupId,
          sourceRow: source.row,
          venueSide: 'Home',
          format: 'Singles',
          result: source.homeResult,
          playerName: source.homePlayer,
          playerTeam: matchup.home,
          opponentNames: [source.awayPlayer],
          opponentTeam: matchup.away,
        }),
      );
    }

    for (let index = 0; index < matchup.doubles.length; index += 1) {
      const source = matchup.doubles[index];
      const matchNumber = index + 1;
      const [awayOne, awayTwo] = source.awayPlayers;
      const [homeOne, homeTwo] = source.homePlayers;

      records.push(
        playoffRecord({id: `${matchupId}-doubles-${matchNumber}-away-${slug(awayOne)}`, matchup, matchupId, sourceRow: source.row, venueSide: 'Away', format: 'Doubles', result: source.awayResult, playerName: awayOne, playerTeam: matchup.away, partnerName: awayTwo, opponentNames: [homeOne, homeTwo], opponentTeam: matchup.home}),
        playoffRecord({id: `${matchupId}-doubles-${matchNumber}-away-${slug(awayTwo)}`, matchup, matchupId, sourceRow: source.row, venueSide: 'Away', format: 'Doubles', result: source.awayResult, playerName: awayTwo, playerTeam: matchup.away, partnerName: awayOne, opponentNames: [homeOne, homeTwo], opponentTeam: matchup.home}),
        playoffRecord({id: `${matchupId}-doubles-${matchNumber}-home-${slug(homeOne)}`, matchup, matchupId, sourceRow: source.row, venueSide: 'Home', format: 'Doubles', result: source.homeResult, playerName: homeOne, playerTeam: matchup.home, partnerName: homeTwo, opponentNames: [awayOne, awayTwo], opponentTeam: matchup.away}),
        playoffRecord({id: `${matchupId}-doubles-${matchNumber}-home-${slug(homeTwo)}`, matchup, matchupId, sourceRow: source.row, venueSide: 'Home', format: 'Doubles', result: source.homeResult, playerName: homeTwo, playerTeam: matchup.home, partnerName: homeOne, opponentNames: [awayOne, awayTwo], opponentTeam: matchup.away}),
      );
    }
  }

  return records;
}

function playoffRecord(input: {
  id: string;
  matchup: PlayoffMatchupSource;
  matchupId: string;
  sourceRow: number;
  venueSide: 'Home' | 'Away';
  format: 'Singles' | 'Doubles';
  result: HistoricalResult;
  playerName: string;
  playerTeam: string;
  partnerName?: string;
  opponentNames: string[];
  opponentTeam: string;
}): HistoricalAnalysisRecord {
  return {
    id: input.id,
    seasonId: 'coastal-clash-2024-2025',
    seasonName: 'Coastal Clash Match Play 2024-2025',
    phase: 'Playoffs',
    eventId: input.matchup.eventId,
    eventName: input.matchup.eventName,
    roundNumber: input.matchup.roundNumber,
    matchupId: input.matchupId,
    venueSide: input.venueSide,
    format: input.format,
    result: input.result,
    player: participant(input.playerName, input.playerTeam),
    partner: input.partnerName ? participant(input.partnerName, input.playerTeam) : undefined,
    opponents: input.opponentNames.map((name) => participant(name, input.opponentTeam)),
    sourceFilename: "Coastal Clash Match Play '24_'25.xlsx",
    sourceSheet: 'Playoffs',
    sourceRow: input.sourceRow,
    notes: ['Played in April 2025; exact day is not preserved in this archive entry.'],
  };
}

function participant(playerName: string, teamName: string) {
  return {playerName, teamName};
}

function slug(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function getHistoricalAnalysisArchive(): HistoricalAnalysisArchive {
  return {
    manifests: HISTORICAL_ANALYSIS_MANIFESTS,
    records: HISTORICAL_ANALYSIS_RECORDS,
  };
}

export function getHistoricalAnalysisRecords(filters: {
  seasonId?: string;
  phase?: HistoricalCompetitionPhase;
  format?: HistoricalMatchFormat;
  playerName?: string;
  teamName?: string;
} = {}): HistoricalAnalysisRecord[] {
  const playerName = normalize(filters.playerName);
  const teamName = normalize(filters.teamName);

  return HISTORICAL_ANALYSIS_RECORDS.filter((record) => {
    if (filters.seasonId && record.seasonId !== filters.seasonId) return false;
    if (filters.phase && record.phase !== filters.phase) return false;
    if (filters.format && record.format !== filters.format) return false;
    if (playerName && normalize(record.player.playerName) !== playerName) return false;
    if (teamName && normalize(record.player.teamName) !== teamName) return false;
    return true;
  });
}

function normalize(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase() ?? '';
}
