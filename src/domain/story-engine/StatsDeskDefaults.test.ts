import {describe, expect, it} from 'vitest';
import type {Match} from '@/domain/schedule/Match';
import {chooseDefaultRound, chooseDefaultStatsScope, type RoundSummary} from './StatsDeskDefaults';

const rounds: RoundSummary[] = [
  {id: 'r1', seasonId: 's1', number: 1, date: '2026-10-01'},
  {id: 'r2', seasonId: 's1', number: 2, date: '2026-11-01'},
  {id: 'r3', seasonId: 's1', number: 3, date: '2026-12-01'},
];

function match(id: string, roundId: string, status: Match['status']): Match {
  return {id, roundId, seasonId: 's1', homeTeamId: 'h', awayTeamId: 'a', courseId: null,
    date: null, time: null, status, notes: '', createdAt: '', updatedAt: ''};
}

describe('StatsDeskDefaults', () => {
  it('opens the latest round with completed match data', () => {
    const matches = [match('m1', 'r1', 'Completed'), match('m2', 'r2', 'Completed'), match('m3', 'r3', 'Scheduled')];
    expect(chooseDefaultRound(rounds, matches)?.id).toBe('r2');
    expect(chooseDefaultStatsScope(rounds, matches)).toEqual({kind: 'Round', eventId: 'r2'});
  });

  it('falls back to the latest round when the season has no completed match yet', () => {
    expect(chooseDefaultRound(rounds, [match('m3', 'r3', 'Scheduled')])?.id).toBe('r3');
  });

  it('uses all-time only when no rounds exist', () => {
    expect(chooseDefaultStatsScope([], [])).toEqual({kind: 'AllTime'});
  });
});
