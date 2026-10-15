import {findPublicTeamBranding, type PublicTeamBranding} from './ScoreboardPreviewBranding';
import type {
  FinalMatchContest,
  FinalMatchdaySnapshot,
  FinalScoreAdjustment,
  FinalMatchPlayer,
} from './FinalMatchdaySnapshot';

type ObjectValue = Record<string, unknown>;
type ParsedMatch = {snapshot: FinalMatchdaySnapshot; notes: string[]};
const object = (value: unknown): ObjectValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as ObjectValue : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const name = (value: unknown) => typeof value === 'string' ? value.trim() : '';
function points(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)
    || value < 0 || !Number.isInteger(value * 2)) return null;
  return value;
}
function makePlayers(value: unknown): FinalMatchPlayer[] {
  return list(value).flatMap((entry): FinalMatchPlayer[] => {
    const source = object(entry);
    const playerName = name(source.name);
    const playerId = name(source.id);
    return playerName ? [{id: playerId || playerName, name: playerName}] : [];
  });
}

/**
 * These confirmed corrections are external to TCWhiteboard. Its v1 export
 * contains a 10&8 winner for the absent player rather than an unplayed flag.
 * The correction is match-specific, verified by the commissioner, and does NOT
 * change the supplied source file or its official team totals.
 */
const CONFIRMED_UNPLAYED: ReadonlyArray<{
  matchId: string;
  absentPlayerId: string;
  presentPlayerId: string;
}> = [{
  matchId: 's7h85xt2g5chghk4zb60egge',
  absentPlayerId: 'fqvyo1qwhu8knh6gzi9269i7',
  presentPlayerId: 'e6sh0ydykxjisfuxyr3i8hua',
}];

