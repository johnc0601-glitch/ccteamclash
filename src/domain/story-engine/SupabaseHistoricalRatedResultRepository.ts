import type {SupabaseClient} from '@supabase/supabase-js';
import {doublesPairCi, type ClashVenue} from './ClashPrediction';
import type {RatedResult} from './RatedResult';
import type {RatedResultRepository} from './RatedResultRepository';

const PAGE_SIZE = 500;

export type StoredHistoricalRatingFact = {
  matchup_deduplication_key: string;
  contest_id: string;
  historical_match_key: string;
  season_id: string;
  player_id: string;
  player_name: string;
  team_id: string;
  team_name: string;
  opponent_team_id: string;
  opponent_team_name: string;
  side: string | null;
  venue: string;
  format: string;
  outcome: string;
  clash_index_before: number;
  opponent_effective_ci: number;
  win_probability: number;
  actual_points: number;
  expected_points: number;
  ci_delta: number;
  algorithm_version: string;
};

export type HistoricalEventMetadataRow = {
  deduplication_key: string;
  season_id: string;
  season_name: string;
  event_label: string;
  event_order: number;
  historical_team_match_id: number | null;
};

export type HistoricalTeamMatchMetadataRow = {
  id: number;
  away_team_name: string;
  home_team_name: string;
  ci_venue: string;
};

export type HistoricalRatedResultDiagnosticReason =
  | 'unexpected-team-count'
  | 'unexpected-player-count'
  | 'inconsistent-contest-facts'
  | 'inconsistent-opponent-team'
  | 'missing-event-metadata'
  | 'inconsistent-event-metadata'
  | 'missing-team-match-metadata'
  | 'inconsistent-team-match-identity'
  | 'invalid-side-or-venue'
  | 'unresolved-chronology';

export type HistoricalRatedResultDiagnostic = {
  contestId: string;
  historicalMatchKey: string | null;
  reason: HistoricalRatedResultDiagnosticReason;
  detail: string;
};

export type HistoricalRatedResultBuildReport = {
  results: RatedResult[];
  diagnostics: HistoricalRatedResultDiagnostic[];
  sourceFactRows: number;
  sourceContests: number;
  emittedContests: number;
  quarantinedContests: number;
};

function validFormat(value: string): value is RatedResult['format'] {
  return value === 'Singles' || value === 'Doubles';
}

function validOutcome(value: string): value is RatedResult['outcome'] {
  return value === 'W' || value === 'L' || value === 'T';
}

function validVenue(value: string): value is ClashVenue {
  return value === 'Home' || value === 'Neutral';
}

function effectiveCi(facts: StoredHistoricalRatingFact[], format: RatedResult['format']): number | null {
  if (format === 'Singles') return facts.length === 1 ? facts[0].clash_index_before : null;
  if (facts.length !== 2) return null;
  return doublesPairCi(facts[0].clash_index_before, facts[1].clash_index_before);
}

function historicalPlayedAt(seasonName: string, seasonId: string, eventOrder: number): string | null {
  const match = `${seasonName} ${seasonId}`.match(/20\d{2}/);
  if (!match || eventOrder < 1) return null;
  const startYear = Number(match[0]);
  if (!Number.isFinite(startYear)) return null;
  return new Date(Date.UTC(startYear, 9, eventOrder)).toISOString();
}

function diagnostic(
  contestId: string,
  contestFacts: StoredHistoricalRatingFact[],
  reason: HistoricalRatedResultDiagnosticReason,
  detail: string,
): HistoricalRatedResultDiagnostic {
  return {
    contestId,
    historicalMatchKey: contestFacts[0]?.historical_match_key ?? null,
    reason,
    detail,
  };
}

function contestEvent(
  contestId: string,
  contestFacts: StoredHistoricalRatingFact[],
  metadata: ReadonlyMap<string, HistoricalEventMetadataRow>,
): {event: HistoricalEventMetadataRow | null; issue: HistoricalRatedResultDiagnostic | null} {
  const eventRows = contestFacts
    .map((fact) => metadata.get(fact.matchup_deduplication_key))
    .filter((row): row is HistoricalEventMetadataRow => Boolean(row));
  if (eventRows.length !== contestFacts.length) {
    return {event: null, issue: diagnostic(contestId, contestFacts, 'missing-event-metadata', `${contestFacts.length - eventRows.length} fact rows lack source event metadata`)};
  }
  const event = eventRows[0];
  const inconsistent = eventRows.some((row) =>
    row.season_id !== event.season_id
    || row.season_name !== event.season_name
    || row.event_order !== event.event_order
    || row.event_label !== event.event_label
    || row.historical_team_match_id !== event.historical_team_match_id,
  );
  return inconsistent
    ? {event: null, issue: diagnostic(contestId, contestFacts, 'inconsistent-event-metadata', 'contest rows resolve to different historical events or team matches')}
    : {event, issue: null};
}

