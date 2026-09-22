import 'server-only';

import {createClient} from '@/lib/supabase/server';
import type {
  ClashPulseFactCandidate,
  ClashPulseFactCategory,
  ClashPulseFactData,
  ClashPulseFactScope,
} from '@/components/commissioner/clashPulseFacts';

type RatedFact = {
  sourceKey: string;
  seasonId: string;
  seasonLabel: string;
  eventLabel: string;
  playerId: string;
  playerName: string;
  teamName: string;
  opponentTeamName: string;
  partnerName: string | null;
  opponentNames: string[];
  side: 'Home' | 'Away';
  format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T';
  clashIndexBefore: number;
  opponentEffectiveCi: number;
  winProbability: number;
  performanceVsExpected: number;
  ciDelta: number;
};

type HistoricalFactRow = {
  matchup_deduplication_key: string;
  season_id: string;
  player_id: string;
  player_name: string;
  team_name: string;
  opponent_team_name: string;
  side: 'Home' | 'Away';
  format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T';
  clash_index_before: number;
  opponent_effective_ci: number | string;
  win_probability: number | string;
  performance_vs_expected: number | string;
  ci_delta: number;
};

type HistoricalMatchupRow = {
  deduplication_key: string;
  season_id: string;
  season_name: string;
  event_label: string;
  player_id: string;
  partner_player_name: string | null;
  opponent_one_player_name: string | null;
  opponent_two_player_name: string | null;
};

type LiveFactRow = {
  contest_id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  player_name: string;
  team_name: string;
  side: 'Home' | 'Away';
  format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T';
  clash_index_before: number;
  opponent_effective_ci: number | string;
  win_probability: number | string;
  performance_vs_expected: number | string;
  ci_delta: number;
};

const PAGE_SIZE = 1000;
const CATEGORY_LIMIT = 5;

export async function getClashPulseFactData(): Promise<ClashPulseFactData> {
  const supabase = await createClient();
  const db = supabase as any;

  const [historicalRows, matchupRows, liveRows, seasonRows] = await Promise.all([
    loadPaged<HistoricalFactRow>(
      db,
      'historical_clash_contest_rating_facts',
      'matchup_deduplication_key,season_id,player_id,player_name,team_name,opponent_team_name,side,format,outcome,clash_index_before,opponent_effective_ci,win_probability,performance_vs_expected,ci_delta',
    ),
    loadPaged<HistoricalMatchupRow>(
      db,
      'historical_player_matchups',
      'deduplication_key,season_id,season_name,event_label,player_id,partner_player_name,opponent_one_player_name,opponent_two_player_name',
    ),
    loadPaged<LiveFactRow>(
      db,
      'clash_contest_rating_facts',
      'contest_id,match_id,player_id,team_id,player_name,team_name,side,format,outcome,clash_index_before,opponent_effective_ci,win_probability,performance_vs_expected,ci_delta',
    ),
    db.from('launch_seasons').select('id,name,year,active,archived').order('year', {ascending: false}),
  ]);

  const matchupByKey = new Map(
    matchupRows.map((row) => [`${row.deduplication_key}:${row.player_id}`, row]),
  );

  const historicalFacts: RatedFact[] = historicalRows.map((row) => {
    const matchup = matchupByKey.get(`${row.matchup_deduplication_key}:${row.player_id}`);
    return {
      sourceKey: row.matchup_deduplication_key,
      seasonId: row.season_id,
      seasonLabel: shortSeason(matchup?.season_name ?? row.season_id),
      eventLabel: matchup?.event_label ?? 'Historical match',
      playerId: row.player_id,
      playerName: row.player_name,
      teamName: row.team_name,
      opponentTeamName: row.opponent_team_name,
      partnerName: matchup?.partner_player_name ?? null,
      opponentNames: [matchup?.opponent_one_player_name, matchup?.opponent_two_player_name].filter(Boolean) as string[],
      side: row.side,
      format: row.format,
      outcome: row.outcome,
      clashIndexBefore: row.clash_index_before,
      opponentEffectiveCi: Number(row.opponent_effective_ci),
      winProbability: Number(row.win_probability),
      performanceVsExpected: Number(row.performance_vs_expected),
      ciDelta: row.ci_delta,
    };
  });

  const liveFacts = liveRows.length ? await hydrateLiveFacts(db, liveRows, seasonRows.data ?? []) : [];
  const allFacts = [...historicalFacts, ...liveFacts];
  const activeSeason = (seasonRows.data ?? []).find((season: any) => season.active && !season.archived);
  const seasonIds = [...new Set(allFacts.map((fact) => fact.seasonId))];
  const scopes: ClashPulseFactScope[] = seasonIds
    .sort((a, b) => seasonSortValue(b) - seasonSortValue(a))
    .map((seasonId) => {
      const rows = allFacts.filter((fact) => fact.seasonId === seasonId);
      return {
        id: seasonId,
        label: rows[0]?.seasonLabel ?? shortSeason(seasonId),
        description: seasonId === activeSeason?.id
          ? 'Current season published results'
          : 'Verified league history',
        candidates: buildCandidates(rows, seasonId),
      };
    })
    .filter((scope) => scope.candidates.length > 0);

  if (allFacts.length) {
    scopes.push({
      id: 'all-time',
      label: 'All-Time',
      description: 'Best verified facts across recorded Team Clash history',
      candidates: buildCandidates(allFacts, 'all-time'),
    });
  }

  const currentSeasonHasResults = Boolean(activeSeason?.id && allFacts.some((fact) => fact.seasonId === activeSeason.id));
  const latestHistorical = scopes.find((scope) => scope.id !== 'all-time' && scope.id !== activeSeason?.id);

  return {
    scopes,
    defaultScopeId: currentSeasonHasResults
      ? activeSeason.id
      : latestHistorical?.id ?? scopes[0]?.id ?? 'all-time',
    currentSeasonHasResults,
  };
}

