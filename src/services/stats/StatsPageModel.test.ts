import {describe, expect, it} from 'vitest';
import {getHistoricalSeasonArchives} from '@/data/historicalSeed';
import type {Player} from '@/models/Player';
import {
  buildOverallRows,
  qualifiesStatsRow,
  resolveHistoricalStatsGender,
  toHistoricalStatsRow,
  type StatsGroup,
  type StatsRow,
} from '@/services/stats/StatsPageModel';

function findHistoricalSummary(playerId: string) {
  const summary = getHistoricalSeasonArchives()
    .flatMap((archive) => archive.playerSummaries)
    .find((entry) => entry.playerId === playerId);
  if (!summary) throw new Error(`Missing historical summary for ${playerId}`);
  return summary;
}

function row(overrides: Partial<StatsRow> = {}): StatsRow {
  return {
    playerId: 'p1',
    playerName: 'Player One',
    teamName: 'Team A',
    teamNames: ['Team A'],
    gender: 'Open',
    matchesPlayed: 3,
    wins: 2,
    losses: 1,
    ties: 0,
    winPercentage: 66.6666666667,
    singlesWins: 1,
    singlesLosses: 1,
    singlesTies: 0,
    doublesWins: 1,
    doublesLosses: 0,
    doublesTies: 0,
    points: 2,
    clashIndex: 950,
    ciGain: 4,
    singlesCiGain: 1,
    doublesCiGain: 3,
    ...overrides,
  };
}

describe('StatsPageModel historical gender classification', () => {
  const genderByPlayerId = new Map<string, Player['gender']>([
    ['lizzie-goddard', 'Female'],
    ['abby-bertone', 'Female'],
  ]);

  it('classifies Lizzie Goddard under Women', () => {
    const statsRow = toHistoricalStatsRow(
      findHistoricalSummary('lizzie-goddard'),
      undefined,
      genderByPlayerId,
    );

    expect(statsRow.gender).toBe('Women');
    expect(statsRow.matchesPlayed).toBe(4);
    expect(qualifiesStatsRow(statsRow)).toBe(true);
  });

  it('classifies Abby Bertone under Women and keeps low-sample players in Show All', () => {
    const statsRow = toHistoricalStatsRow(
      findHistoricalSummary('abby-bertone'),
      undefined,
      genderByPlayerId,
    );

    expect(statsRow.gender).toBe('Women');
    expect(statsRow.matchesPlayed).toBe(2);
    expect(qualifiesStatsRow(statsRow)).toBe(true);
  });

  it('includes a player with one recorded result but excludes zero-result rows', () => {
    expect(qualifiesStatsRow(row({matchesPlayed: 1}))).toBe(true);
    expect(qualifiesStatsRow(row({matchesPlayed: 0}))).toBe(false);
  });

  it('uses the legacy-name fallback when a historical identity has no canonical gender', () => {
    expect(resolveHistoricalStatsGender('unknown-currie', 'Currie Istre', new Map())).toBe('Women');
    expect(resolveHistoricalStatsGender('unknown-player', 'Unknown Player', new Map())).toBe('Open');
  });
});

describe('StatsPageModel Overall aggregation', () => {
  it('combines multiple seasons and teams into one stable player row', () => {
    const groups: StatsGroup[] = [
      {
        id: 'season-1',
        label: 'Season 1',
        rows: [row({
          teamName: 'Bravo',
          teamNames: ['Bravo'],
          matchesPlayed: 3,
          wins: 2,
          losses: 1,
          singlesWins: 1,
          singlesLosses: 1,
          doublesWins: 1,
          doublesLosses: 0,
          points: 2,
          ciGain: 4,
          singlesCiGain: 1,
          doublesCiGain: 3,
        })],
      },
      {
        id: 'season-2',
        label: 'Season 2',
        rows: [row({
          teamName: 'Alpha',
          teamNames: ['Alpha'],
          matchesPlayed: 4,
          wins: 2,
          losses: 1,
          ties: 1,
          singlesWins: 1,
          singlesLosses: 0,
          singlesTies: 1,
          doublesWins: 1,
          doublesLosses: 1,
          doublesTies: 0,
          points: 2.5,
          ciGain: -1,
          singlesCiGain: 2,
          doublesCiGain: -3,
        })],
      },
    ];

    const [overall] = buildOverallRows(groups, new Map([['p1', 982]]));

    expect(overall).toMatchObject({
      playerId: 'p1',
      teamName: 'Multiple teams',
      teamNames: ['Alpha', 'Bravo'],
      matchesPlayed: 7,
      wins: 4,
      losses: 2,
      ties: 1,
      singlesWins: 2,
      singlesLosses: 1,
      singlesTies: 1,
      doublesWins: 2,
      doublesLosses: 1,
      doublesTies: 0,
      points: 4.5,
      clashIndex: 982,
      ciGain: 3,
      singlesCiGain: 3,
      doublesCiGain: 0,
    });
    expect(overall.winPercentage).toBeCloseTo((4.5 / 7) * 100, 8);
  });

  it('omits partial Overall CI movement when any season is missing CI movement', () => {
    const incomplete = row({ciGain: undefined, singlesCiGain: undefined, doublesCiGain: undefined});
    const [overall] = buildOverallRows([
      {id: 'season-1', label: 'Season 1', rows: [row()]},
      {id: 'season-2', label: 'Season 2', rows: [incomplete]},
    ], new Map([['p1', 980]]));

    expect(overall.clashIndex).toBe(980);
    expect(overall.ciGain).toBeUndefined();
    expect(overall.singlesCiGain).toBeUndefined();
    expect(overall.doublesCiGain).toBeUndefined();
  });
});
