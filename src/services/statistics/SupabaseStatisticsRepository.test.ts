import assert from 'node:assert/strict';
import test from 'node:test';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import {StatisticsEngine} from '@/services/statistics/StatisticsEngine';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';

test('persistent singles and doubles contests map into canonical player history', async () => {
  const repository = new SupabaseStatisticsRepository(fakeClient({
    launch_match_results: [{
      match_id: 'match-1', home_score: 5, away_score: 3, status: 'Published',
      published_at: '2026-07-20T12:00:00Z', reopened_at: null,
      created_at: '2026-07-20T11:00:00Z', updated_at: '2026-07-20T12:00:00Z',
    }],
    launch_schedule_matches: [{
      id: 'match-1', round_id: 'round-1', season_id: 'season-1', home_team_id: 'home', away_team_id: 'away',
      course_id: null, date: '2026-07-20', time: null, status: 'Scheduled', notes: '',
      created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z',
    }],
    launch_result_contests: [
      contest('singles-1', 'Singles', 'W', 'L', 7, 4),
      contest('doubles-1', 'Doubles', 'T', 'T', null, null),
    ],
    launch_result_contest_players: [
      player('singles-1', 'home-1', 'Home', 1, 'Home One', 'home'),
      player('singles-1', 'away-1', 'Away', 1, 'Away One', 'away'),
      player('doubles-1', 'home-1', 'Home', 1, 'Home One', 'home'),
      player('doubles-1', 'home-2', 'Home', 2, 'Home Two', 'home'),
      player('doubles-1', 'away-1', 'Away', 1, 'Away One', 'away'),
      player('doubles-1', 'away-2', 'Away', 2, 'Away Two', 'away'),
    ],
  }));
  const history = await new StatisticsEngine(repository).getPlayerMatchHistory('home-1');
  assert.equal(history.length, 2);
  assert.deepEqual(history.find((row) => row.format === 'Singles'), {
    id: 'singles-1:Home:1', challengeId: 'match-1', seasonId: 'season-1', date: '2026-07-20',
    teamId: 'home', opponentTeamId: 'away', format: 'Singles', outcome: 'Win', isHome: true,
    opponentPlayerNames: ['Away One'], partnerPlayerNames: [], playerScore: 7, opponentScore: 4,
  });
  assert.deepEqual(history.find((row) => row.format === 'Doubles')?.partnerPlayerNames, ['Home Two']);
  assert.deepEqual(history.find((row) => row.format === 'Doubles')?.opponentPlayerNames, ['Away One', 'Away Two']);
});

type Rows = Record<string, Array<Record<string, unknown>>>;

function fakeClient(rows: Rows): SupabaseClient<Database> {
  return {
    from(table: string) {
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) {
          return Promise.resolve({data: (rows[table] ?? []).filter((row) => row[column] === value), error: null});
        },
        in(column: string, values: unknown[]) {
          return Promise.resolve({data: (rows[table] ?? []).filter((row) => values.includes(row[column])), error: null});
        },
      };
      return query;
    },
  } as unknown as SupabaseClient<Database>;
}

function contest(id: string, format: string, homeOutcome: string, awayOutcome: string, homeScore: number | null, awayScore: number | null) {
  return {id, match_id: 'match-1', format, position: 1, home_outcome: homeOutcome, away_outcome: awayOutcome,
    home_score: homeScore, away_score: awayScore, created_at: '', updated_at: ''};
}

function player(contestId: string, playerId: string, side: string, slot: number, playerName: string, teamId: string) {
  return {contest_id: contestId, player_id: playerId, player_name: playerName, team_id: teamId,
    team_name: teamId, side, slot, created_at: '', updated_at: ''};
}
