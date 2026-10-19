import {buildFinalScoreBreakdown} from '@/services/matches/FinalScoreBreakdown';
import type {FinalMatchdayV2Snapshot} from '@/services/matches/FinalMatchdayCanary';
import {calculateLockedRosterPrediction} from '@/services/teamStrength/LockedRosterPrediction';
import {TEAM_STRENGTH_VERSION} from '@/services/teamStrength/TeamStrength';
import {generateStreakFacts} from './PulseStreaks';

export type PulseRound = {id: string; season_id: string; number: number; name: string; date: string | null};
export type PulseMatch = {id: string; season_id: string; round_id: string; date: string | null;
  home_team_id: string; away_team_id: string; home_name: string; away_name: string};
export type PulseRating = {contest_id: string; match_id: string; player_id: string; player_name: string;
  team_id: string; team_name: string; side: 'Home' | 'Away'; format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T'; win_probability: number; ci_delta: number; clash_index_before: number;
  calculated_at?: string; algorithm_version?: string; venue?: 'Home' | 'Neutral'};
export type PulseSource = {
  seasons: {id: string; name: string; active: boolean}[];
  rounds: PulseRound[]; matches: PulseMatch[];
  results: {match_id: string; status: string; home_score: number | null; away_score: number | null; updated_at?: string}[];
  ratings: PulseRating[];
  snapshots: {match_id: string; locked: boolean; payload: FinalMatchdayV2Snapshot}[];
  adjustments: {id: number; match_id: string; awarded_team_id: string; category: string; points: number; note: string | null}[];
  predictions: {id?: string; match_id: string; side: string; source: string; chance_of_victory: number;
    expected_score: number; model_version: string; prediction_readiness: string; team_id: string; opponent_team_id: string}[];
  history: {id: number; season_name: string; event_label: string; played_on: string | null;
    home_team_name: string; away_team_name: string; home_score: number; away_score: number}[];
  rosterPlayers?: {match_id: string; team_id: string; player_id: string}[];
  rosterManifests?: {match_id: string; team_id: string}[];
  frozenRatings?: {match_id: string; team_id: string; player_id: string; clash_index_before: number}[];
};
export type PulseCategory = 'Match' | 'Upsets' | 'CI movement' | 'Achievements' | 'Round' | 'Streaks' | 'History' | 'Upcoming' | 'Editorial';
export type PulseReference = {table: string; ids: string[]};
export type PulseFact = {
  fact_key: string; category: PulseCategory; fact_text: string; match_id: string | null;
  team_ids: string[]; player_ids: string[]; sources: PulseReference[]; calculation: string;
  metric: number | null; ranking: number | null;
};
export type SavedPulseFact = PulseFact & {id: string; status: 'pending' | 'approved' | 'hidden';
  is_current: boolean; origin: 'generated' | 'editorial'; generated_at: string; featured_item_id: string | null};
export type PulseReport = {facts: PulseFact[]; complete: boolean; finalized: number; scheduled: number; warnings: string[]};
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const ref = (table: string, ids: string[]): PulseReference => ({table, ids: [...new Set(ids)].sort()});

/** All probabilities come from the persisted pre-result calculation, never current CI. */
export function generateRoundFacts(source: PulseSource, roundId: string): PulseReport {
  const report = analyzeRound(source, roundId);
  const round = source.rounds.find(r => r.id === roundId)!;
  const verified = source.rounds.filter(r => r.season_id === round.season_id && r.number <= round.number)
    .flatMap(r => r.id === roundId ? report.eligible : analyzeRound(source, r.id).eligible);
  const facts = [...report.facts, ...generateStreakFacts(source, round, verified)]
    .sort((a,b) => a.fact_key.localeCompare(b.fact_key));
  return {facts, complete: report.complete, finalized: report.finalized, scheduled: report.scheduled,
    warnings: [...report.warnings, 'Streak coverage: selected season only, through this round. Team runs use published scores; player runs use verified played singles or doubles appearances. Ties end winning/losing runs. Missing results interrupt runs; older archives are not included.']};
}

