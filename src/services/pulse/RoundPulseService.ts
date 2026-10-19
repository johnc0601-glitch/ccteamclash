import type {PulseSource, PulseRating} from './PulseFacts';
import {verifiedRoundRatings} from './PulseFacts';
import {buildFinalScoreBreakdown} from '@/services/matches/FinalScoreBreakdown';
import type {FinalMatchdayV2Snapshot} from '@/services/matches/FinalMatchdayCanary';
import {TEAM_STRENGTH_VERSION} from '@/services/teamStrength/TeamStrength';

export type RoundPulseMatch = {
  matchId: string; home: string; away: string; homeScore: number; awayScore: number;
  margin: number; winner: string | null;
};
export type RoundPulseMover = {playerId: string; name: string; team: string; change: number};
export type RoundPulseUpset = {matchId: string; format: 'Singles' | 'Doubles';
  winner: string; loser: string; probability: number};
export type RoundPulseFormat = {format: 'Singles' | 'Doubles'; team: string;
  points: number; played: number; pct: number};
export type RoundPulseData = {
  roundId: string; roundNumber: number; seasonName: string;
  scheduled: number; finalized: number; complete: boolean; verified: boolean;
  matches: RoundPulseMatch[];
  biggest: RoundPulseMatch | null; closest: RoundPulseMatch | null;
  homeWins: number; awayWins: number; ties: number;
  players: number | null; singles: number | null; doubles: number | null;
  points: {published: number; playedSingles: number; playedDoubles: number;
    awarded: number; automatic: number; rosterNoShow: number; womenBonus: number; other: number;
    unitemized: number} | null;
  upsetCount: number | null; upsetRate: number | null; biggestUpset: RoundPulseUpset | null;
  teamUpsets: {team: string; opponent: string; winChance: number}[];
  topGainers: RoundPulseMover[]; topDecliners: RoundPulseMover[];
  positiveByTeam: {team: string; players: number}[];
  formatLeaders: RoundPulseFormat[];
  warnings: string[];
};
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const rounded = (n: number) => Math.round(n * 1000) / 1000;
const signed = (n: number) => `${n > 0 ? '+' : ''}${n}`;
const key = (p: PulseRating) => `${p.match_id}:${p.contest_id}`;

/**
 * League-wide snapshot, based ONLY on published match results. Match scores
 * are independent of played-contest CI facts and additional team awards.
 * Invalid or partially reconciled frozen ratings withhold round-wide player
 * totals instead of silently understating them.
 */
