import 'server-only';

import {createClient} from '@/lib/supabase/server';
import {regularSeasonChanceOfVictoryFromExpectedPoints} from '@/services/teamStrength/TeamStrength';
import type {
  ClashPulseFactCandidate,
  ClashPulseFactData,
  ClashPulseFactScope,
  ClashPulseStoryType,
} from '@/components/commissioner/clashPulseFacts';

type RatedMemberFact = {
  contestId: string;
  teamId: string;
  seasonId: string;
  seasonLabel: string;
  eventLabel: string;
  playerId: string;
  playerName: string;
  teamName: string;
  opponentTeamName: string;
  opponentNames: string[];
  side: 'Home' | 'Away';
  format: 'Singles' | 'Doubles' | 'Team';
  outcome: 'W' | 'L' | 'T';
  clashIndexBefore: number;
  opponentEffectiveCi: number;
  winProbability: number;
  expectedPoints: number;
  actualPoints: number;
  performanceVsExpected: number;
  ciDelta: number;
};

type RatedStory = {
  key: string;
  seasonId: string;
  seasonLabel: string;
  eventLabel: string;
  subjectIds: string[];
  subjectNames: string[];
  teamId: string;
  teamName: string;
  opponentNames: string[];
  opponentTeamName: string;
  side: 'Home' | 'Away';
  format: 'Singles' | 'Doubles' | 'Team';
  winProbability: number;
  performanceVsExpected: number;
  ciDeltas: number[];
  clashIndexBefore: number;
  opponentEffectiveCi: number;
  teamScore?: number;
  opponentScore?: number;
};

type HistoricalFactRow = {
  contest_id: string;
  season_id: string;
  player_id: string;
  team_id: string;
  player_name: string;
  team_name: string;
  opponent_team_name: string;
  side: 'Home' | 'Away';
  format: 'Singles' | 'Doubles';
  outcome: 'W' | 'L' | 'T';
  clash_index_before: number;
  opponent_effective_ci: number | string;
  win_probability: number | string;
  expected_points: number | string;
  actual_points: number | string;
  performance_vs_expected: number | string;
  ci_delta: number;
  matchup_deduplication_key: string;
};

type HistoricalMatchupRow = {
  deduplication_key: string;
  season_id: string;
  season_name: string;
  historical_team_match_id: number | null;
  event_label: string;
  player_id: string;
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
  expected_points: number | string;
  actual_points: number | string;
  performance_vs_expected: number | string;
  ci_delta: number;
};

type HistoricalTeamMatchRow = {
  id: number;
  season_name: string;
  event_label: string;
  away_team_name: string;
  home_team_name: string;
  away_score: number | string | null;
  home_score: number | string | null;
  ci_venue: string | null;
};

const PAGE_SIZE = 1000;
const FILTER_LIMIT = 18;
const TOP_FACT_LIMIT = 12;