function analyzeRound(source: PulseSource, roundId: string): PulseReport & {eligible: PulseRating[]} {
  const round = source.rounds.find(r => r.id === roundId);
  if (!round) throw new Error('Unknown round.');
  const matches = source.matches.filter(m => m.round_id === roundId && m.season_id === round.season_id);
  const facts: PulseFact[] = [];
  const warnings: string[] = [];
  const eligible: PulseRating[] = [];
  const finalized: PulseMatch[] = [];
  const add = (key: string, category: PulseCategory, text: string, sources: PulseReference[], calculation: string,
    extra: Partial<PulseFact> = {}) => facts.push({fact_key: key, category, fact_text: text, sources, calculation,
      match_id: null, team_ids: [], player_ids: [], metric: null, ranking: null, ...extra});
  for (const match of matches) {
    const result = source.results.find(r => r.match_id === match.id && r.status === 'Published');
    if (!result || !finite(result.home_score) || !finite(result.away_score)) continue;
    const snapshot = source.snapshots.find(s => s.match_id === match.id && s.locked)?.payload;
    const refs = [ref('launch_match_results', [match.id]), ref('launch_schedule_matches', [match.id])];
    finalized.push(match);
    add(`score:${match.id}`, 'Match', `${match.away_name} ${result.away_score} at ${match.home_name} ${result.home_score} (final).`,
      refs, 'Official published team scores, including separately awarded team points.',
      {match_id: match.id, team_ids: [match.home_team_id, match.away_team_id]});
    if (!snapshot || !Array.isArray(snapshot.contests) || !snapshot.contests.some(c => c.format === 'Singles')
      || !snapshot.contests.some(c => c.format === 'Doubles')
      || new Set(snapshot.contests.map(c => c.id)).size !== snapshot.contests.length
      || snapshot.matchId !== match.id || snapshot.homeTeam.id !== match.home_team_id
      || snapshot.awayTeam.id !== match.away_team_id || snapshot.homeScore !== result.home_score || snapshot.awayScore !== result.away_score) {
      warnings.push(`${match.home_name} vs ${match.away_name}: missing or inconsistent locked snapshot; player analysis withheld.`);
      continue;
    }
    const adjustments = source.adjustments.filter(a => a.match_id === match.id);
    const breakdown = buildFinalScoreBreakdown({...snapshot, adjustments: adjustments.map(a => ({
      awardedTeamId: a.awarded_team_id, category: a.category as FinalMatchdayV2Snapshot['adjustments'][number]['category'],
      points: a.points, note: a.note,
    }))});
    add(`breakdown:${match.id}`, 'Match', `${match.away_name} / ${match.home_name}: played singles ${breakdown.playedSingles.away}–${breakdown.playedSingles.home}; doubles ${breakdown.doubles.away}–${breakdown.doubles.home}; additional team points ${result.away_score - breakdown.playedSingles.away - breakdown.doubles.away}–${result.home_score - breakdown.playedSingles.home - breakdown.doubles.home}.`,
      [...refs, ref('launch_match_final_snapshots', [match.id]), ref('launch_match_structural_points', adjustments.map(a => String(a.id)))],
      'Singles W=1, T=0.5; doubles W=2, T=1. Unplayed slots excluded from played totals. Additional points = published total minus played contest points.',
      {match_id: match.id, team_ids: [match.away_team_id, match.home_team_id]});
    for (const a of adjustments) add(`adjustment:${a.id}`, 'Match', `${a.awarded_team_id}: ${a.points} team points (${a.category})${a.note ? ` — ${a.note}` : ''}.`,
      [ref('launch_match_structural_points', [String(a.id)])], 'Team-only scoring adjustment; excluded from player wins, upsets, and CI.', {match_id: match.id, team_ids: [a.awarded_team_id], metric: a.points});
    const ratingRows = source.ratings.filter(r => r.match_id === match.id);
    for (const contest of snapshot.contests) {
      if (contest.unplayed) continue;
      const expected = contest.format === 'Doubles' ? 2 : 1;
      if (contest.homePlayers.length !== expected || contest.awayPlayers.length !== expected) {
        // Missing opponents are awarded slots, never individual player statistics.
        if (contest.homePlayers.length && contest.awayPlayers.length) warnings.push(`${match.id}: inconsistent snapshot participants.`);
        continue;
      }
      const rows = ratingRows.filter(r => r.contest_id === contest.id);
      const participants = [...contest.homePlayers.map(p => ({...p, side: 'Home' as const, outcome: contest.homeOutcome, team: match.home_team_id})),
        ...contest.awayPlayers.map(p => ({...p, side: 'Away' as const, outcome: contest.awayOutcome, team: match.away_team_id}))];
      // Full identity/side/outcome reconciliation avoids partial doubles and stale corrected ledgers.
      const validOutcomes = (contest.homeOutcome === 'W' && contest.awayOutcome === 'L')
        || (contest.homeOutcome === 'L' && contest.awayOutcome === 'W') || (contest.homeOutcome === 'T' && contest.awayOutcome === 'T');
      if (!validOutcomes || rows.length !== participants.length || new Set(rows.map(r => r.player_id)).size !== participants.length
        || !participants.every(p => rows.some(r => r.player_id === p.id && r.side === p.side && r.team_id === p.team
          && r.outcome === p.outcome && r.format === contest.format && finite(r.ci_delta) && finite(r.clash_index_before)
          && finite(r.win_probability) && r.win_probability > 0 && r.win_probability < 1))) {
        warnings.push(`${match.home_name} / ${match.away_name}, ${contest.format} ${contest.position}: incomplete or inconsistent frozen ratings.`);
        continue;
      }
      if (rows.some(r => rows.filter(p => p.side === r.side).some(p => p.win_probability !== r.win_probability))) {
        warnings.push(`${match.id}: inconsistent partner probabilities in frozen ratings.`); continue;
      }
      eligible.push(...rows);
      const winners = rows.filter(r => r.outcome === 'W');
      const winner = winners[0];
      if (winner && winners.every(r => r.win_probability === winner.win_probability) && winner.win_probability < .5) {
        const opponents = rows.filter(r => r.side !== winner.side);
        add(`upset:${match.id}:${contest.id}`, 'Upsets', `${winners.map(r => r.player_name).join(' & ')} defeated ${opponents.map(r => r.player_name).join(' & ')} in ${contest.format.toLowerCase()} with ${(winner.win_probability * 100).toFixed(1)}% frozen win probability.`,
          [ref('clash_contest_rating_facts', rows.map(r => `${r.contest_id}:${r.player_id}`)), ref('launch_match_final_snapshots', [match.id])],
          'Played underdog win: frozen win_probability < 0.5. Each doubles contest counts once.',
          {match_id: match.id, team_ids: [winner.team_id], player_ids: winners.map(r => r.player_id), metric: winner.win_probability});
        const winnerCi = winners.reduce((n,r) => n + r.clash_index_before, 0) / winners.length;
        const opponentCi = opponents.reduce((n,r) => n + r.clash_index_before, 0) / opponents.length;
        if (winnerCi < opponentCi) add(`lower-ci:${match.id}:${contest.id}`, 'Achievements',
          `${winners.map(r => r.player_name).join(' & ')} won ${contest.format.toLowerCase()} with lower frozen CI (${winnerCi.toFixed(1)} vs ${opponentCi.toFixed(1)}${winners.length > 1 ? ', partnership means' : ''}).`,
          [ref('clash_contest_rating_facts', rows.map(r => `${r.contest_id}:${r.player_id}`))],
          'Compare pre-match CI only; partnership means are descriptive, not the weighted doubles prediction model.',
          {match_id: match.id, team_ids: [winner.team_id], player_ids: winners.map(r => r.player_id)});
      }
    }
    const prediction = source.predictions.find(p => p.match_id === match.id && p.source === 'matchLineup'
      && p.side === 'Home' && p.team_id === match.home_team_id && p.opponent_team_id === match.away_team_id
      && p.model_version === TEAM_STRENGTH_VERSION && p.prediction_readiness !== 'Unavailable' && finite(p.expected_score) && finite(p.chance_of_victory)
      && p.chance_of_victory >= 0 && p.chance_of_victory <= 1);
    if (prediction) add(`projection:${match.id}`, 'Match', `${match.home_name}: saved roster-lock projection ${prediction.expected_score.toFixed(1)} points and ${(100 * prediction.chance_of_victory).toFixed(1)}% win chance; official result ${result.home_score}–${result.away_score}; played contest points ${breakdown.playedSingles.home + breakdown.doubles.home}.`,
      [...refs, ref('team_strength_prediction_snapshots', [prediction.id ?? `${match.id}:Home:matchLineup`])],
      `Saved forecast (${prediction.model_version}); separately awarded team points do not inflate played performance.`, {match_id: match.id});
    else {
      const venue = ratingRows[0]?.venue;
      const manifests = source.rosterManifests?.filter(r => r.match_id === match.id) ?? [];
      const reconstructed = venue && ratingRows.every(r => r.venue === venue)
        && [match.home_team_id,match.away_team_id].every(id => manifests.some(r => r.team_id === id))
        ? calculateLockedRosterPrediction({homeTeamId: match.home_team_id, awayTeamId: match.away_team_id,
          rosterPlayers: source.rosterPlayers?.filter(r => r.match_id === match.id) ?? [],
          frozenRatings: source.frozenRatings?.filter(r => r.match_id === match.id) ?? [], venue}) : undefined;
      if (reconstructed) add(`projection:${match.id}`, 'Match',
        `${match.home_name}: reconstructed roster-lock projection ${reconstructed.homeExpectedScore.toFixed(1)} points and ${(100 * reconstructed.homeChanceOfVictory).toFixed(1)}% win chance; official result ${result.home_score}–${result.away_score}; played contest points ${breakdown.playedSingles.home + breakdown.doubles.home}.`,
        [...refs, ref('launch_match_roster_snapshot_players', [match.id]), ref('clash_match_rating_snapshots', [match.id])],
        `Historical reconstruction using complete locked roster IDs, frozen pre-result CI, venue and ${TEAM_STRENGTH_VERSION}. It is an estimate, not a saved forecast. Extra team points excluded from played performance.`, {match_id: match.id});
      else warnings.push(`${match.home_name} vs ${match.away_name}: no complete roster-lock forecast; team win probability withheld.`);
    }
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const currentYear = Number(source.seasons.find(s => s.id === round.season_id)?.name.match(/20\d{2}/)?.[0]);
    const previous = source.history.filter(h => finite(h.home_score) && finite(h.away_score)
      && ((h.played_on && match.date && h.played_on < match.date)
        || (!h.played_on && Number(h.season_name.match(/20\d{2}/)?.[0]) < currentYear))
      && [normalize(h.home_team_name), normalize(h.away_team_name)].sort().join('|') === [normalize(match.home_name), normalize(match.away_name)].sort().join('|'))
      .sort((a, b) => a.id - b.id);
    for (const meeting of previous) add(`rematch:${match.id}:${meeting.id}`, 'History', `Recorded prior meeting: ${meeting.away_team_name} ${meeting.away_score} at ${meeting.home_team_name} ${meeting.home_score}, ${meeting.season_name}, ${meeting.event_label}${meeting.played_on ? ` (${meeting.played_on})` : ' (exact date not recorded)'}.`,
      [ref('historical_team_matches', [String(meeting.id)]), ...refs], 'Exact normalized team names and an earlier recorded date or earlier season. This is a recorded comparison, not an exhaustive series, streak or all-time record claim.', {match_id: match.id});
  }
  const complete = matches.length === 4 && finalized.length === 4;
  const statsComplete = complete && finalized.every(m => source.snapshots.some(s => s.match_id === m.id && s.locked))
    && !warnings.some(w => /snapshot|ratings/.test(w));
  const byPlayer = new Map<string, PulseRating[]>();
  for (const row of eligible) byPlayer.set(row.player_id, [...(byPlayer.get(row.player_id) ?? []), row]);
  const movers = [...byPlayer.entries()].map(([id, rows]) => ({id, rows, delta: rows.reduce((n, r) => n + r.ci_delta, 0)}))
    .sort((a, b) => b.delta - a.delta || a.id.localeCompare(b.id));
  const bothWins = new Set<string>();
  const perfectLosing = new Set<string>();
  for (const player of movers) {
    const first = player.rows[0];
    const rank = movers.findIndex(p => p.delta === player.delta) + 1;
    const refs = [ref('clash_contest_rating_facts', player.rows.map(r => `${r.contest_id}:${r.player_id}`))];
    add(`ci:${player.id}`, 'CI movement', `${first.player_name} (${first.team_name}): ${signed(player.delta)} CI across ${player.rows.length} played contests.`,
      refs, `Sum of every eligible contest ci_delta (${player.rows.map(r => signed(r.ci_delta)).join(', ')}). Signed net movement; rank ${rank}, ties included.`,
      {player_ids: [player.id], team_ids: [...new Set(player.rows.map(r => r.team_id))], metric: player.delta, ranking: rank});
    const matchGroups = new Map<string, PulseRating[]>();
    for (const row of player.rows) matchGroups.set(row.match_id, [...(matchGroups.get(row.match_id) ?? []), row]);
    for (const [matchId, rows] of matchGroups) {
      if (!rows.some(r => r.format === 'Singles' && r.outcome === 'W') || !rows.some(r => r.format === 'Doubles' && r.outcome === 'W')) continue;
      bothWins.add(player.id);
      const result = source.results.find(r => r.match_id === matchId)!;
      const lost = rows[0].side === 'Home' ? result.home_score! < result.away_score! : result.away_score! < result.home_score!;
      const perfect = rows.every(r => r.outcome === 'W');
      if (lost && perfect) perfectLosing.add(player.id);
      add(`both:${matchId}:${player.id}`, 'Achievements', `${first.player_name} (${rows[0].team_name}) won singles and doubles${lost && perfect ? ' with a perfect played record on a losing team' : ''}.`,
        [...refs, ref('launch_match_results', [matchId])], 'At least one played win in each format within the same match; perfect means every played contest was won.',
        {match_id: matchId, team_ids: [rows[0].team_id], player_ids: [player.id]});
    }
  }
  if (statsComplete) {
    const refs = [ref('clash_contest_rating_facts', eligible.map(r => `${r.contest_id}:${r.player_id}`)), ref('launch_match_final_snapshots', finalized.map(m => m.id))];
    const contests = new Set(eligible.map(r => `${r.match_id}:${r.contest_id}`));
    const upsets = facts.filter(f => f.category === 'Upsets').length;
    add('round:upsets', 'Round', `${upsets} individual contest upsets in ${contests.size} played contests (${(100 * upsets / (contests.size || 1)).toFixed(1)}%).`, refs,
      'Underdog wins / all verified played contests, including ties in denominator; doubles counted once.', {metric: upsets});
    add('round:both', 'Round', `${bothWins.size} players won both singles and doubles.`, refs, 'Count distinct players with a win in both formats in the same match.', {metric: bothWins.size});
    add('round:perfect-losing', 'Round', `${perfectLosing.size} perfect performers on losing teams.`, refs, 'Count distinct both-format winners with no played loss or tie and a lower official team score.', {metric: perfectLosing.size});
    for (const teamId of new Set(eligible.map(r => r.team_id))) {
      const rows = eligible.filter(r => r.team_id === teamId);
      const delta = rows.reduce((n, r) => n + r.ci_delta, 0);
      add(`team-ci:${teamId}`, 'Round', `${rows[0].team_name}: ${signed(delta)} combined player CI.`,
        [ref('clash_contest_rating_facts', rows.map(r => `${r.contest_id}:${r.player_id}`))], 'Sum all played contest deltas for every team player, regardless of official team result.', {team_ids: [teamId], metric: delta});
    }
    for (const format of ['Singles','Doubles'] as const) {
      const performance = [...new Set(eligible.map(r => r.team_id))].map(teamId => {
        const rows = [...new Map(eligible.filter(r => r.team_id === teamId && r.format === format)
          .map(r => [`${r.match_id}:${r.contest_id}`,r])).values()];
        const points = rows.reduce((n,r) => n + (r.outcome === 'W' ? 1 : r.outcome === 'T' ? .5 : 0),0);
        return {teamId,name: rows[0]?.team_name,points,played: rows.length,share: rows.length ? points/rows.length : -1};
      });
      const best = Math.max(...performance.map(p => p.share));
      const leaders = performance.filter(p => p.played && p.share === best);
      if (leaders.length) add(`round:strongest-${format.toLowerCase()}`, 'Round',
        `${format} leaders by played-contest point share: ${leaders.map(p => `${p.name} (${p.points}/${p.played}, ${(p.share*100).toFixed(1)}%)`).join('; ')}.`,
        refs, 'Each played contest: W=1, T=0.5, L=0, divided by played contests. Doubles pairs counted once. All tied leaders included; no unplayed slots or extra team awards.',
        {team_ids: leaders.map(p => p.teamId), metric: best});
    }
  }
  if (complete) {
    const results = finalized.map(m => source.results.find(r => r.match_id === m.id)!);
    const homeWins = results.filter(r => r.home_score! > r.away_score!).length;
    const awayWins = results.filter(r => r.away_score! > r.home_score!).length;
    add('round:home-away', 'Round', `Home teams won ${homeWins} of ${matches.length} matches; away wins ${awayWins}; ties ${matches.length - homeWins - awayWins}.`,
      [ref('launch_match_results', finalized.map(m => m.id))], 'Official published team scores.', {metric: homeWins});
  }
  const nextRound = source.rounds.filter(r => r.season_id === round.season_id && r.number > round.number).sort((a,b) => a.number - b.number)[0];
  if (nextRound) for (const match of source.matches.filter(m => m.round_id === nextRound.id)) add(`upcoming:${match.id}`, 'Upcoming',
    `Round ${nextRound.number}: ${match.away_name} at ${match.home_name}${match.date ? ` — ${match.date}` : ' — date TBD'}.`,
    [ref('launch_schedule_matches', [match.id])], 'Scheduled next round matchup; subject to schedule changes.', {match_id: match.id, team_ids: [match.away_team_id, match.home_team_id]});
  if (!complete) warnings.push(`Partial round: ${finalized.length}/${matches.length} finalized. Complete round statistics require four finalized matches.`);
  return {facts: facts.sort((a,b) => a.fact_key.localeCompare(b.fact_key)), complete: statsComplete, finalized: finalized.length, scheduled: matches.length, warnings, eligible};
}

