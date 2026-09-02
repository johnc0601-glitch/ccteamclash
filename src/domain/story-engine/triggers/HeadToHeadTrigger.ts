import type {RatedResult} from '../RatedResult';
import type {StoryCandidateDraft} from '../StoryCandidate';

type Meeting = {
  pairIds: [string, string];
  sides: [RatedResult, RatedResult];
  playedAt: string;
};

function canonicalPair(playerAId: string, playerBId: string): [string, string] {
  return playerAId < playerBId ? [playerAId, playerBId] : [playerBId, playerAId];
}

function meetingFromContest(rows: RatedResult[]): Meeting | null {
  if (rows.length !== 2 || rows.some((row) => row.format !== 'Singles' || row.subjectPlayerIds.length !== 1)) return null;
  const playerA = rows[0].subjectPlayerIds[0];
  const playerB = rows[1].subjectPlayerIds[0];
  if (!playerA || !playerB || playerA === playerB) return null;
  const pairIds = canonicalPair(playerA, playerB);
  const sides = [...rows].sort((a, b) =>
    a.subjectPlayerIds[0] === pairIds[0] ? -1 : b.subjectPlayerIds[0] === pairIds[0] ? 1 : a.id.localeCompare(b.id),
  ) as [RatedResult, RatedResult];
  return {pairIds, sides, playedAt: rows[0].playedAt};
}

function winnerId(meeting: Meeting): string | null {
  const winner = meeting.sides.find((side) => side.outcome === 'W');
  return winner?.subjectPlayerIds[0] ?? null;
}

function record(meetings: Meeting[]): {aWins: number; bWins: number; ties: number} {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const meeting of meetings) {
    const winner = winnerId(meeting);
    if (winner === meeting.pairIds[0]) aWins += 1;
    else if (winner === meeting.pairIds[1]) bWins += 1;
    else ties += 1;
  }
  return {aWins, bWins, ties};
}

function storyKind(value: {aWins: number; bWins: number; ties: number}): 'SERIES_TIED' | 'TWO_ZERO' | 'UNSETTLED' {
  if (value.aWins === 1 && value.bWins === 1) return 'SERIES_TIED';
  if (value.aWins === 2 || value.bWins === 2) return 'TWO_ZERO';
  return 'UNSETTLED';
}

function magnitude(kind: ReturnType<typeof storyKind>): number {
  if (kind === 'SERIES_TIED') return 65;
  if (kind === 'TWO_ZERO') return 58;
  return 48;
}

/**
 * V1 head-to-head trigger. Team Clash history is still young: the first two
 * archived seasons contain rematches but no three-meeting singles rivalries.
 * Therefore the first rematch is the meaningful threshold today. Once a pair
 * has a third meeting this detector intentionally stops emitting; deeper series
 * logic can evolve without rewriting the historical contract.
 */
export function detectHeadToHead(results: RatedResult[]): StoryCandidateDraft[] {
  const byContest = new Map<string, RatedResult[]>();
  for (const result of results) {
    if (result.format !== 'Singles') continue;
    const rows = byContest.get(result.contestId) ?? [];
    rows.push(result);
    byContest.set(result.contestId, rows);
  }

  const byPair = new Map<string, Meeting[]>();
  for (const rows of byContest.values()) {
    const meeting = meetingFromContest(rows);
    if (!meeting) continue;
    const key = meeting.pairIds.join('\u0000');
    const meetings = byPair.get(key) ?? [];
    meetings.push(meeting);
    byPair.set(key, meetings);
  }
  for (const meetings of byPair.values()) {
    meetings.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.sides[0].id.localeCompare(b.sides[0].id));
  }

  const repeatPairs = [...byPair.values()].filter((meetings) => meetings.length >= 2).length;
  const rarity = byPair.size <= 1
    ? 100
    : Math.max(0, Math.min(100, 100 - ((Math.max(1, repeatPairs) - 1) / byPair.size) * 100));

  const candidates: StoryCandidateDraft[] = [];
  for (const meetings of byPair.values()) {
    // Emit exactly when the first rematch enters the available history.
    if (meetings.length !== 2) continue;
    const [first, latest] = meetings;
    const series = record(meetings);
    const kind = storyKind(series);
    const latestById = new Map(latest.sides.map((side) => [side.subjectPlayerIds[0], side]));
    const firstWinner = winnerId(first);
    const latestWinner = winnerId(latest);
    const playerA = latestById.get(latest.pairIds[0]);
    const playerB = latestById.get(latest.pairIds[1]);
    if (!playerA || !playerB) continue;

    candidates.push({
      id: `head-to-head:first-rematch:${latest.pairIds.join(':')}:${latest.sides[0].contestId}`,
      triggerType: 'HEAD_TO_HEAD',
      seasonId: latest.sides[0].seasonId,
      eventId: latest.sides[0].eventId,
      matchId: latest.sides[0].matchId,
      playerIds: [...latest.pairIds],
      teamIds: [...new Set(latest.sides.map((side) => side.teamId))],
      headlineFacts: {
        resultId: latest.sides[0].id,
        storyKind: kind,
        playerA: playerA.subjectNames[0] ?? latest.pairIds[0],
        playerB: playerB.subjectNames[0] ?? latest.pairIds[1],
        playerAWins: series.aWins,
        playerBWins: series.bWins,
        ties: series.ties,
        meetings: 2,
        latestWinnerId: latestWinner,
      },
      contextFacts: {
        firstMeetingAt: first.playedAt,
        firstMeetingEvent: first.sides[0].eventLabel ?? null,
        firstMeetingSeason: first.sides[0].seasonName ?? first.sides[0].seasonId,
        firstWinnerId: firstWinner,
        rematchAt: latest.playedAt,
        repeatPairsInHistory: repeatPairs,
        uniqueSinglesPairingsInHistory: byPair.size,
      },
      scores: {
        magnitude: magnitude(kind),
        rarity,
        historicalSignificance: 60,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) =>
    Number(b.scores.magnitude) - Number(a.scores.magnitude)
    || a.id.localeCompare(b.id),
  );
}