function validateOfficialTeamMatch(
  contestId: string,
  contestFacts: StoredHistoricalRatingFact[],
  event: HistoricalEventMetadataRow,
  teamMatches: ReadonlyMap<number, HistoricalTeamMatchMetadataRow>,
): HistoricalRatedResultDiagnostic | null {
  if (event.historical_team_match_id === null) return null;
  const official = teamMatches.get(event.historical_team_match_id);
  if (!official) {
    return diagnostic(contestId, contestFacts, 'missing-team-match-metadata', `historical team match ${event.historical_team_match_id} is unavailable`);
  }

  const expectedTeams = new Set([official.away_team_name, official.home_team_name]);
  const actualTeams = new Set(contestFacts.map((fact) => fact.team_name));
  if (actualTeams.size !== 2 || [...actualTeams].some((name) => !expectedTeams.has(name))) {
    return diagnostic(
      contestId,
      contestFacts,
      'inconsistent-team-match-identity',
      `contest teams ${[...actualTeams].join(' / ')} do not match official ${official.away_team_name} at ${official.home_team_name}`,
    );
  }

  if (official.ci_venue !== contestFacts[0].venue) {
    return diagnostic(contestId, contestFacts, 'invalid-side-or-venue', `contest venue ${contestFacts[0].venue} does not match official ${official.ci_venue}`);
  }

  for (const fact of contestFacts) {
    const expectedOpponentName = fact.team_name === official.home_team_name
      ? official.away_team_name
      : official.home_team_name;
    if (fact.opponent_team_name !== expectedOpponentName) {
      return diagnostic(contestId, contestFacts, 'inconsistent-team-match-identity', `${fact.player_name} points to opponent ${fact.opponent_team_name}; expected ${expectedOpponentName}`);
    }
    if (official.ci_venue === 'Home') {
      const expectedSide = fact.team_name === official.home_team_name ? 'Home' : 'Away';
      if (fact.side !== expectedSide) {
        return diagnostic(contestId, contestFacts, 'invalid-side-or-venue', `${fact.team_name} is ${fact.side ?? 'unassigned'} but official team match requires ${expectedSide}`);
      }
    }
  }
  return null;
}