export function buildRoundPulse(source: PulseSource, roundId: string): RoundPulseData {
  const round = source.rounds.find(r => r.id === roundId);
  if (!round) throw new Error('Unknown round');
  const seasonName = source.seasons.find(s => s.id === round.season_id)?.name ?? round.season_id;
  const scheduled = source.matches.filter(m => m.round_id === roundId && m.season_id === round.season_id);
  const warnings: string[] = [];
  const matches: RoundPulseMatch[] = [];
  const eligibleMatches = new Set<string>();
  const expectedPlayed = new Set<string>();
  const totalPoints = {published: 0, playedSingles: 0, playedDoubles: 0,
    awarded: 0, automatic: 0, rosterNoShow: 0, womenBonus: 0, other: 0, unitemized: 0};
  let snapshotCount = 0;

  for (const match of scheduled) {
    const result = source.results.find(r => r.match_id === match.id && r.status === 'Published');
    if (!result || !finite(result.home_score) || !finite(result.away_score)) continue;
    const margin = Math.abs(result.home_score - result.away_score);
    matches.push({matchId: match.id, home: match.home_name, away: match.away_name,
      homeScore: result.home_score, awayScore: result.away_score, margin,
      winner: result.home_score > result.away_score ? match.home_name
        : result.away_score > result.home_score ? match.away_name : null});
    const snapshot = source.snapshots.find(s => s.match_id === match.id && s.locked)?.payload;
    if (!snapshot || snapshot.matchId !== match.id
      || snapshot.homeTeam?.id !== match.home_team_id || snapshot.awayTeam?.id !== match.away_team_id
      || snapshot.homeScore !== result.home_score || snapshot.awayScore !== result.away_score
      || !Array.isArray(snapshot.contests)
      || new Set(snapshot.contests.map(c => c.id)).size !== snapshot.contests.length) {
      warnings.push(`${match.away_name} at ${match.home_name}: locked scoring details unavailable or inconsistent.`);
      continue;
    }
    const adjustments = source.adjustments.filter(a => a.match_id === match.id);
    if (adjustments.some(a => !finite(a.points) || a.points < 0)) {
      warnings.push(`${match.home_name}: invalid adjustment ledger. Scoring breakdown withheld.`);
      continue;
    }
    const cleanAdjustments: FinalMatchdayV2Snapshot['adjustments'] = adjustments.map(a=>({
      awardedTeamId: a.awarded_team_id,
      category: a.category as FinalMatchdayV2Snapshot['adjustments'][number]['category'],
      points: a.points, note: a.note,
    }));
    const breakdown = buildFinalScoreBreakdown({...snapshot, adjustments: cleanAdjustments});
    if (!breakdown.balanced) {
      warnings.push(`${match.away_name} at ${match.home_name}: itemized scoring does not reconcile to the published final.`);
    }
    eligibleMatches.add(match.id);
    snapshotCount++;
    totalPoints.published += result.home_score + result.away_score;
    // An award entered on a one-sided contest must never be counted as a
    // *played* point merely because the display row has a W/L outcome.
    const fullContests = snapshot.contests.filter(contest =>
      !contest.unplayed &&
      (contest.format === 'Singles' || contest.format === 'Doubles') &&
      contest.homePlayers.length === (contest.format === 'Singles' ? 1 : 2) &&
      contest.awayPlayers.length === (contest.format === 'Singles' ? 1 : 2));
    for (const c of fullContests) expectedPlayed.add(`${match.id}:${c.id}`);
    const playedSingles = fullContests.filter(c=>c.format==='Singles').length;
    const playedDoubles = fullContests.filter(c=>c.format==='Doubles').length * 2;
    totalPoints.playedSingles += playedSingles;
    totalPoints.playedDoubles += playedDoubles;
    totalPoints.automatic += (breakdown.playedSingles.home + breakdown.playedSingles.away
      + breakdown.doubles.home + breakdown.doubles.away) - playedSingles - playedDoubles;
    totalPoints.unitemized += breakdown.unitemized.home + breakdown.unitemized.away;
    for (const adjustment of adjustments) {
      totalPoints.awarded += adjustment.points;
      if (adjustment.category === 'NoShow' || adjustment.category === 'Penalty') totalPoints.rosterNoShow += adjustment.points;
      else if (adjustment.category === 'WomenBonus') totalPoints.womenBonus += adjustment.points;
      else totalPoints.other += adjustment.points;
    }
  }

  const finalized = matches.length;
  const complete = scheduled.length > 0 && scheduled.length === finalized;
  const report = verifiedRoundRatings(source, roundId);
  const eligible = report.filter(p => eligibleMatches.has(p.match_id));
  const rawRows = source.ratings.filter(r => eligibleMatches.has(r.match_id));
  const eligibleRowKeys = new Set(eligible.map(p=>`${p.match_id}:${p.contest_id}:${p.player_id}`));
  // Every rated participant must reconcile to a played contest. This prevents
  // publishing incomplete CI/upset counts if even one roster was reimported.
  const verified = complete && snapshotCount === finalized
    && rawRows.length === eligible.length
    && rawRows.every(p => eligibleRowKeys.has(`${p.match_id}:${p.contest_id}:${p.player_id}`))
    && new Set(eligible.map(p=>key(p))).size === expectedPlayed.size
    && [...expectedPlayed].every(contestKey => eligible.some(p=>key(p)===contestKey))
    && !warnings.length;

  const sorted = [...matches].sort((a,b) => b.margin - a.margin || a.matchId.localeCompare(b.matchId));
  const closest = [...matches].sort((a,b) => a.margin - b.margin || a.matchId.localeCompare(b.matchId))[0] ?? null;
  const base: RoundPulseData = {
    roundId, roundNumber: round.number, seasonName,
    scheduled: scheduled.length, finalized, complete, verified,
    matches: [...matches].sort((a,b) => a.matchId.localeCompare(b.matchId)),
    biggest: sorted[0] ?? null, closest,
    homeWins: matches.filter(m=>m.winner === m.home).length,
    awayWins: matches.filter(m=>m.winner === m.away).length,
    ties: matches.filter(m=>m.winner === null).length,
    players: null, singles: null, doubles: null, points: snapshotCount === finalized && snapshotCount > 0
      ? {...totalPoints, published: rounded(totalPoints.published), playedSingles: rounded(totalPoints.playedSingles),
        playedDoubles: rounded(totalPoints.playedDoubles), awarded: rounded(totalPoints.awarded), automatic: rounded(totalPoints.automatic),
        rosterNoShow: rounded(totalPoints.rosterNoShow), womenBonus: rounded(totalPoints.womenBonus),
        other: rounded(totalPoints.other), unitemized: rounded(totalPoints.unitemized)}
      : null,
    upsetCount: null, upsetRate: null, biggestUpset: null,
    teamUpsets: [], topGainers: [], topDecliners: [], positiveByTeam: [], formatLeaders: [], warnings,
  };
  if (!complete) warnings.push(`Partial round: ${finalized} of ${scheduled.length} results published. Player and upset totals wait for the complete round.`);
  if (!verified) {
    if (complete) warnings.push('Player and upset statistics withheld until every frozen contest rating reconciles with locked published results.');
    return base;
  }

  const contests = new Map<string, PulseRating[]>();
  for (const p of eligible) contests.set(key(p),[...(contests.get(key(p)) ?? []),p]);
  base.players = new Set(eligible.map(p => p.player_id)).size;
  base.singles = [...contests.values()].filter(rows=>rows[0]?.format==='Singles').length;
  base.doubles = [...contests.values()].filter(rows=>rows[0]?.format==='Doubles').length;

  const upsets: RoundPulseUpset[] = [];
  const formatStats = new Map<string, {format: 'Singles' | 'Doubles'; team: string;
    points: number; played: number}>();
  for (const [contestKey, rows] of contests) {
    const format = rows[0].format;
    const winners = rows.filter(p=>p.outcome==='W');
    const losers = rows.filter(p=>p.outcome==='L');
    if (winners.length && losers.length && winners.every(p=>p.win_probability===winners[0].win_probability)
      && winners[0].win_probability < .5) {
      upsets.push({
        matchId: rows[0].match_id, format,
        winner: winners.map(p=>p.player_name).sort().join(' & '),
        loser: losers.map(p=>p.player_name).sort().join(' & '),
        probability: winners[0].win_probability,
      });
    }
    // Doubles counts once per TEAM side and contest, not once per partner.
    for (const side of ['Home','Away'] as const) {
      const sideRows = rows.filter(p=>p.side===side);
      if (!sideRows.length) continue;
      const p=sideRows[0], k=`${format}:${p.team_id}`;
      const value = formatStats.get(k) ?? {format, team:p.team_name,points:0,played:0};
      value.played++;
      value.points += p.outcome === 'W' ? 1 : p.outcome === 'T' ? .5 : 0;
      formatStats.set(k,value);
    }
    void contestKey;
  }
  upsets.sort((a,b)=>a.probability-b.probability||a.matchId.localeCompare(b.matchId));
  base.upsetCount=upsets.length;
  base.upsetRate=contests.size ? rounded(100*upsets.length/contests.size) : 0;
  base.biggestUpset=upsets[0] ?? null;

  const movers = new Map<string,RoundPulseMover>();
  const positiveTeams = new Map<string,Set<string>>();
  for (const p of eligible) {
    const value = movers.get(p.player_id) ?? {playerId:p.player_id,name:p.player_name,team:p.team_name,change:0};
    value.change += p.ci_delta;
    movers.set(p.player_id,value);
  }
  for (const p of movers.values()) {
    p.change=rounded(p.change);
    if (p.change <= 0) continue;
    const row=eligible.find(r=>r.player_id===p.playerId)!;
    const team=positiveTeams.get(row.team_id)??new Set<string>();
    team.add(p.playerId);
    positiveTeams.set(row.team_id,team);
  }
  base.topGainers=[...movers.values()].filter(m=>m.change>0)
    .sort((a,b)=>b.change-a.change||a.name.localeCompare(b.name)).slice(0,5);
  base.topDecliners=[...movers.values()].filter(m=>m.change<0)
    .sort((a,b)=>a.change-b.change||a.name.localeCompare(b.name)).slice(0,5);
  base.positiveByTeam=[...positiveTeams].map(([id,ids])=>({
    team:eligible.find(p=>p.team_id===id)?.team_name??id,players:ids.size,
  })).sort((a,b)=>b.players-a.players||a.team.localeCompare(b.team));
  const formatGroups=[...formatStats.values()].map(g=>({...g,pct:rounded(100*g.points/g.played)}));
  base.formatLeaders=(['Singles','Doubles'] as const).flatMap(format=>{
    const rows=formatGroups.filter(g=>g.format===format).sort((a,b)=>b.pct-a.pct||a.team.localeCompare(b.team));
    return rows.filter(g=>g.pct===rows[0]?.pct);
  });

  // A team upset requires an actual saved pre-result roster-lock forecast.
  // Never infer a team probability from player odds or today's CI.
  for (const match of scheduled.filter(m=>eligibleMatches.has(m.id))) {
    const result=source.results.find(r=>r.match_id===match.id && r.status==='Published');
    const saved=source.predictions.find(p=>p.match_id===match.id && p.source==='matchLineup' &&
      p.side==='Home' && p.team_id===match.home_team_id && p.opponent_team_id===match.away_team_id &&
      p.model_version===TEAM_STRENGTH_VERSION && p.prediction_readiness!=='Unavailable' &&
      finite(p.chance_of_victory) && p.chance_of_victory>=0 && p.chance_of_victory<=1);
    if (!result || !saved || result.home_score===result.away_score) continue;
    const homeWin=result.home_score!>result.away_score!;
    const winChance=homeWin?saved.chance_of_victory:1-saved.chance_of_victory;
    if (winChance < .5) base.teamUpsets.push({team:homeWin?match.home_name:match.away_name,
      opponent:homeWin?match.away_name:match.home_name,winChance});
  }
  base.teamUpsets.sort((a,b)=>a.winChance-b.winChance);
  return base;
}