async function hydrateLiveFacts(db: any, rows: LiveFactRow[], seasons: any[]): Promise<RatedFact[]> {
  const contestIds = [...new Set(rows.map((row) => row.contest_id))];
  const matchIds = [...new Set(rows.map((row) => row.match_id))];

  const [players, matches] = await Promise.all([
    selectInBatches<any>(db, 'launch_result_contest_players', 'contest_id,player_id,player_name,team_id,team_name,side', 'contest_id', contestIds),
    selectInBatches<any>(db, 'launch_schedule_matches', 'id,season_id,round_id,date,home_team_id,away_team_id', 'id', matchIds),
  ]);

  const roundIds = [...new Set(matches.map((match) => match.round_id).filter(Boolean))] as string[];
  const rounds = roundIds.length
    ? await selectInBatches<any>(db, 'launch_rounds', 'id,number,name,date', 'id', roundIds)
    : [];

  const playersByContest = new Map<string, any[]>();
  for (const player of players) {
    const list = playersByContest.get(player.contest_id) ?? [];
    list.push(player);
    playersByContest.set(player.contest_id, list);
  }
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const seasonById = new Map(seasons.map((season: any) => [season.id, season]));

  return rows.map((row) => {
    const contestPlayers = playersByContest.get(row.contest_id) ?? [];
    const teammate = row.format === 'Doubles'
      ? contestPlayers.find((player) => player.team_id === row.team_id && player.player_id !== row.player_id)
      : null;
    const opponents = contestPlayers.filter((player) => player.team_id !== row.team_id);
    const match = matchById.get(row.match_id);
    const round = match?.round_id ? roundById.get(match.round_id) : null;
    const season = match?.season_id ? seasonById.get(match.season_id) : null;
    const eventLabel = round?.name
      ?? (round?.number ? `Round ${round.number}` : null)
      ?? match?.date
      ?? 'Current season';

    return {
      sourceKey: `live:${row.contest_id}:${row.team_id}`,
      seasonId: match?.season_id ?? season?.id ?? 'current',
      seasonLabel: shortSeason(season?.name ?? match?.season_id ?? 'Current'),
      eventLabel,
      playerId: row.player_id,
      playerName: row.player_name,
      teamName: row.team_name,
      opponentTeamName: opponents[0]?.team_name ?? 'Opponent',
      partnerName: teammate?.player_name ?? null,
      opponentNames: opponents.map((player) => player.player_name),
      side: row.side,
      format: row.format,
      outcome: row.outcome,
      clashIndexBefore: row.clash_index_before,
      opponentEffectiveCi: Number(row.opponent_effective_ci),
      winProbability: Number(row.win_probability),
      performanceVsExpected: Number(row.performance_vs_expected),
      ciDelta: row.ci_delta,
    };
  });
}

function buildCandidates(rows: RatedFact[], scopeId: string): ClashPulseFactCandidate[] {
  const wins = uniqueMatchups(rows.filter((row) => row.outcome === 'W'));
  const candidates: ClashPulseFactCandidate[] = [];

  addTop(candidates, scopeId, 'Upsets',
    wins.filter((row) => row.winProbability < 0.5).sort((a, b) => a.winProbability - b.winProbability),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'CI Gaps',
    wins.filter((row) => ciGap(row) > 0).sort((a, b) => ciGap(b) - ciGap(a)),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'Above Expected',
    [...wins].sort((a, b) => b.performanceVsExpected - a.performanceVsExpected),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'Road',
    wins.filter((row) => row.side === 'Away').sort((a, b) => b.performanceVsExpected - a.performanceVsExpected),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'Home',
    wins.filter((row) => row.side === 'Home').sort((a, b) => b.performanceVsExpected - a.performanceVsExpected),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'Singles',
    wins.filter((row) => row.format === 'Singles').sort((a, b) => b.ciDelta - a.ciDelta || a.winProbability - b.winProbability),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'Doubles',
    wins.filter((row) => row.format === 'Doubles').sort((a, b) => b.ciDelta - a.ciDelta || a.winProbability - b.winProbability),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'CI +/-',
    wins.filter((row) => row.ciDelta > 0).sort((a, b) => b.ciDelta - a.ciDelta),
    CATEGORY_LIMIT);
  addTop(candidates, scopeId, 'Closest',
    [...wins].sort((a, b) => Math.abs(a.winProbability - 0.5) - Math.abs(b.winProbability - 0.5)),
    CATEGORY_LIMIT);

  return candidates;
}