export function buildHistoricalRatedResultReport(
  facts: StoredHistoricalRatingFact[],
  metadataRows: HistoricalEventMetadataRow[],
  teamMatchRows: HistoricalTeamMatchMetadataRow[] = [],
): HistoricalRatedResultBuildReport {
  const metadata = new Map(metadataRows.map((row) => [row.deduplication_key, row]));
  const teamMatches = new Map(teamMatchRows.map((row) => [row.id, row]));
  const byContest = new Map<string, StoredHistoricalRatingFact[]>();
  for (const fact of facts) {
    const rows = byContest.get(fact.contest_id) ?? [];
    rows.push(fact);
    byContest.set(fact.contest_id, rows);
  }

  const results: RatedResult[] = [];
  const diagnostics: HistoricalRatedResultDiagnostic[] = [];
  let emittedContests = 0;

  for (const [contestId, contestFacts] of byContest) {
    const representative = contestFacts[0];
    const teams = new Map<string, StoredHistoricalRatingFact[]>();
    for (const fact of contestFacts) {
      const rows = teams.get(fact.team_id) ?? [];
      rows.push(fact);
      teams.set(fact.team_id, rows);
    }

    if (teams.size !== 2) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'unexpected-team-count', `expected 2 teams but found ${teams.size}: ${[...teams.keys()].join(', ')}`));
      continue;
    }
    if (!representative || !validFormat(representative.format) || !validVenue(representative.venue)) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'inconsistent-contest-facts', 'contest has an invalid format or venue'));
      continue;
    }

    const expectedSidePlayers = representative.format === 'Singles' ? 1 : 2;
    const expectedRows = expectedSidePlayers * 2;
    if (contestFacts.length !== expectedRows || [...teams.values()].some((rows) => rows.length !== expectedSidePlayers)) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'unexpected-player-count', `expected ${expectedRows} player facts split ${expectedSidePlayers}/${expectedSidePlayers}`));
      continue;
    }

    if (contestFacts.some((fact) =>
      fact.format !== representative.format
      || fact.venue !== representative.venue
      || fact.historical_match_key !== representative.historical_match_key
      || fact.season_id !== representative.season_id
      || fact.algorithm_version !== representative.algorithm_version
      || !validOutcome(fact.outcome),
    )) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'inconsistent-contest-facts', 'contest rows disagree on format, venue, match, season, model, or outcome validity'));
      continue;
    }

    const teamIds = [...teams.keys()].sort();
    const badOpponent = contestFacts.some((fact) => {
      const expectedOpponent = teamIds.find((teamId) => teamId !== fact.team_id);
      return !expectedOpponent || fact.opponent_team_id !== expectedOpponent;
    });
    if (badOpponent) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'inconsistent-opponent-team', 'one or more player facts point outside the two contest teams'));
      continue;
    }

    if (representative.venue === 'Home') {
      const sideByTeam = new Map<string, string | null>();
      let invalid = false;
      for (const [teamId, teamFacts] of teams) {
        const sides = new Set(teamFacts.map((fact) => fact.side));
        if (sides.size !== 1 || (teamFacts[0].side !== 'Home' && teamFacts[0].side !== 'Away')) invalid = true;
        sideByTeam.set(teamId, teamFacts[0].side);
      }
      if (invalid || new Set(sideByTeam.values()).size !== 2) {
        diagnostics.push(diagnostic(contestId, contestFacts, 'invalid-side-or-venue', 'home-site contest does not resolve to one Home team and one Away team'));
        continue;
      }
    } else if (contestFacts.some((fact) => fact.side !== null)) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'invalid-side-or-venue', 'neutral contest contains a persisted Home/Away side'));
      continue;
    }

    const {event, issue} = contestEvent(contestId, contestFacts, metadata);
    if (issue || !event) {
      diagnostics.push(issue ?? diagnostic(contestId, contestFacts, 'missing-event-metadata', 'event metadata unavailable'));
      continue;
    }

    const officialIssue = validateOfficialTeamMatch(contestId, contestFacts, event, teamMatches);
    if (officialIssue) {
      diagnostics.push(officialIssue);
      continue;
    }

    const playedAt = historicalPlayedAt(event.season_name, event.season_id, event.event_order);
    if (!playedAt) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'unresolved-chronology', 'season/event order could not produce a stable chronology key'));
      continue;
    }

    const contestResults: RatedResult[] = [];
    let invalidSide = false;
    for (const teamId of teamIds) {
      const sideFacts = (teams.get(teamId) ?? []).sort((a, b) => a.player_id.localeCompare(b.player_id));
      const sideRepresentative = sideFacts[0];
      const opponentTeamId = teamIds.find((candidate) => candidate !== teamId)!;
      const opponentFacts = teams.get(opponentTeamId) ?? [];
      const subjectEffectiveCi = effectiveCi(sideFacts, representative.format);
      if (!sideRepresentative || subjectEffectiveCi === null || opponentFacts.length !== expectedSidePlayers) {
        invalidSide = true;
        break;
      }

      const side: RatedResult['side'] = representative.venue === 'Home'
        ? sideRepresentative.side as RatedResult['side']
        : teamId === teamIds[0] ? 'Home' : 'Away';

      contestResults.push({
        id: `historical:${contestId}:${teamId}`,
        contestId,
        matchId: representative.historical_match_key,
        eventId: `historical:${event.season_id}:event-${event.event_order}`,
        seasonId: event.season_id,
        seasonName: event.season_name,
        eventLabel: event.event_label,
        eventOrder: event.event_order,
        format: representative.format,
        side,
        venue: representative.venue,
        subjectPlayerIds: sideFacts.map((fact) => fact.player_id),
        subjectNames: sideFacts.map((fact) => fact.player_name),
        subjectCiBefore: sideFacts.map((fact) => fact.clash_index_before),
        subjectCiAfter: sideFacts.map((fact) => fact.clash_index_before + fact.ci_delta),
        subjectCiDeltas: sideFacts.map((fact) => fact.ci_delta),
        teamId: sideRepresentative.team_id,
        teamName: sideRepresentative.team_name,
        opponentTeamId,
        opponentTeamName: opponentFacts[0].team_name,
        outcome: sideRepresentative.outcome as RatedResult['outcome'],
        won: sideRepresentative.outcome === 'W',
        actualPoints: Number(sideRepresentative.actual_points),
        expectedPoints: Number(sideRepresentative.expected_points),
        winProbability: Number(sideRepresentative.win_probability),
        subjectEffectiveCi,
        opponentEffectiveCi: Number(sideRepresentative.opponent_effective_ci),
        ciDeficit: Number(sideRepresentative.opponent_effective_ci) - subjectEffectiveCi,
        ciDelta: sideFacts.reduce((sum, fact) => sum + Number(fact.ci_delta), 0),
        modelVersion: sideRepresentative.algorithm_version,
        playedAt,
      });
    }

    if (invalidSide || contestResults.length !== 2) {
      diagnostics.push(diagnostic(contestId, contestFacts, 'unexpected-player-count', 'one or both contest sides could not be normalized safely'));
      continue;
    }
    results.push(...contestResults);
    emittedContests += 1;
  }

  const unreliableCiPlayerMatchdays = new Set<string>();
  for (const issue of diagnostics) {
    for (const fact of byContest.get(issue.contestId) ?? []) {
      unreliableCiPlayerMatchdays.add(`${fact.historical_match_key}\u0000${fact.player_id}`);
    }
  }
  const markedResults = results.map((result) => {
    const ciHistoryReliable = !result.subjectPlayerIds.some((playerId) =>
      unreliableCiPlayerMatchdays.has(`${result.matchId}\u0000${playerId}`),
    );
    return ciHistoryReliable ? result : {...result, ciHistoryReliable: false};
  });

  return {
    results: markedResults.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id)),
    diagnostics,
    sourceFactRows: facts.length,
    sourceContests: byContest.size,
    emittedContests,
    quarantinedContests: diagnostics.length,
  };
}

