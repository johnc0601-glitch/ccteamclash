// Read-only audit: node --env-file=<env> --loader ./scripts/ts-paths-loader.mjs scripts/audit_clash_pulse_upsets.mjs
import {createClient} from '@supabase/supabase-js';
import {calculateLockedRosterPrediction} from '../src/services/teamStrength/LockedRosterPrediction.ts';

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const {data: results, error} = await db.from('launch_match_results')
  .select('match_id,home_score,away_score,published_at')
  .eq('status', 'Published').order('published_at', {ascending: false}).limit(3);
if (error) throw error;
for (const result of results) {
  const {data: facts, error: factError} = await db.from('clash_contest_rating_facts')
    .select('*').eq('match_id', result.match_id);
  if (factError) throw factError;
  const {data: rosterPlayers, error: rosterError} = await db.from('launch_match_roster_snapshot_players')
    .select('team_id,player_id').eq('match_id', result.match_id);
  if (rosterError) throw rosterError;
  const homeTeamId = facts.find((fact) => fact.side === 'Home')?.team_id;
  const awayTeamId = facts.find((fact) => fact.side === 'Away')?.team_id;
  const analysis = calculateLockedRosterPrediction({homeTeamId, awayTeamId,
    rosterPlayers, frozenRatings: facts, venue: facts[0]?.venue});
  const homeName = facts.find((fact) => fact.side === 'Home')?.team_name;
  const awayName = facts.find((fact) => fact.side === 'Away')?.team_name;
  const homeWon = result.home_score > result.away_score;
  const chance = analysis ? (homeWon ? analysis.homeChanceOfVictory : analysis.awayChanceOfVictory) : null;
  const winners = new Map();
  for (const fact of facts) {
    if (fact.outcome !== 'W' || Number(fact.win_probability) >= 0.5) continue;
    const key = `${fact.contest_id}:${fact.side}`;
    const contest = winners.get(key) ?? {format: fact.format, names: [], chance: Number(fact.win_probability)};
    contest.names.push(fact.player_name);
    winners.set(key, contest);
  }
  console.log(JSON.stringify({match: `${awayName} at ${homeName}`,
    final: `${result.away_score}–${result.home_score}`,
    teamWinner: homeWon ? homeName : awayName,
    winnerLockedRosterChance: chance,
    teamUpset: chance == null ? null : result.home_score !== result.away_score && chance < 0.5,
    unavailableReason: analysis ? undefined : 'Missing frozen CI for a locked roster player',
    ...analysis,
    contestUpsets: [...winners.values()],
  }, null, 2));
}
