import type {FinalMatchContest, FinalMatchdaySnapshot} from './FinalMatchdaySnapshot';

export type TeamPoints = {away: number; home: number};

export type FinalScoreBreakdown = {
  playedSingles: TeamPoints;
  singles: TeamPoints;
  doubles: TeamPoints;
  otherAdjustments: TeamPoints;
  unitemized: TeamPoints;
  balanced: boolean;
};

/** Official team score and player results are separate ledgers.
 * Unplayed slots award team points but NEVER create player W/L or CI facts. */
export function buildFinalScoreBreakdown(
  snapshot: Pick<FinalMatchdaySnapshot, 'awayTeam' | 'homeTeam' | 'awayScore' | 'homeScore' | 'contests' | 'adjustments'>,
): FinalScoreBreakdown {
  const playedSingles = contestPoints(snapshot.contests.filter((contest) => contest.format === 'Singles'));
  const doubles = contestPoints(snapshot.contests.filter((contest) => contest.format === 'Doubles'));
  const unplayedSlots: TeamPoints = {away: 0, home: 0};
  const otherAdjustments: TeamPoints = {away: 0, home: 0};

  for (const adjustment of snapshot.adjustments ?? []) {
    const side = adjustment.awardedTeamId === snapshot.awayTeam.id
      ? 'away'
      : adjustment.awardedTeamId === snapshot.homeTeam.id ? 'home' : null;
    if (!side) continue;
    if (adjustment.category === 'UnplayedSlot') unplayedSlots[side] += adjustment.points;
    else otherAdjustments[side] += adjustment.points;
  }

  const singles: TeamPoints = {
    away: playedSingles.away + unplayedSlots.away,
    home: playedSingles.home + unplayedSlots.home,
  };
  const unitemized: TeamPoints = {
    away: snapshot.awayScore - singles.away - doubles.away - otherAdjustments.away,
    home: snapshot.homeScore - singles.home - doubles.home - otherAdjustments.home,
  };

  return {
    playedSingles,
    singles,
    doubles,
    otherAdjustments,
    unitemized,
    balanced: Math.abs(unitemized.away) < 0.001 && Math.abs(unitemized.home) < 0.001,
  };
}

function contestPoints(contests: FinalMatchContest[]): TeamPoints {
  return contests.reduce((total, contest) => {
    // A display-only unplayed slot must not be interpreted as a played win/tie.
    if (contest.unplayed) return total;
    const winPoints = contest.format === 'Singles' ? 1 : 2;
    if (contest.awayOutcome === 'W') total.away += winPoints;
    else if (contest.homeOutcome === 'W') total.home += winPoints;
    else if (contest.awayOutcome === 'T' && contest.homeOutcome === 'T') {
      total.away += winPoints / 2;
      total.home += winPoints / 2;
    }
    return total;
  }, {away: 0, home: 0});
}

/** Fill omitted numbering for an explicitly awarded unplayed singles slot.
 * Never manufactures a contest participant, outcome or CI result. */
export function displaySinglesRows(
  contests: FinalMatchContest[],
  unplayedSlotPoints: number,
): FinalMatchContest[] {
  const played = contests.filter((contest) => contest.format === 'Singles');
  if (!Number.isInteger(unplayedSlotPoints) || unplayedSlotPoints < 1 || played.length === 0) return played;
  const positions = new Set(played.map((contest) => contest.position));
  const finalPosition = Math.max(...played.map((contest) => contest.position));
  const gaps: FinalMatchContest[] = [];
  for (let position = 1; position <= finalPosition; position++) {
    if (!positions.has(position)) {
      gaps.push({
        id: `unplayed-display-${position}`,
        format: 'Singles',
        position,
        awayOutcome: 'T',
        homeOutcome: 'T',
        awayPlayers: [],
        homePlayers: [],
        unplayed: true,
      });
    }
  }
  // Numbering gaps alone do not prove a forfeit. Never invent extra unplayed rows.
  if (gaps.length !== unplayedSlotPoints) return played;
  return [...played, ...gaps].sort((a, b) => a.position - b.position);
}