export function buildHistoricalRatedResults(
  facts: StoredHistoricalRatingFact[],
  metadataRows: HistoricalEventMetadataRow[],
  teamMatchRows: HistoricalTeamMatchMetadataRow[] = [],
): RatedResult[] {
  return buildHistoricalRatedResultReport(facts, metadataRows, teamMatchRows).results;
}

export class SupabaseHistoricalRatedResultRepository implements RatedResultRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getBuildReport(): Promise<HistoricalRatedResultBuildReport> {
    const [facts, metadata, teamMatches] = await Promise.all([
      this.loadFacts(),
      this.loadMetadata(),
      this.loadTeamMatches(),
    ]);
    return buildHistoricalRatedResultReport(facts, metadata, teamMatches);
  }

  async getRatedResults(): Promise<RatedResult[]> {
    return (await this.getBuildReport()).results;
  }

  private async loadFacts(): Promise<StoredHistoricalRatingFact[]> {
    const rows: StoredHistoricalRatingFact[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('historical_clash_contest_rating_facts')
        .select('matchup_deduplication_key,contest_id,historical_match_key,season_id,player_id,player_name,team_id,team_name,opponent_team_id,opponent_team_name,side,venue,format,outcome,clash_index_before,opponent_effective_ci,win_probability,actual_points,expected_points,ci_delta,algorithm_version')
        .order('matchup_deduplication_key', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as StoredHistoricalRatingFact[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }

  private async loadMetadata(): Promise<HistoricalEventMetadataRow[]> {
    const rows: HistoricalEventMetadataRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('historical_player_matchups')
        .select('deduplication_key,season_id,season_name,event_label,event_order,historical_team_match_id')
        .order('deduplication_key', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as HistoricalEventMetadataRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }

  private async loadTeamMatches(): Promise<HistoricalTeamMatchMetadataRow[]> {
    const rows: HistoricalTeamMatchMetadataRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const {data, error} = await this.supabase
        .from('historical_team_matches')
        .select('id,away_team_name,home_team_name,ci_venue')
        .order('id', {ascending: true})
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as HistoricalTeamMatchMetadataRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  }
}