export async function getClashPulseFactData(): Promise<ClashPulseFactData> {
  const supabase = await createClient();
  const db = supabase as any;

  const [historicalRows, matchupRows, historicalTeamMatches, liveRows, seasonRows] = await Promise.all([
    loadPaged<HistoricalFactRow>(
      db,
      'historical_clash_contest_rating_facts',
      'contest_id,season_id,player_id,team_id,player_name,team_name,opponent_team_name,side,format,outcome,clash_index_before,opponent_effective_ci,win_probability,expected_points,actual_points,performance_vs_expected,ci_delta,matchup_deduplication_key',
    ),
    loadPaged<HistoricalMatchupRow>(
      db,
      'historical_player_matchups',
      'deduplication_key,season_id,season_name,historical_team_match_id,event_label,player_id,opponent_one_player_name,opponent_two_player_name',
    ),
    loadPaged<HistoricalTeamMatchRow>(
      db,
      'historical_team_matches',
      'id,season_name,event_label,away_team_name,home_team_name,away_score,home_score,ci_venue',
    ),
    loadPaged<LiveFactRow>(
      db,
      'clash_contest_rating_facts',
      'contest_id,match_id,player_id,team_id,player_name,team_name,side,format,outcome,clash_index_before,opponent_effective_ci,win_probability,expected_points,actual_points,performance_vs_expected,ci_delta',
    ),
    db.from('launch_seasons').select('id,name,year,active,archived').order('year', {ascending: false}),
  ]);

  const matchupByKey = new Map(
    matchupRows.map((row) => [`${row.deduplication_key}:${row.player_id}`, row]),
  );

  const historicalMembers: RatedMemberFact[] = historicalRows.map((row) => {
    const matchup = matchupByKey.get(`${row.matchup_deduplication_key}:${row.player_id}`);
    return {
      contestId: row.contest_id,
      teamId: row.team_id,
      seasonId: row.season_id,
      seasonLabel: shortSeason(matchup?.season_name ?? row.season_id),
      eventLabel: matchup?.event_label ?? 'Historical match',
      playerId: row.player_id,
      playerName: row.player_name,
      teamName: row.team_name,
      opponentTeamName: row.opponent_team_name,
      opponentNames: [matchup?.opponent_one_player_name, matchup?.opponent_two_player_name].filter(Boolean) as string[],
      side: row.side,
      format: row.format,
      outcome: row.outcome,
      clashIndexBefore: row.clash_index_before,
      opponentEffectiveCi: Number(row.opponent_effective_ci),
      winProbability: Number(row.win_probability),
      expectedPoints: Number(row.expected_points),
      actualPoints: Number(row.actual_points),
      performanceVsExpected: Number(row.performance_vs_expected),
      ciDelta: row.ci_delta,
    };
  });

  const liveMembers = liveRows.length
    ? await hydrateLiveMembers(db, liveRows, seasonRows.data ?? [])
    : [];

  const historicalTeamStories = buildHistoricalTeamUpsetStories(
    historicalRows,
    matchupRows,
    historicalTeamMatches,
  );
  const liveTeamStories = liveRows.length
    ? await buildLiveTeamUpsetStories(db, liveRows, seasonRows.data ?? [])
    : [];
  const allStories = [
    ...groupWinningStories([...historicalMembers, ...liveMembers]),
    ...historicalTeamStories,
    ...liveTeamStories,
  ];
  const activeSeason = (seasonRows.data ?? []).find((season: any) => season.active && !season.archived);
  const seasonIds = [...new Set(allStories.map((story) => story.seasonId))];

  const scopes: ClashPulseFactScope[] = seasonIds
    .sort((a, b) => seasonSortValue(b) - seasonSortValue(a))
    .map((seasonId) => buildScope(
      seasonId,
      allStories.filter((story) => story.seasonId === seasonId),
      seasonId === activeSeason?.id ? 'Current season published results' : 'Verified league history',
    ))
    .filter((scope) => scope.candidates.length > 0);

  if (allStories.length) {
    scopes.push(buildScope(
      'all-time',
      allStories,
      'Best verified stories across recorded Team Clash history',
      'All-Time',
    ));
  }

  const currentSeasonHasResults = Boolean(
    activeSeason?.id && allStories.some((story) => story.seasonId === activeSeason.id),
  );
  const latestHistorical = scopes.find((scope) => scope.id !== 'all-time' && scope.id !== activeSeason?.id);

  return {
    scopes,
    defaultScopeId: currentSeasonHasResults
      ? activeSeason.id
      : latestHistorical?.id ?? scopes[0]?.id ?? 'all-time',
    currentSeasonHasResults,
  };
}