export function copyRoundPulse(summary: RoundPulseData): string {
  const score=(n:number)=>Number.isInteger(n)?String(n):n.toFixed(1);
  const rows=[
    `ROUND PULSE — ${summary.seasonName} · Round ${summary.roundNumber}`,
    `${summary.finalized} of ${summary.scheduled} matches published${summary.complete?' (complete)':' (partial)'}.`,
    ...summary.matches.map(m=>`${m.away} ${score(m.awayScore)} at ${m.home} ${score(m.homeScore)}.`),
    ...(summary.biggest?[`Biggest margin: ${summary.biggest.winner??'Tie'} by ${score(summary.biggest.margin)} vs ${summary.biggest.winner===summary.biggest.home?summary.biggest.away:summary.biggest.home}.`]:[]),
    ...(summary.closest?[`Closest: ${summary.closest.away} at ${summary.closest.home}, ${score(summary.closest.margin)} point margin.`]:[]),
    `Home teams ${summary.homeWins} wins; away teams ${summary.awayWins}; ties ${summary.ties}.`,
  ];
  if (summary.points) rows.push(`Team points: ${score(summary.points.published)} awarded total; ${score(summary.points.playedSingles)} played singles; ${score(summary.points.playedDoubles)} played doubles; ${score(summary.points.awarded)} itemized extra awards (including ${score(summary.points.rosterNoShow)} no-show/penalty, ${score(summary.points.womenBonus)} women's bonus, ${score(summary.points.other)} other).`);
  if (summary.verified) {
    rows.push(`Verified competitors: ${summary.players}; ${summary.singles} played singles and ${summary.doubles} played doubles.`);
    rows.push(`Individual underdog wins: ${summary.upsetCount} (${summary.upsetRate}% of played contests); doubles partnerships counted once.`);
    if(summary.biggestUpset)rows.push(`Biggest individual upset: ${summary.biggestUpset.winner} over ${summary.biggestUpset.loser} (${(100*summary.biggestUpset.probability).toFixed(1)}% frozen pre-match chance).`);
    if(summary.topGainers.length)rows.push(`Top CI gainers: ${summary.topGainers.map(p=>`${p.name} ${signed(p.change)}`).join('; ')}.`);
    if(summary.topDecliners.length)rows.push(`Top CI declines: ${summary.topDecliners.map(p=>`${p.name} ${signed(p.change)}`).join('; ')}.`);
    if(summary.positiveByTeam.length)rows.push(`Most players gaining CI: ${summary.positiveByTeam[0].team} (${summary.positiveByTeam[0].players}).`);
    for(const row of summary.formatLeaders)rows.push(`${row.format} leader: ${row.team}, ${row.points}/${row.played} played contests (${row.pct}%).`);
    for(const item of summary.teamUpsets)rows.push(`Verified team upset: ${item.team} over ${item.opponent} (${(100*item.winChance).toFixed(1)}% saved pre-match chance).`);
  } else rows.push('Player totals, CI rankings and upset counts pending full verification.');
  if(summary.points?.automatic)rows.push(`Automatic or one-sided scoreboard points not counted as played: ${score(summary.points.automatic)}.`);
  if(summary.points && Math.abs(summary.points.unitemized)>.001)rows.push('CAUTION: Some published team points could not be fully itemized from the available ledger.');
  if(summary.warnings.length)rows.push('Limitations: '+summary.warnings.join(' | '));
  return rows.join('\n');
}