export function exportRoundFacts(label: string, facts: SavedPulseFact[], warnings: string[] = []): string {
  const visible = facts.filter(f => f.is_current && f.status !== 'hidden');
  const categories: PulseCategory[] = ['Match', 'Upsets', 'CI movement', 'Achievements', 'Round', 'Streaks', 'History', 'Upcoming', 'Editorial'];
  const lines = [`CLASH PULSE — ${label}`, 'Verified statistical briefing for a separately written recap. Do not invent missing records or probabilities.',
    'Calculated facts are ready to use without approval; editorial entries are commissioner supplied. Hidden and superseded facts are excluded. Long source lists are abbreviated; full references remain in the library.',
    ...warnings.map(w => `DATA NOTE: ${w}`)];
  for (const category of categories) {
    lines.push('', category === 'CI movement' ? 'TOP FIVE CI GAINS AND LOSSES (INCLUDING TIES)' : category.toUpperCase());
    let rows = visible.filter(f => f.category === category);
    if (category === 'CI movement') {
      const gains = rows.filter(f => (f.metric ?? 0) > 0).sort((a,b) => b.metric! - a.metric!);
      const losses = rows.filter(f => (f.metric ?? 0) < 0).sort((a,b) => a.metric! - b.metric!);
      const top = (list: SavedPulseFact[]) => list.filter(f => list.length <= 5 || Math.abs(f.metric!) >= Math.abs(list[4].metric!));
      rows = [...top(gains), ...top(losses)];
    } else if (category === 'Upsets') rows.sort((a,b) => (a.metric ?? 1) - (b.metric ?? 1));
    if (!rows.length) lines.push('No supported facts available.');
    for (const fact of rows) {
      lines.push(`- ${fact.origin === 'editorial' ? '[Editorial] ' : ''}${fact.fact_text}`);
      lines.push(`  Calculation: ${fact.calculation}`);
      lines.push(`  Sources: ${fact.sources.map(s => `${s.table} [${s.ids.length > 4 ? `${s.ids.slice(0,2).join(', ')}; ${s.ids.length} records total` : s.ids.join(', ')}]`).join('; ')}`);
    }
  }
  return lines.join('\n');
}