async function hydrateLiveMembers(db: any, rows: LiveFactRow[], seasons: any[]): Promise<RatedMemberFact[]> {
  const contestIds = [...new Set(rows.map((row) => row.contest_id))];
  const matchIds = [...new Set(rows.map((row) => row.match_id))];

  const [players, matches] = await Promise.all([
    selectInBatches<any>(
      db,
      'launch_result_contest_players',
      'contest_id,player_id,player_name,team_id,team_name,side',
      'contest_id',
      contestIds,
    ),
    selectInBatches<any>(
      db,
      'launch_schedule_matches',
      'id,season_id,round_id,date',
      'id',
      matchIds,
    ),
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
    const opponents = contestPlayers.filter((player) => player.team_id !== row.team_id);
    const match = matchById.get(row.match_id);
    const round = match?.round_id ? roundById.get(match.round_id) : null;
    const season = match?.season_id ? seasonById.get(match.season_id) : null;

    return {
      contestId: row.contest_id,
      teamId: row.team_id,
      seasonId: match?.season_id ?? season?.id ?? 'current',
      seasonLabel: shortSeason(season?.name ?? match?.season_id ?? 'Current'),
      eventLabel: round?.name
        ?? (round?.number ? `Round ${round.number}` : null)
        ?? match?.date
        ?? 'Current season',
      playerId: row.player_id,
      playerName: row.player_name,
      teamName: row.team_name,
      opponentTeamName: opponents[0]?.team_name ?? 'Opponent',
      opponentNames: opponents.map((player) => player.player_name),
      side: row.side,
      format: row.format,
      outcome: row.outcome,
      clashIndexBefore: row.clash_index_before,
      opponentEffectiveCi: Number(row.opponent_effective_ci),
      winProbability: Number(row.win_probability),
      expectedPoints: Number(row.expected_points),
      actualPoints: Number(row.actual_points),
      performanceVsExpected: Number(row.performance_vs_expected),
      ciDelta: row.ci_delta,
    };
  });
}