function addTop(
  target: ClashPulseFactCandidate[],
  scopeId: string,
  category: ClashPulseFactCategory,
  rows: RatedFact[],
  limit: number,
) {
  for (const row of rows.slice(0, limit)) {
    target.push(toCandidate(row, category, scopeId));
  }
}

function toCandidate(row: RatedFact, category: ClashPulseFactCategory, scopeId: string): ClashPulseFactCandidate {
  const player = row.format === 'Doubles' && row.partnerName
    ? `${row.playerName} & ${row.partnerName}`
    : row.playerName;
  const opponent = row.opponentNames.length
    ? row.opponentNames.join(' & ')
    : row.opponentTeamName;
  const probability = Math.max(0, Math.min(100, Math.round(row.winProbability * 100)));
  const gap = Math.max(0, Math.round(ciGap(row)));
  const performance = Math.round(row.performanceVsExpected * 100);
  const baseDetail = `${row.seasonLabel} · ${row.eventLabel} · ${row.format} · vs ${opponent} (${row.opponentTeamName})`;

  let headline = `${player} (${row.teamName}) beat ${opponent} (${row.opponentTeamName})`;
  let value = `${probability}% WIN CHANCE`;
  let pulseText = `${headline} with a ${probability}% pre-match win chance.`;

  if (category === 'CI Gaps') {
    headline = `${player} (${row.teamName}) overcame a ${gap}-point CI gap`;
    value = `${gap} CI GAP`;
    pulseText = `${player} (${row.teamName}) overcame a ${gap}-point CI gap against ${opponent} (${row.opponentTeamName}).`;
  } else if (category === 'Above Expected') {
    value = `+${performance} PTS VS EXPECTED`;
    pulseText = `${player} (${row.teamName}) beat ${opponent} (${row.opponentTeamName}) after entering at ${probability}% win probability.`;
  } else if (category === 'Road') {
    headline = `${player} (${row.teamName}) won on the road`;
    pulseText = `${player} (${row.teamName}) won on the road against ${opponent} (${row.opponentTeamName}) with a ${probability}% pre-match chance.`;
  } else if (category === 'Home') {
    headline = `${player} (${row.teamName}) defended home`;
    pulseText = `${player} (${row.teamName}) won at home against ${opponent} (${row.opponentTeamName}).`;
  } else if (category === 'Singles') {
    value = signedCi(row.ciDelta);
    pulseText = `${row.playerName} (${row.teamName}) beat ${opponent} (${row.opponentTeamName}) in singles and moved ${signedCi(row.ciDelta)}.`;
  } else if (category === 'Doubles') {
    value = signedCi(row.ciDelta);
    pulseText = `${player} (${row.teamName}) beat ${opponent} (${row.opponentTeamName}) in doubles.`;
  } else if (category === 'CI +/-') {
    headline = `${player} (${row.teamName}) posted a ${signedCi(row.ciDelta)} result`;
    value = signedCi(row.ciDelta);
    pulseText = `${player} (${row.teamName}) gained ${signedCi(row.ciDelta)} against ${opponent} (${row.opponentTeamName}).`;
  } else if (category === 'Closest') {
    const other = 100 - probability;
    value = `${probability}–${other}`;
    headline = `${player} (${row.teamName}) won a near-even matchup`;
    pulseText = `${player} (${row.teamName}) beat ${opponent} (${row.opponentTeamName}) in a near-even ${probability}–${other} matchup.`;
  }

  return {
    id: `${scopeId}:${category}:${row.sourceKey}`,
    category,
    headline,
    detail: baseDetail,
    value,
    pulseText: pulseText.slice(0, 240),
  };
}

function uniqueMatchups(rows: RatedFact[]): RatedFact[] {
  const seen = new Set<string>();
  const unique: RatedFact[] = [];
  for (const row of rows) {
    if (seen.has(row.sourceKey)) continue;
    seen.add(row.sourceKey);
    unique.push(row);
  }
  return unique;
}

function ciGap(row: RatedFact): number {
  return row.opponentEffectiveCi - row.clashIndexBefore;
}

function signedCi(value: number): string {
  return `${value >= 0 ? '+' : ''}${value} CI`;
}

function shortSeason(value: string): string {
  const match = value.match(/(20\d{2})[-–](20\d{2})/);
  return match ? `${match[1]}–${match[2].slice(-2)}` : value;
}

function seasonSortValue(value: string): number {
  const match = value.match(/20\d{2}/);
  return match ? Number(match[0]) : 0;
}

async function loadPaged<T>(db: any, table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const {data, error} = await db
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function selectInBatches<T>(
  db: any,
  table: string,
  columns: string,
  field: string,
  values: string[],
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < values.length; index += 100) {
    const batch = values.slice(index, index + 100);
    const {data, error} = await db.from(table).select(columns).in(field, batch);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
  }
  return rows;
}
