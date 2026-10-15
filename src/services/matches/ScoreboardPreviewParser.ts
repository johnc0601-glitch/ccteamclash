import {parseTCWhiteboardV1} from './TCWhiteboardPreview';
import type {PublicTeamBranding} from './ScoreboardPreviewBranding';
import type {
  FinalMatchContest,
  FinalMatchPlayer,
  FinalMatchTeam,
  FinalMatchdaySnapshot,
  FinalScoreAdjustment,
} from './FinalMatchdaySnapshot';

type RecordValue = Record<string, unknown>;
type PreviewResult = {snapshot: FinalMatchdaySnapshot; notes: string[]};

function record(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue : {};
}
function rows(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function string(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function score(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && Number.isInteger(number * 2) ? number : null;
}
function player(value: unknown): FinalMatchPlayer | null {
  const item = record(value);
  const name = string(item.name) || string(item.playerName);
  if (!name) return null;
  return {id: string(item.id) || string(item.playerId) || name.toLowerCase(), name};
}
function players(value: unknown): FinalMatchPlayer[] {
  return rows(value).map(player).filter((value): value is FinalMatchPlayer => value !== null);
}
function names(value: unknown, fallbackIds: string[]): FinalMatchPlayer[] {
  const nameParts = typeof value === 'string'
    ? value.split(/\s+\/\s+/).map((name) => name.trim()).filter(Boolean)
    : [];
  if (nameParts.length) return nameParts.map((name, i) => ({id: fallbackIds[i] || name.toLowerCase(), name}));
  return fallbackIds.map((id) => ({id, name: id.replace(/[-_]/g, ' ')}));
}
function team(value: unknown, id: string, name: string): FinalMatchTeam {
  const item = record(value);
  const resolvedName = string(item.name) || name;
  return {
    id: string(item.id) || id,
    name: resolvedName,
    shortName: string(item.shortName) || resolvedName,
    logo: string(item.logo),
    primaryColor: string(item.primaryColor) || null,
    secondaryColor: string(item.secondaryColor) || null,
  };
}
function outcome(value: unknown): 'W' | 'L' | 'T' | null {
  const text = string(value).toUpperCase();
  return text === 'W' || text === 'L' || text === 'T' ? text : null;
}
function matchupFormat(value: unknown): 'Singles' | 'Doubles' | null {
  const format = string(value).toLowerCase();
  return format === 'singles' ? 'Singles' : format === 'doubles' ? 'Doubles' : null;
}
function boardSideName(boardRow: RecordValue, side: 'Home' | 'Away', teamName: string) {
  const explicit = string(boardRow[side === 'Home' ? 'home' : 'away']);
  if (explicit) return explicit;
  // The 2026 Ninjas-OGs commissioner review uses named board columns.
  const lower = teamName.toLowerCase();
  if (lower.includes('ninja')) return string(boardRow.ninjas);
  if (lower.includes('hayneous') || lower.includes("og")) return string(boardRow.ogs);
  return '';
}
function boardOutcome(value: unknown, homeTeamName: string, awayTeamName: string): 'W' | 'L' | 'T' | null {
  const text = string(value).toLowerCase();
  if (text === 'tie' || text === 'tied' || text === 'draw') return 'T';
  if (text === homeTeamName.toLowerCase() || (text === 'ninjas' && homeTeamName.toLowerCase().includes('ninjas'))) return 'W';
  if (text === awayTeamName.toLowerCase() || (text.includes("og") && awayTeamName.toLowerCase().includes("og"))) return 'L';
  return null;
}
function adjustment(value: unknown): FinalScoreAdjustment | null {
  const item = record(value);
  const category = string(item.category);
  const points = score(item.points);
  const awardedTeamId = string(item.awardedTeamId);
  if (!awardedTeamId || !category || points === null || points <= 0
    || !['NoShow', 'WomenBonus', 'Penalty', 'Other', 'UnplayedSlot'].includes(category)) return null;
  return {
    awardedTeamId,
    category: category as FinalScoreAdjustment['category'],
    points,
    note: string(item.note) || null,
  };
}

/** Reads a local browser File only; never calls an API or writes match results. */
export function parseScoreboardPreviewJson(
  value: unknown,
  branding: readonly PublicTeamBranding[] = [],
): PreviewResult {
  const source = record(value);
  if (source.schema === 'tcwhiteboard.match/v1') return parseTCWhiteboardV1(value, branding);
  if (!Object.keys(source).length) throw new Error('The file must contain a JSON object.');
  if (source.document_type === 'commissioner_review_note') {
    throw new Error('This is an audit note, not the full match-results JSON. Select the full match file.');
  }

  const fixture = record(source.fixture);
  const draft = record(source.websiteDraftInput);
  const base = Object.keys(draft).length ? draft : source;
  const homeTeamName = string(fixture.homeTeamName) || string(record(source.homeTeam).name) || string(record(source.match).homeTeamName);
  const awayTeamName = string(fixture.awayTeamName) || string(record(source.awayTeam).name) || string(record(source.match).awayTeamName);
  const homeTeamId = string(fixture.homeTeamId) || string(record(source.homeTeam).id) || 'home';
  const awayTeamId = string(fixture.awayTeamId) || string(record(source.awayTeam).id) || 'away';
  const homeScore = score(base.homeScore ?? fixture.homeScore);
  const awayScore = score(base.awayScore ?? fixture.awayScore);
  if (!homeTeamName || !awayTeamName || homeScore === null || awayScore === null) {
    throw new Error('Could not find both team names and their official scores. This file may use another JSON format.');
  }

  const homeTeam = team(source.homeTeam, homeTeamId, homeTeamName);
  const awayTeam = team(source.awayTeam, awayTeamId, awayTeamName);
  const whiteboard = rows(source.whiteboardRows).map(record);
  const findRow = (format: string, position: number) =>
    whiteboard.find((row) => matchupFormat(row.format) === format && Number(row.position) === position);
  const rawContests = rows(base.contests);
  const notes: string[] = [];
  let contests: FinalMatchContest[] = [];

  if (rawContests.length) {
    contests = rawContests.flatMap((value): FinalMatchContest[] => {
      const entry = record(value);
      const format = matchupFormat(entry.format);
      const position = Number(entry.position);
      if (!format || !Number.isInteger(position) || position < 1) return [];
      const board = findRow(format, position) ?? {};
      if (string(board.outcome).toLowerCase().includes('unplayed') || entry.unplayed === true) return [];
      const fromBoard = boardOutcome(board.outcome, homeTeam.name, awayTeam.name);
      const homeOutcome = outcome(entry.homeOutcome) || fromBoard;
      const awayOutcome = outcome(entry.awayOutcome) || (homeOutcome === 'W' ? 'L' : homeOutcome === 'L' ? 'W' : homeOutcome);
      if (!homeOutcome || !awayOutcome) return [];
      const fromDraftPlayers = rows(entry.players).map(record);
      const resolveSide = (side: 'Home' | 'Away', teamName: string): FinalMatchPlayer[] => {
        const direct = players(entry[side === 'Home' ? 'homePlayers' : 'awayPlayers']);
        if (direct.length) return direct;
        const sideIds = fromDraftPlayers
          .filter((p) => string(p.side) === side && string(p.playerId))
          .sort((a,b) => Number(a.slot) - Number(b.slot))
          .map((p) => string(p.playerId));
        return names(boardSideName(board, side, teamName), sideIds);
      };
      return [{
        id: string(entry.id) || `${format.toLowerCase()}-${position}`,
        format, position, homeOutcome, awayOutcome,
        homePlayers: resolveSide('Home', homeTeam.name),
        awayPlayers: resolveSide('Away', awayTeam.name),
      }];
    });
  } else if (whiteboard.length) {
    contests = whiteboard.flatMap((board): FinalMatchContest[] => {
      const format = matchupFormat(board.format);
      const position = Number(board.position);
      if (!format || !Number.isInteger(position) || string(board.outcome).toLowerCase().includes('unplayed')) return [];
      const homeOutcome = boardOutcome(board.outcome, homeTeam.name, awayTeam.name);
      if (!homeOutcome) return [];
      return [{
        id: `${format.toLowerCase()}-${position}`,
        format, position, homeOutcome,
        awayOutcome: homeOutcome === 'W' ? 'L' : homeOutcome === 'L' ? 'W' : 'T',
        homePlayers: names(boardSideName(board, 'Home', homeTeam.name), []),
        awayPlayers: names(boardSideName(board, 'Away', awayTeam.name), []),
      }];
    });
  }
  if (!contests.length) {
    throw new Error('No playable singles or doubles rows were found. This JSON format needs a preview adapter; no data was imported.');
  }

  const unplayed = record(source.unplayedContest);
  const unplayedPosition = Number(unplayed.position);
  const declaredUnplayed = unplayed.didNotTakePlace === true
    && Number.isInteger(unplayedPosition) && unplayedPosition > 0;
  if (declaredUnplayed && !contests.some((contest) => contest.format === 'Singles' && contest.position === unplayedPosition)) {
    const homePlayer = player(unplayed.ninjasPlayer) || player(unplayed.homePlayer);
    const awayPlayer = player(unplayed.awayPlayer);
    // Do not include the absent opponent listed in the original review file.
    contests.push({
      id: `preview-unplayed-singles-${unplayedPosition}`,
      format: 'Singles', position: unplayedPosition,
      homeOutcome: 'T', awayOutcome: 'T', unplayed: true,
      homePlayers: homePlayer ? [homePlayer] : [],
      awayPlayers: awayPlayer ? [awayPlayer] : [],
    });
  }

  contests.sort((a, b) => (a.format === b.format ? a.position - b.position : a.format === 'Singles' ? -1 : 1));

  const rawAdjustments = rows(source.adjustments).length ? rows(source.adjustments) : rows(source.websiteStructuralPoints);
  const adjustments = rawAdjustments.map(adjustment).filter((a): a is FinalScoreAdjustment => a !== null);
  const slotPoints = score(unplayed.forfeitSlotPoints);
  const slotTeam = string(unplayed.awardedTeamId);
  if (declaredUnplayed && slotTeam && slotPoints !== null && slotPoints > 0
    && !adjustments.some((a) => a.category === 'UnplayedSlot' && a.awardedTeamId === slotTeam)) {
    const composite = adjustments.find((a) =>
      a.category === 'NoShow' && a.awardedTeamId === slotTeam && a.points > slotPoints);
    // Review file combines the +1 unplayed slot and +1.5 admin penalties.
    // Split it for display without changing either official team score.
    if (composite) composite.points -= slotPoints;
    adjustments.push({
      awardedTeamId: slotTeam,
      category: 'UnplayedSlot',
      points: slotPoints,
      note: `Singles #${unplayedPosition}: unplayed; no player win/loss or CI movement`,
    });
  }

  if (whiteboard.length && rawContests.length && contests.filter((row) => !row.unplayed).length !== rawContests.length) {
    notes.push('At least one input contest was excluded as unplayed or invalid. Check the displayed rows.');
  }
  if (!whiteboard.length && contests.some((c) => [...c.homePlayers, ...c.awayPlayers].some((p) => p.name === p.id.replace(/[-_]/g,' ')))) {
    notes.push('Some player names were unavailable in this JSON and are displayed from IDs.');
  }
  return {
    snapshot: {
      matchId: string(source.matchId) || string(fixture.matchId) || 'local-preview',
      date: string(source.date) || string(fixture.date) || '2026-10-10',
      time: string(source.time) || string(fixture.time) || null,
      roundNumber: Number.isInteger(Number(source.roundNumber ?? fixture.round))
        ? Number(source.roundNumber ?? fixture.round) : null,
      course: {
        id: string(record(source.course).id) || 'preview-course',
        name: string(record(source.course).name) || string(fixture.course) || 'Course not listed',
        mapUrl: null,
      },
      homeTeam, awayTeam,
      homeScore, awayScore, contests, adjustments,
      weather: null, publishedAt: null,
    },
    notes,
  };
}