function groupWinningStories(rows: RatedMemberFact[]): RatedStory[] {
  const groups = new Map<string, RatedMemberFact[]>();

  for (const row of rows) {
    if (row.outcome !== 'W') continue;
    const key = `${row.seasonId}:${row.contestId}:${row.teamId}`;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  return [...groups.entries()].map(([key, members]) => {
    const first = members[0];
    const uniqueMembers = [...new Map(
      members.map((member) => [member.playerId, member]),
    ).values()].sort((a, b) => a.playerName.localeCompare(b.playerName));

    return {
      key,
      seasonId: first.seasonId,
      seasonLabel: first.seasonLabel,
      eventLabel: first.eventLabel,
      subjectIds: uniqueMembers.map((member) => member.playerId),
      subjectNames: uniqueMembers.map((member) => member.playerName),
      teamId: first.teamId,
      teamName: first.teamName,
      opponentNames: [...new Set(first.opponentNames)],
      opponentTeamName: first.opponentTeamName,
      side: first.side,
      format: first.format,
      winProbability: first.winProbability,
      performanceVsExpected: first.performanceVsExpected,
      ciDeltas: uniqueMembers.map((member) => member.ciDelta),
      clashIndexBefore: first.clashIndexBefore,
      opponentEffectiveCi: first.opponentEffectiveCi,
    };
  });
}

function buildScope(
  id: string,
  stories: RatedStory[],
  description: string,
  labelOverride?: string,
): ClashPulseFactScope {
  const sorted = [...stories].sort((a, b) => storyScore(b) - storyScore(a));
  const topStories = diversify(sorted, TOP_FACT_LIMIT, 1, 2);

  const topicStories = new Map<ClashPulseStoryType, RatedStory[]>([
    ['Upset', diversify(
      sorted.filter((story) => topicsFor(story).includes('Upset'))
        .sort((a, b) => a.winProbability - b.winProbability),
      FILTER_LIMIT,
      2,
      4,
    )],
    ['Match Upset', diversify(
      sorted.filter((story) => topicsFor(story).includes('Match Upset'))
        .sort((a, b) => a.winProbability - b.winProbability),
      FILTER_LIMIT,
      2,
      4,
    )],
    ['CI Mover', diversify(
      sorted.filter((story) => topicsFor(story).includes('CI Mover'))
        .sort((a, b) => maxCiDelta(b) - maxCiDelta(a)),
      FILTER_LIMIT,
      2,
      4,
    )],
    ['Close Match', diversify(
      sorted.filter((story) => topicsFor(story).includes('Close Match'))
        .sort((a, b) => Math.abs(a.winProbability - 0.5) - Math.abs(b.winProbability - 0.5)),
      FILTER_LIMIT,
      2,
      4,
    )],
    ['Standout', diversify(
      sorted.filter((story) => primaryStoryType(story) === 'Standout'),
      FILTER_LIMIT,
      2,
      4,
    )],
  ]);

  const selected = new Map<string, RatedStory>();
  for (const story of topStories) selected.set(story.key, story);
  for (const list of topicStories.values()) {
    for (const story of list) selected.set(story.key, story);
  }

  const candidates = [...selected.values()].map((story) => toCandidate(story));

  return {
    id,
    label: labelOverride ?? stories[0]?.seasonLabel ?? shortSeason(id),
    description,
    candidates,
    topFactIds: topStories.map((story) => story.key),
  };
}

function toCandidate(story: RatedStory): ClashPulseFactCandidate {
  if (story.format === 'Team') {
    const probability = Math.max(0, Math.min(100, Math.round(story.winProbability * 100)));
    const venue = story.side === 'Home' ? 'Home' : 'Road';
    const score = story.teamScore != null && story.opponentScore != null
      ? `${formatScore(story.teamScore)}–${formatScore(story.opponentScore)} FINAL`
      : 'TEAM WIN';
    const isEstimatedHistoricalProbability = story.seasonLabel === '2024–25';
    const probabilityValue = isEstimatedHistoricalProbability
      ? `MODEL EST. ${probability}% WIN CHANCE`
      : `${probability}% TEAM WIN CHANCE`;
    const probabilityText = isEstimatedHistoricalProbability
      ? `the rated-matchup model estimated a ${probability}% pre-match team win chance`
      : `a ${probability}% pre-match team win chance`;

    return {
      id: story.key,
      primaryStoryType: 'Match Upset',
      topics: ['Match Upset'],
      detail: `${story.seasonLabel} · ${story.eventLabel} · Team match · vs ${story.opponentTeamName}`,
      format: 'Team',
      venue,
      angles: {
        'Match Upset': {
          storyType: 'Match Upset',
          headline: `${story.teamName} upset ${story.opponentTeamName}`,
          value: probabilityValue,
          badges: [
            'TEAM MATCH',
            venue,
            score,
            ...(isEstimatedHistoricalProbability ? ['RATED-MATCHUP MODEL'] : []),
          ],
          pulseText: `${story.teamName} upset ${story.opponentTeamName}${story.teamScore != null && story.opponentScore != null ? ` ${formatScore(story.teamScore)}–${formatScore(story.opponentScore)}` : ''} after entering with ${probabilityText}.`.slice(0, 240),
        },
      },
    };
  }

  const subject = story.subjectNames.join(' & ');
  const opponent = story.opponentNames.length
    ? story.opponentNames.join(' & ')
    : story.opponentTeamName;
  const probability = Math.max(0, Math.min(100, Math.round(story.winProbability * 100)));
  const gap = Math.max(0, Math.round(story.opponentEffectiveCi - story.clashIndexBefore));
  const venue = story.side === 'Home' ? 'Home' : 'Road';
  const delta = commonCiDelta(story);
  const primaryType = primaryStoryType(story);
  const topics = topicsFor(story);

  const sharedBadges = [
    story.format,
    venue,
    ...(story.format === 'Singles' && gap > 0 ? [`${gap} CI gap`] : []),
  ];

  const angles: ClashPulseFactCandidate['angles'] = {};

  if (topics.includes('Upset')) {
    angles.Upset = {
      storyType: 'Upset',
      headline: `${subject} (${story.teamName}) upset ${opponent} (${story.opponentTeamName})`,
      value: `${probability}% WIN CHANCE`,
      badges: [
        ...sharedBadges,
        ...(delta !== null && delta > 0
          ? [story.format === 'Doubles' ? `+${delta} CI each` : `+${delta} CI`]
          : []),
      ].slice(0, 5),
      pulseText: `${subject} (${story.teamName}) upset ${opponent} (${story.opponentTeamName}) after entering with a ${probability}% pre-match win chance.`.slice(0, 240),
    };
  }

  if (topics.includes('CI Mover')) {
    const movement = ciMovement(story);
    angles['CI Mover'] = {
      storyType: 'CI Mover',
      headline: `${subject} (${story.teamName}) posted a major CI gain`,
      value: movement.value,
      badges: [
        story.format,
        venue,
        ...(story.winProbability < 0.5 ? [`${probability}% chance`] : []),
        ...(story.format === 'Singles' && gap > 0 ? [`${gap} CI gap`] : []),
      ].slice(0, 5),
      pulseText: `${subject} (${story.teamName}) beat ${opponent} (${story.opponentTeamName}) and ${movement.pulsePhrase}.`.slice(0, 240),
    };
  }

  if (topics.includes('Close Match')) {
    const other = 100 - probability;
    angles['Close Match'] = {
      storyType: 'Close Match',
      headline: `${subject} (${story.teamName}) won a near-even matchup`,
      value: `${probability}–${other}`,
      badges: [
        story.format,
        venue,
        ...(delta !== null && delta > 0
          ? [story.format === 'Doubles' ? `+${delta} CI each` : `+${delta} CI`]
          : []),
      ].slice(0, 5),
      pulseText: `${subject} (${story.teamName}) beat ${opponent} (${story.opponentTeamName}) in a near-even ${probability}–${other} matchup.`.slice(0, 240),
    };
  }

  if (topics.includes('Standout')) {
    angles.Standout = {
      storyType: 'Standout',
      headline: `${subject} (${story.teamName}) beat ${opponent} (${story.opponentTeamName})`,
      value: standoutValue(story, probability),
      badges: [
        story.format,
        venue,
        ...(story.winProbability < 0.5 ? [`${probability}% chance`] : []),
        ...(delta !== null && delta > 0
          ? [story.format === 'Doubles' ? `+${delta} CI each` : `+${delta} CI`]
          : []),
      ].slice(0, 5),
      pulseText: (story.format === 'Doubles' ? `${subject} (${story.teamName}) beat ${opponent} (${story.opponentTeamName}) — ${probability}% pre-match win chance.` : `${subject} (${story.teamName}) beat ${opponent} (${story.opponentTeamName}) in ${story.eventLabel}.`).slice(0, 240),
    };
  }

  if (!angles[primaryType]) {
    angles[primaryType] = {
      storyType: primaryType,
      headline: `${subject} (${story.teamName}) beat ${opponent} (${story.opponentTeamName})`,
      value: standoutValue(story, probability),
      badges: sharedBadges.slice(0, 5),
      pulseText: `${subject} (${story.teamName}) beat ${opponent} (${story.opponentTeamName}).`.slice(0, 240),
    };
  }

  return {
    id: story.key,
    primaryStoryType: primaryType,
    topics,
    detail: `${story.seasonLabel} · ${story.eventLabel} · vs ${opponent} (${story.opponentTeamName})`,
    format: story.format,
    venue,
    angles,
  };
}

function ciMovement(story: RatedStory): {value: string; pulsePhrase: string} {
  const common = commonCiDelta(story);
  if (common !== null) {
    if (story.format === 'Doubles') {
      return {
        value: `+${common} CI EACH`,
        pulsePhrase: `each gained +${common} CI`,
      };
    }
    return {
      value: `+${common} CI`,
      pulsePhrase: `gained +${common} CI`,
    };
  }

  const pieces = story.subjectNames.map((name, index) => `${name} +${story.ciDeltas[index] ?? 0}`);
  return {
    value: pieces.join(' · '),
    pulsePhrase: `posted CI gains of ${pieces.join(' and ')}`,
  };
}

function standoutValue(story: RatedStory, probability: number): string {
  const delta = commonCiDelta(story);
  if (delta !== null && delta > 0) {
    return story.format === 'Doubles' ? `+${delta} CI EACH` : `+${delta} CI`;
  }
  return `${probability}% WIN CHANCE`;
}

function primaryStoryType(story: RatedStory): ClashPulseStoryType {
  if (story.format === 'Team') return 'Match Upset';
  if (story.winProbability <= 0.35) return 'Upset';
  if (maxCiDelta(story) >= 10) return 'CI Mover';
  if (Math.abs(story.winProbability - 0.5) <= 0.08) return 'Close Match';
  return 'Standout';
}

function topicsFor(story: RatedStory): ClashPulseStoryType[] {
  if (story.format === 'Team') return ['Match Upset'];
  const topics: ClashPulseStoryType[] = [];
  if (story.winProbability < 0.5) topics.push('Upset');
  if (maxCiDelta(story) >= 8) topics.push('CI Mover');
  if (Math.abs(story.winProbability - 0.5) <= 0.08) topics.push('Close Match');
  if (!topics.length || primaryStoryType(story) === 'Standout') topics.push('Standout');
  return topics;
}

function storyScore(story: RatedStory): number {
  const upset = story.winProbability < 0.5 ? (0.5 - story.winProbability) * 160 : 0;
  const movement = Math.max(0, maxCiDelta(story)) * 2.2;
  const aboveExpected = Math.max(0, story.performanceVsExpected) * 55;
  const closeBonus = Math.abs(story.winProbability - 0.5) <= 0.05 ? 5 : 0;
  return upset + movement + aboveExpected + closeBonus;
}

function diversify(
  stories: RatedStory[],
  limit: number,
  maxPerSubject: number,
  maxPerTeam: number,
): RatedStory[] {
  const selected: RatedStory[] = [];
  const subjectCounts = new Map<string, number>();
  const teamCounts = new Map<string, number>();

  for (const story of stories) {
    const subjectKey = [...story.subjectIds].sort().join(':');
    if ((subjectCounts.get(subjectKey) ?? 0) >= maxPerSubject) continue;
    if ((teamCounts.get(story.teamId) ?? 0) >= maxPerTeam) continue;

    selected.push(story);
    subjectCounts.set(subjectKey, (subjectCounts.get(subjectKey) ?? 0) + 1);
    teamCounts.set(story.teamId, (teamCounts.get(story.teamId) ?? 0) + 1);
    if (selected.length >= limit) break;
  }

  return selected;
}

function maxCiDelta(story: RatedStory): number {
  return story.ciDeltas.length ? Math.max(...story.ciDeltas) : 0;
}

function commonCiDelta(story: RatedStory): number | null {
  if (!story.ciDeltas.length) return null;
  const unique = [...new Set(story.ciDeltas)];
  return unique.length === 1 ? unique[0] : null;
}

function buildHistoricalTeamUpsetStories(
  facts: HistoricalFactRow[],
  matchups: HistoricalMatchupRow[],
  matches: HistoricalTeamMatchRow[],
): RatedStory[] {
  const matchupByFact = new Map(
    matchups.map((row) => [`${row.deduplication_key}:${row.player_id}`, row]),
  );
  const seasonIdByTeamMatch = new Map<number, string>();
  for (const row of matchups) {
    if (row.historical_team_match_id != null && !seasonIdByTeamMatch.has(row.historical_team_match_id)) {
      seasonIdByTeamMatch.set(row.historical_team_match_id, row.season_id);
    }
  }

  const aggregates = new Map<number, Map<string, Map<string, {format: 'Singles' | 'Doubles'; expected: number; actual: number}>>>();
  for (const fact of facts) {
    const matchup = matchupByFact.get(`${fact.matchup_deduplication_key}:${fact.player_id}`);
    const teamMatchId = matchup?.historical_team_match_id;
    if (teamMatchId == null) continue;

    const byTeam = aggregates.get(teamMatchId) ?? new Map();
    const byContest = byTeam.get(fact.team_name) ?? new Map();
    const current = byContest.get(fact.contest_id);
    const expected = Number(fact.expected_points);
    const actual = Number(fact.actual_points);
    if (!current || expected > current.expected) {
      byContest.set(fact.contest_id, {
        format: fact.format,
        expected,
        actual,
      });
    }
    byTeam.set(fact.team_name, byContest);
    aggregates.set(teamMatchId, byTeam);
  }

  const stories: RatedStory[] = [];
  for (const match of matches) {
    if (match.ci_venue === 'Neutral') continue;
    const byTeam = aggregates.get(match.id);
    if (!byTeam) continue;

    const away = teamAggregate(byTeam.get(match.away_team_name));
    const home = teamAggregate(byTeam.get(match.home_team_name));
    if (!away || !home) continue;

    const sourceAway = numericOrNull(match.away_score);
    const sourceHome = numericOrNull(match.home_score);
    const awayActual = sourceAway ?? away.actualPoints;
    const homeActual = sourceHome ?? home.actualPoints;
    if (awayActual === homeActual) continue;

    const awayWon = awayActual > homeActual;
    const winnerName = awayWon ? match.away_team_name : match.home_team_name;
    const loserName = awayWon ? match.home_team_name : match.away_team_name;
    const winnerExpected = awayWon ? away.expectedPoints : home.expectedPoints;
    const loserExpected = awayWon ? home.expectedPoints : away.expectedPoints;
    const winnerScore = awayWon ? awayActual : homeActual;
    const loserScore = awayWon ? homeActual : awayActual;
    const probability = regularSeasonChanceOfVictoryFromExpectedPoints(winnerExpected, loserExpected);
    if (probability == null || probability >= 0.5) continue;

    const seasonId = seasonIdByTeamMatch.get(match.id) ?? match.season_name;
    stories.push({
      key: `team:${seasonId}:${match.id}`,
      seasonId,
      seasonLabel: shortSeason(match.season_name),
      eventLabel: match.event_label,
      subjectIds: [`team:${winnerName}`],
      subjectNames: [winnerName],
      teamId: winnerName,
      teamName: winnerName,
      opponentNames: [],
      opponentTeamName: loserName,
      side: awayWon ? 'Away' : 'Home',
      format: 'Team',
      winProbability: probability,
      performanceVsExpected: winnerScore - winnerExpected,
      ciDeltas: [],
      clashIndexBefore: 0,
      opponentEffectiveCi: 0,
      teamScore: winnerScore,
      opponentScore: loserScore,
    });
  }
  return stories;
}

async function buildLiveTeamUpsetStories(
  db: any,
  facts: LiveFactRow[],
  seasons: any[],
): Promise<RatedStory[]> {
  const matchIds = [...new Set(facts.map((row) => row.match_id))];
  if (!matchIds.length) return [];

  const [matches, results] = await Promise.all([
    selectInBatches<any>(db, 'launch_schedule_matches', 'id,season_id,round_id,date,home_team_id,away_team_id', 'id', matchIds),
    selectInBatches<any>(db, 'launch_match_results', 'match_id,home_score,away_score,status', 'match_id', matchIds),
  ]);

  const roundIds = [...new Set(matches.map((match) => match.round_id).filter(Boolean))] as string[];
  const rounds = roundIds.length
    ? await selectInBatches<any>(db, 'launch_rounds', 'id,number,name,date', 'id', roundIds)
    : [];
  const roundById = new Map(rounds.map((round) => [round.id, round]));
  const seasonById = new Map(seasons.map((season: any) => [season.id, season]));
  const resultByMatch = new Map(results.filter((row) => row.status === 'Published').map((row) => [row.match_id, row]));

  const aggregates = new Map<string, Map<string, Map<string, {format: 'Singles' | 'Doubles'; expected: number; actual: number; teamName: string}>>>();
  for (const fact of facts) {
    const byTeam = aggregates.get(fact.match_id) ?? new Map();
    const byContest = byTeam.get(fact.team_id) ?? new Map();
    const current = byContest.get(fact.contest_id);
    const expected = Number(fact.expected_points);
    const actual = Number(fact.actual_points);
    if (!current || expected > current.expected) {
      byContest.set(fact.contest_id, {
        format: fact.format,
        expected,
        actual,
        teamName: fact.team_name,
      });
    }
    byTeam.set(fact.team_id, byContest);
    aggregates.set(fact.match_id, byTeam);
  }

  const stories: RatedStory[] = [];
  for (const match of matches) {
    const result = resultByMatch.get(match.id);
    if (!result) continue;
    const round = match.round_id ? roundById.get(match.round_id) : null;
    const eventLabel = round?.name
      ?? (round?.number ? `Round ${round.number}` : null)
      ?? match.date
      ?? 'Current season';
    if (/semi|champ|3rd|playoff/i.test(String(eventLabel))) continue;

    const byTeam = aggregates.get(match.id);
    if (!byTeam) continue;
    const homeContests = byTeam.get(match.home_team_id);
    const awayContests = byTeam.get(match.away_team_id);
    const home = teamAggregate(homeContests);
    const away = teamAggregate(awayContests);
    if (!home || !away) continue;

    const homeName = firstTeamName(homeContests);
    const awayName = firstTeamName(awayContests);
    if (!homeName || !awayName) continue;

    const homeScore = Number(result.home_score);
    const awayScore = Number(result.away_score);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) continue;

    const homeWon = homeScore > awayScore;
    const winnerName = homeWon ? homeName : awayName;
    const loserName = homeWon ? awayName : homeName;
    const winnerExpected = homeWon ? home.expectedPoints : away.expectedPoints;
    const loserExpected = homeWon ? away.expectedPoints : home.expectedPoints;
    const probability = regularSeasonChanceOfVictoryFromExpectedPoints(winnerExpected, loserExpected);
    if (probability == null || probability >= 0.5) continue;

    const season = seasonById.get(match.season_id);
    stories.push({
      key: `team:${match.season_id}:${match.id}`,
      seasonId: match.season_id,
      seasonLabel: shortSeason(season?.name ?? match.season_id),
      eventLabel,
      subjectIds: [`team:${homeWon ? match.home_team_id : match.away_team_id}`],
      subjectNames: [winnerName],
      teamId: homeWon ? match.home_team_id : match.away_team_id,
      teamName: winnerName,
      opponentNames: [],
      opponentTeamName: loserName,
      side: homeWon ? 'Home' : 'Away',
      format: 'Team',
      winProbability: probability,
      performanceVsExpected: (homeWon ? homeScore : awayScore) - winnerExpected,
      ciDeltas: [],
      clashIndexBefore: 0,
      opponentEffectiveCi: 0,
      teamScore: homeWon ? homeScore : awayScore,
      opponentScore: homeWon ? awayScore : homeScore,
    });
  }

  return stories;
}

function teamAggregate(
  contests: Map<string, {format: 'Singles' | 'Doubles'; expected: number; actual: number; teamName?: string}> | undefined,
): {expectedPoints: number; actualPoints: number} | undefined {
  if (!contests?.size) return undefined;
  let expectedPoints = 0;
  let actualPoints = 0;
  for (const row of contests.values()) {
    const weight = row.format === 'Doubles' ? 2 : 1;
    expectedPoints += row.expected * weight;
    actualPoints += row.actual * weight;
  }
  return {expectedPoints, actualPoints};
}

function firstTeamName(
  contests: Map<string, {teamName?: string}> | undefined,
): string | undefined {
  if (!contests) return undefined;
  for (const row of contests.values()) {
    if (row.teamName) return row.teamName;
  }
  return undefined;
}

function numericOrNull(value: number | string | null): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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
    const {data, error} = await db.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
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
