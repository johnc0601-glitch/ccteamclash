import {describe, expect, it} from 'vitest';
import {buildOverallRows, qualifyStatsGroups} from '@/services/stats/StatsAggregator';
import type {StatsGroup, StatsRow} from '@/services/stats/StatsTypes';

function row(overrides: Partial<StatsRow> = {}): StatsRow {
  return {
    playerId: 'player-1',
    playerName: 'Player One',
    teamName: 'Team A',
    teamNames: ['Team A'],
    gender: 'Open',
    matchesPlayed: 2,
    wins: 1,
    losses: 1,
    ties: 0,
    winPercentage: 50,
    singlesWins: 1,
    singlesLosses: 0,
    singlesTies: 0,
    doublesWins: 0,
    doublesLosses: 1,
    doublesTies: 0,
    points: 1,
    ciGain: 4,
    singlesCiGain: 5,
    doublesCiGain: -1,
    ...overrides,
  };
}

describe('StatsAggregator', () => {
  it('combines records, points and CI movement across seasons', () => {
    const groups: StatsGroup[] = [
      {id: 's1', label: 'Season 1', rows: [row()]},
      {id: 's2', label: 'Season 2', rows: [row({matchesPlayed: 3, wins: 2, losses: 0, ties: 1, winPercentage: 83.3, singlesWins: 1, singlesLosses: 0, singlesTies: 1, doublesWins: 1, doublesLosses: 0, doublesTies: 0, points: 2.5, ciGain: -2, singlesCiGain: -3, doublesCiGain: 1})]},
    ];

    const [overall] = buildOverallRows(groups);

    expect(overall).toMatchObject({
      matchesPlayed: 5,
      wins: 3,
      losses: 1,
      ties: 1,
      singlesWins: 2,
      singlesLosses: 0,
      singlesTies: 1,
      doublesWins: 1,
      doublesLosses: 1,
      doublesTies: 0,
      points: 3.5,
      ciGain: 2,
      singlesCiGain: 2,
      doublesCiGain: 0,
    });
    expect(overall.winPercentage).toBe(70);
  });

  it('tracks multiple teams for a player without splitting identity', () => {
    const [overall] = buildOverallRows([
      {id: 's1', label: 'Season 1', rows: [row()]},
      {id: 's2', label: 'Season 2', rows: [row({teamName: 'Team B', teamNames: ['Team B']})]},
    ]);

    expect(overall.playerId).toBe('player-1');
    expect(overall.teamName).toBe('Multiple teams');
    expect(overall.teamNames).toEqual(['Team A', 'Team B']);
  });

  it('does not publish partial overall CI when any season is missing movement data', () => {
    const incomplete = row();
    delete incomplete.ciGain;
    delete incomplete.singlesCiGain;
    delete incomplete.doublesCiGain;

    const [overall] = buildOverallRows([
      {id: 's1', label: 'Season 1', rows: [row()]},
      {id: 's2', label: 'Season 2', rows: [incomplete]},
    ]);

    expect(overall.ciGain).toBeUndefined();
    expect(overall.singlesCiGain).toBeUndefined();
    expect(overall.doublesCiGain).toBeUndefined();
  });

  it('applies minimum-match qualification without changing source groups', () => {
    const groups: StatsGroup[] = [{
      id: 's1',
      label: 'Season 1',
      rows: [row({playerId: 'eligible', matchesPlayed: 3}), row({playerId: 'ineligible', matchesPlayed: 2})],
    }];

    const qualified = qualifyStatsGroups(groups);

    expect(qualified[0].rows.map((entry) => entry.playerId)).toEqual(['eligible']);
    expect(groups[0].rows).toHaveLength(2);
  });
});
