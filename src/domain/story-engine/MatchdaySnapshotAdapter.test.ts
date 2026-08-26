import {describe, expect, it} from 'vitest';
import type {Course} from '@/domain/course/Course';
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

function course(homeTeamId?: string): Course {
  return {
    id: 'course-1',
    name: 'Test Course',
    city: 'Wilmington',
    state: 'NC',
    address: '',
    mapUrl: '',
    udiscUrl: '',
    photoUrl: '',
    description: '',
    homeTeamId,
    active: true,
    createdAt: '2026-08-22T12:00:00Z',
    updatedAt: '2026-08-22T12:00:00Z',
  };
}

const matchday = {
  id: 'match-1',
  homeTeam: team('home', 'Home Team', [player('h1', 850, true)]),
  awayTeam: team('away', 'Away Team', [player('a1', 930, false)]),
  courseDetails: course('home'),
};

describe('buildMatchdayRatingSnapshots', () => {
  it('carries ghost provenance and freezes true home venue from course ownership', () => {
    const rows = buildMatchdayRatingSnapshots(matchday, '2026-08-22T13:00:00Z');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      playerId: 'h1', teamName: 'Home Team', clashIndexBefore: 850, ciSourceBefore: 'GhostAverage', side: 'Home', venue: 'Home',
    });
    expect(rows[1]).toMatchObject({
      playerId: 'a1', teamName: 'Away Team', clashIndexBefore: 930, ciSourceBefore: 'Established', side: 'Away', venue: 'Home',
    });
  });

  it('freezes neutral venue when scheduled home team does not own the course', () => {
    const rows = buildMatchdayRatingSnapshots({...matchday, courseDetails: course('another-team')});
    expect(rows.every((row) => row.venue === 'Neutral')).toBe(true);
  });

  it('treats a course with no canonical home owner as neutral', () => {
    const rows = buildMatchdayRatingSnapshots({...matchday, courseDetails: course()});
    expect(rows.every((row) => row.venue === 'Neutral')).toBe(true);
  });

  it('fails loudly if the all-active-players-have-CI invariant is broken', () => {
    const invalid = {...matchday, homeTeam: team('home', 'Home Team', [player('h2', null)])};
    expect(() => buildMatchdayRatingSnapshots(invalid)).toThrow('has no Clash Index');
  });
});
