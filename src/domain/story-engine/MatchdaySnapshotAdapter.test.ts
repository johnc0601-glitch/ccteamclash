import {describe, expect, it} from 'vitest';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {PublicMatchdayTeam} from '@/services/matches/MatchdayService';
import {buildMatchdayRatingSnapshots} from './MatchdaySnapshotAdapter';

function player(id: string, clashIndex: number | null, ghost = false): LaunchPlayer {
  return {
    id,
    name: `Player ${id}`,
    gender: 'Male',
    pdgaNumber: id,
    pdgaRating: 900,
    clashIndex,
    clashIndexProvisional: ghost,
    currentTeamId: null,
    homeArea: '',
    active: true,
    createdAt: '2026-08-22T12:00:00Z',
    updatedAt: '2026-08-22T12:00:00Z',
  };
}

function team(id: string, name: string, roster: LaunchPlayer[]): PublicMatchdayTeam {
  return {id, name, logo: '', team: undefined, roster};
}

const matchday = {
  id: 'match-1',
  homeTeam: team('home', 'Home Team', [player('h1', 850, true)]),
  awayTeam: team('away', 'Away Team', [player('a1', 930, false)]),
};

describe('buildMatchdayRatingSnapshots', () => {
  it('carries ghost-average provenance from the official Matchday roster', () => {
    const rows = buildMatchdayRatingSnapshots(matchday, '2026-08-22T13:00:00Z');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      playerId: 'h1', teamName: 'Home Team', clashIndexBefore: 850, ciSourceBefore: 'GhostAverage', side: 'Home',
    });
    expect(rows[1]).toMatchObject({
      playerId: 'a1', teamName: 'Away Team', clashIndexBefore: 930, ciSourceBefore: 'Established', side: 'Away',
    });
  });

  it('fails loudly if the all-active-players-have-CI invariant is broken', () => {
    const invalid = {...matchday, homeTeam: team('home', 'Home Team', [player('h2', null)])};
    expect(() => buildMatchdayRatingSnapshots(invalid)).toThrow('has no Clash Index');
  });
});
