import type {RatedResult} from '../RatedResult';
import type {StoryCandidateDraft} from '../StoryCandidate';

type TeamMeeting = {
  pairIds: [string, string];
  pairNames: [string, string];
  matchId: string;
  seasonId: string;
  eventId: string;
  eventLabel: string | null;
  playedAt: string;
  scores: [number, number];
  winnerTeamId: string | null;
};

function canonicalPair(teamAId: string, teamBId: string): [string, string] {
  return teamAId < teamBId ? [teamAId, teamBId] : [teamBId, teamAId];
}

function meetingFromMatch(rows: RatedResult[]): TeamMeeting | null {
  if (rows.length === 0 || rows.some((row) => row.matchAggregateReliable === false)) return null;

  const teamIds = [...new Set(rows.map((row) => row.teamId))];
  if (teamIds.length !== 2) return null;
  const [teamAId, teamBId] = canonicalPair(teamIds[0], teamIds[1]);

  if (rows.some((row) => row.opponentTeamId !== (row.teamId === teamAId ? teamBId : teamAId))) return null;

  const byContest = new Map<string, RatedResult[]>();
  for (const row of rows) {
    const contestRows = byContest.get(row.contestId) ?? [];
    contestRows.push(row);
    byContest.set(row.contestId, contestRows);
  }
  if ([...byContest.values()].some((contestRows) =>
    contestRows.length !== 2
    || new Set(contestRows.map((row) => row.teamId)).size !== 2,
  )) return null;

  const representative = rows[0];
  if (rows.some((row) =>
    row.seasonId !== representative.seasonId
    || row.eventId !== representative.eventId
    || row.playedAt !== representative.playedAt,
  )) return null;

  const scoreA = rows.filter((row) => row.teamId === teamAId).reduce((sum, row) => sum + row.actualPoints, 0);
  const scoreB = rows.filter((row) => row.teamId === teamBId).reduce((sum, row) => sum + row.actualPoints, 0);
  const nameA = rows.find((row) => row.teamId === teamAId)?.teamName ?? teamAId;
  const nameB = rows.find((row) => row.teamId === teamBId)?.teamName ?? teamBId;

  return {
    pairIds: [teamAId, teamBId],
    pairNames: [nameA, nameB],
    matchId: representative.matchId,
    seasonId: representative.seasonId,
    eventId: representative.eventId,
    eventLabel: representative.eventLabel ?? null,
    playedAt: representative.playedAt,
    scores: [scoreA, scoreB],
    winnerTeamId: scoreA === scoreB ? null : scoreA > scoreB ? teamAId : teamBId,
  };
}

function seriesRecord(meetings: TeamMeeting[]): {aWins: number; bWins: number; ties: number} {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const meeting of meetings) {
    if (meeting.winnerTeamId === meeting.pairIds[0]) aWins += 1;
    else if (meeting.winnerTeamId === meeting.pairIds[1]) bWins += 1;
    else ties += 1;
  }
  return {aWins, bWins, ties};
}

function storyKind(record: {aWins: number; bWins: number; ties: number}): 'SERIES_TIED' | 'UNBEATEN' | 'SERIES_LEAD' {
  if (record.aWins === record.bWins) return 'SERIES_TIED';
  if (record.aWins === 0 || record.bWins === 0) return 'UNBEATEN';
  return 'SERIES_LEAD';
}

function magnitude(kind: ReturnType<typeof storyKind>, meetings: number): number {
  const historyBonus = Math.min(18, Math.max(0, meetings - 2) * 9);
  if (kind === 'UNBEATEN') return Math.min(100, 68 + historyBonus);
  if (kind === 'SERIES_TIED') return Math.min(100, 64 + historyBonus);
  return Math.min(100, 58 + historyBonus);
}

/**
 * Builds a team-vs-team series story from complete team-match aggregates only.
 * Any match with quarantined contest data is excluded rather than reconstructing
 * a partial score. The detector emits the current state once a pair has met at
 * least twice; round backtests naturally surface each new rematch as it occurs.
 */
export function detectTeamSeries(results: RatedResult[]): StoryCandidateDraft[] {
  const byMatch = new Map<string, RatedResult[]>();
  for (const result of results) {
    const key = `${result.seasonId}\u0000${result.matchId}`;
    const rows = byMatch.get(key) ?? [];
    rows.push(result);
    byMatch.set(key, rows);
  }

  const byPair = new Map<string, TeamMeeting[]>();
  for (const rows of byMatch.values()) {
    const meeting = meetingFromMatch(rows);
    if (!meeting) continue;
    const key = meeting.pairIds.join('\u0000');
    const meetings = byPair.get(key) ?? [];
    meetings.push(meeting);
    byPair.set(key, meetings);
  }
  for (const meetings of byPair.values()) {
    meetings.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.matchId.localeCompare(b.matchId));
  }

  const repeatSeries = [...byPair.values()].filter((meetings) => meetings.length >= 2);
  const candidates: StoryCandidateDraft[] = [];
  for (const meetings of repeatSeries) {
    const latest = meetings.at(-1)!;
    const record = seriesRecord(meetings);
    const kind = storyKind(record);
    const rank = 1 + repeatSeries.filter((other) => other.length > meetings.length).length;
    const rarity = repeatSeries.length <= 1
      ? 100
      : Math.max(55, 100 - ((rank - 1) / (repeatSeries.length - 1)) * 45);
    const leaderTeamId = record.aWins === record.bWins
      ? null
      : record.aWins > record.bWins ? latest.pairIds[0] : latest.pairIds[1];

    candidates.push({
      id: `team-series:${latest.pairIds.join(':')}:${latest.matchId}`,
      triggerType: 'TEAM_SERIES',
      seasonId: latest.seasonId,
      eventId: latest.eventId,
      matchId: latest.matchId,
      playerIds: [],
      teamIds: [...latest.pairIds],
      headlineFacts: {
        storyKind: kind,
        teamA: latest.pairNames[0],
        teamB: latest.pairNames[1],
        teamAWins: record.aWins,
        teamBWins: record.bWins,
        ties: record.ties,
        meetings: meetings.length,
        leaderTeamId,
        latestWinnerTeamId: latest.winnerTeamId,
        latestTeamAScore: Math.round(latest.scores[0] * 10) / 10,
        latestTeamBScore: Math.round(latest.scores[1] * 10) / 10,
      },
      contextFacts: {
        firstMeetingAt: meetings[0].playedAt,
        firstMeetingEvent: meetings[0].eventLabel,
        latestMeetingAt: latest.playedAt,
        latestMeetingEvent: latest.eventLabel,
        repeatedTeamSeriesInHistory: repeatSeries.length,
        meetingCountRank: rank,
      },
      scores: {
        magnitude: magnitude(kind, meetings.length),
        rarity,
        historicalSignificance: Math.min(95, 55 + Math.max(0, meetings.length - 2) * 15),
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) =>
    Number(b.headlineFacts.meetings) - Number(a.headlineFacts.meetings)
    || Number(b.scores.magnitude) - Number(a.scores.magnitude)
    || a.id.localeCompare(b.id),
  );
}