export function parseTCWhiteboardV1(
  value: unknown,
  branding: readonly PublicTeamBranding[] = [],
): ParsedMatch {
  const source = object(value);
  if (source.schema !== 'tcwhiteboard.match/v1') {
    throw new Error('Unsupported TCWhiteboard format: expected tcwhiteboard.match/v1.');
  }
  const match = object(source.match);
  const home = object(match.home);
  const away = object(match.away);
  const matchId = name(match.id);
  const homeId = name(home.id);
  const awayId = name(away.id);
  const homeName = name(home.name);
  const awayName = name(away.name);
  const homeBrand = findPublicTeamBranding({
    id: homeId, slug: name(home.slug), name: homeName,
  }, branding);
  const awayBrand = findPublicTeamBranding({
    id: awayId, slug: name(away.slug), name: awayName,
  }, branding);
  const homeScore = points(home.points);
  const awayScore = points(away.points);
  const date = name(match.date);
  if (!matchId || !homeId || !awayId || !homeName || !awayName || !date
    || homeScore === null || awayScore === null) {
    throw new Error('TCWhiteboard match is missing an ID, teams, date or official scores.');
  }
  const rounds = list(source.rounds).map(object);
  if (!rounds.length) throw new Error('TCWhiteboard match has no scoring rounds.');
  const corrections = CONFIRMED_UNPLAYED.filter((entry) => entry.matchId === matchId);
  const contests: FinalMatchContest[] = [];
  const adjustments: FinalScoreAdjustment[] = [];
  const notes: string[] = [];
  let sourceSinglesHome = 0;
  let sourceSinglesAway = 0;
  let sourceDoublesHome = 0;
  let sourceDoublesAway = 0;

  for (const round of rounds) {
    const title = name(round.name).toLowerCase();
    const format = title === 'singles' ? 'Singles' : title === 'doubles' ? 'Doubles' : null;
    if (!format) {
      notes.push(`Skipped unsupported round: ${name(round.name) || 'unnamed'}.`);
      continue;
    }
    const roundPoints = object(round.points);
    const roundHome = points(roundPoints.home);
    const roundAway = points(roundPoints.away);
    if (roundHome === null || roundAway === null) {
      throw new Error(`The ${format} round has invalid point totals.`);
    }
    let summedHome = 0;
    let summedAway = 0;

    for (const [index, rawMatchup] of list(round.matchups).entries()) {
      const matchup = object(rawMatchup);
      const matchHome = object(matchup.home);
      const matchAway = object(matchup.away);
      const matchResult = object(matchup.result);
      const pHome = points(matchHome.points);
      const pAway = points(matchAway.points);
      if (pHome === null || pAway === null) {
        throw new Error(`Invalid points for ${format} matchup ${index + 1}.`);
      }
      summedHome += pHome;
      summedAway += pAway;
      const homePlayers = makePlayers(matchHome.players);
      const awayPlayers = makePlayers(matchAway.players);
      const winner = name(matchResult.winner);
      const tied = winner === '' && (name(matchResult.text).toUpperCase() === 'PUSH'
        || (pHome === pAway && pHome > 0));
      const homeOutcome: 'W' | 'L' | 'T' = winner === 'home' ? 'W'
        : winner === 'away' ? 'L' : tied ? 'T' : pHome > pAway ? 'W' : pHome < pAway ? 'L' : 'T';
      const awayOutcome = homeOutcome === 'W' ? 'L' : homeOutcome === 'L' ? 'W' : 'T';
      const correction = format === 'Singles' && corrections.find((item) =>
        awayPlayers.some((player) => player.id === item.absentPlayerId)
        && homePlayers.some((player) => player.id === item.presentPlayerId));
      const position = index + 1;
      const card = Number(matchup.card);
      if (correction) {
        if (pHome !== 1 || pAway !== 0) {
          throw new Error('Unplayed-slot correction no longer matches the exported points. Review before displaying.');
        }
        // Display the slot without listing the absent opponent or awarding a player W/L.
        contests.push({
          id: `${matchId}-unplayed-${position}`,
          format, position, homeOutcome:'T', awayOutcome:'T', unplayed:true,
          homePlayers, awayPlayers:[],
          resultText:'UNPLAYED',
          card: Number.isInteger(card) ? card : undefined,
          startingHole: name(matchup.startingHole) || undefined,
        });
        adjustments.push({
          awardedTeamId: homeId, category:'UnplayedSlot', points:pHome,
          note: `TCWhiteboard singles card ${card}: commissioner-confirmed no-show; awarded team point already included in Singles total. No player singles win/loss or CI adjustment.`,
        });
        notes.push(
          'Commissioner-confirmed correction: the Conner Garrett vs Andrew Wilson singles pairing was not played. Conner is not displayed as a player; Andrew receives no singles W/L or CI from that pairing. The source includes the 1-point award in Ninjas singles.'
        );
      } else {
        contests.push({
          id: `${matchId}-${format.toLowerCase()}-${position}`,
          format, position, homeOutcome, awayOutcome, homePlayers, awayPlayers,
          resultText: name(matchResult.text) || undefined,
          card: Number.isInteger(card) ? card : undefined,
          startingHole: name(matchup.startingHole) || undefined,
          homeStrokes: points(matchHome.strokes) ?? undefined,
          awayStrokes: points(matchAway.strokes) ?? undefined,
        });
      }
    }
    if (Math.abs(summedHome - roundHome) > .001 || Math.abs(summedAway - roundAway) > .001) {
      throw new Error(`TCWhiteboard ${format} round totals do not agree with its matchup points.`);
    }
    if (format === 'Singles') {
      sourceSinglesHome += roundHome;
      sourceSinglesAway += roundAway;
    } else {
      sourceDoublesHome += roundHome;
      sourceDoublesAway += roundAway;
    }
  }

  const sumHome = sourceSinglesHome + sourceDoublesHome;
  const sumAway = sourceSinglesAway + sourceDoublesAway;
  if (Math.abs(sumHome - homeScore) > .001 || Math.abs(sumAway - awayScore) > .001) {
    notes.push('TCWhiteboard official final differs from the sum of exported rounds; this preview preserves the official final and shows the discrepancy.');
  }
  if (!contests.length) throw new Error('This TCWhiteboard file has no supported matchups.');
  notes.push('This export does not contain a separate administrative penalty ledger. No-show penalties are NOT automatically added to the official final.');

  const location = object(match.location);
  return {
    snapshot: {
      matchId,
      date, time:null, roundNumber:null,
      course: {
        id: 'tcwhiteboard-venue',
        name: name(location.name) || 'Venue not listed',
        mapUrl:null,
      },
      awayTeam: {
        id: awayId, name:awayName,
        shortName:awayBrand?.shortName || awayName,
        logo:awayBrand?.logo || '',
        primaryColor:awayBrand?.primaryColor || null,
        secondaryColor:awayBrand?.secondaryColor || null,
      },
      homeTeam: {
        id: homeId, name:homeName,
        shortName:homeBrand?.shortName || homeName,
        logo:homeBrand?.logo || '',
        primaryColor:homeBrand?.primaryColor || null,
        secondaryColor:homeBrand?.secondaryColor || null,
      },
      awayScore, homeScore, contests, adjustments,
      weather:null, publishedAt:name(match.finalizedAt) || null,
    },
    notes,
  };
}
