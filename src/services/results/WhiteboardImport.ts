import type {
  ResultContestFormat,
  ResultContestInput,
  ResultContestOutcome,
  ResultContestSide,
} from '@/domain/results/MatchResult';

export type WhiteboardRosterPlayer = {
  id: string;
  name: string;
  teamId: string;
};

export type WhiteboardImportConfidence = 'High' | 'Review';

export type WhiteboardImportedContest = ResultContestInput & {
  confidence: WhiteboardImportConfidence;
  confidenceScore: number | null;
  reviewReasons: string[];
  sourceNote: string;
};

export type WhiteboardImportResult = {
  homeScore: number | null;
  awayScore: number | null;
  scoreSource: 'Visible' | 'Computed' | 'Unknown';
  contests: WhiteboardImportedContest[];
  warnings: string[];
  reviewCount: number;
  model: string;
};

type RawContest = {
  format?: unknown;
  position?: unknown;
  homePlayerIds?: unknown;
  awayPlayerIds?: unknown;
  homeOutcome?: unknown;
  confidence?: unknown;
  note?: unknown;
};

type RawWhiteboardPayload = {
  homeScore?: unknown;
  awayScore?: unknown;
  scoreSource?: unknown;
  contests?: unknown;
  warnings?: unknown;
};

type NormalizeOptions = {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  roster: WhiteboardRosterPlayer[];
  model: string;
};

const MAX_CONTESTS = 40;

export function normalizeWhiteboardImport(
  payload: unknown,
  options: NormalizeOptions,
): WhiteboardImportResult {
  const raw = isObject(payload) ? payload as RawWhiteboardPayload : {};
  const warnings = stringArray(raw.warnings).slice(0, 20);
  const rosterKeys = new Set(options.roster.map((player) => rosterKey(player.teamId, player.id)));
  const rawContests = Array.isArray(raw.contests)
    ? raw.contests.slice(0, MAX_CONTESTS).filter(isObject) as RawContest[]
    : [];

  const usedPositions = new Map<ResultContestFormat, Set<number>>([
    ['Singles', new Set()],
    ['Doubles', new Set()],
  ]);
  const nextPosition = new Map<ResultContestFormat, number>([
    ['Singles', 1],
    ['Doubles', 1],
  ]);

  const contests: WhiteboardImportedContest[] = [];

  for (const rawContest of rawContests) {
    const format = parseFormat(rawContest.format);
    if (!format) {
      warnings.push('AI returned a contest with an unknown format; it was skipped.');
      continue;
    }

    let position = positiveInteger(rawContest.position);
    const used = usedPositions.get(format)!;
    if (!position || used.has(position)) {
      position = nextAvailablePosition(used, nextPosition.get(format) ?? 1);
    }
    used.add(position);
    nextPosition.set(format, nextAvailablePosition(used, position + 1));

    const expectedSlots = format === 'Singles' ? 1 : 2;
    const reviewReasons: string[] = [];
    const homeIds = normalizePlayerIds(
      rawContest.homePlayerIds,
      expectedSlots,
      options.homeTeamId,
      rosterKeys,
      reviewReasons,
      'home',
    );
    const awayIds = normalizePlayerIds(
      rawContest.awayPlayerIds,
      expectedSlots,
      options.awayTeamId,
      rosterKeys,
      reviewReasons,
      'away',
    );

    const homeOutcome = parseOutcome(rawContest.homeOutcome);
    if (!homeOutcome) reviewReasons.push('Outcome needs review.');

    const confidenceScore = finiteConfidence(rawContest.confidence);
    if (confidenceScore !== null && confidenceScore < 0.85) {
      reviewReasons.push(`AI confidence ${Math.round(confidenceScore * 100)}%.`);
    }

    if (homeIds.filter(Boolean).length < expectedSlots) {
      reviewReasons.push('Home side has an unfilled player slot.');
    }
    if (awayIds.filter(Boolean).length < expectedSlots) {
      reviewReasons.push('Away side has an unfilled player slot.');
    }

    const outcome: ResultContestOutcome = homeOutcome ?? 'T';
    contests.push({
      id: `${options.matchId}-${format.toLowerCase()}-${position}`,
      format,
      position,
      homeOutcome: outcome,
      awayOutcome: complementaryOutcome(outcome),
      homeScore: null,
      awayScore: null,
      players: [
        ...slotsForSide('Home', options.homeTeamId, homeIds),
        ...slotsForSide('Away', options.awayTeamId, awayIds),
      ],
      confidence: reviewReasons.length ? 'Review' : 'High',
      confidenceScore,
      reviewReasons: unique(reviewReasons),
      sourceNote: cleanString(rawContest.note, 240),
    });
  }

  contests.sort((left, right) =>
    formatOrder(left.format) - formatOrder(right.format) || left.position - right.position,
  );

  flagDuplicateRoundPlayers(contests);
  const singlesCount = contests.filter((contest) => contest.format === 'Singles').length;
  const doublesCount = contests.filter((contest) => contest.format === 'Doubles').length;
  if (singlesCount > 18) warnings.push(`AI found ${singlesCount} singles contests; review for duplicate or overlapping whiteboard rows.`);
  if (doublesCount > 9) warnings.push(`AI found ${doublesCount} doubles contests; review for duplicate or overlapping whiteboard rows.`);

  const homeScore = halfPointScore(raw.homeScore);
  const awayScore = halfPointScore(raw.awayScore);
  if (raw.homeScore != null && homeScore == null) warnings.push('AI home score was invalid and was left blank.');
  if (raw.awayScore != null && awayScore == null) warnings.push('AI away score was invalid and was left blank.');

  if (!contests.length) warnings.push('No player contests were confidently extracted from the uploaded photos.');

  const scoreSource = parseScoreSource(raw.scoreSource);
  return {
    homeScore,
    awayScore,
    scoreSource,
    contests,
    warnings: unique(warnings).slice(0, 25),
    reviewCount: contests.filter((contest) => contest.confidence === 'Review').length,
    model: options.model,
  };
}

export function whiteboardImportPrompt(input: {
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  roster: WhiteboardRosterPlayer[];
}): string {
  const homeRoster = input.roster
    .filter((player) => player.teamId === input.homeTeamId)
    .map((player) => `- ${player.name} | id=${player.id}`)
    .join('\n');
  const awayRoster = input.roster
    .filter((player) => player.teamId === input.awayTeamId)
    .map((player) => `- ${player.name} | id=${player.id}`)
    .join('\n');

  return `You are transcribing handwritten Team Clash disc-golf result whiteboards into a reviewable draft.

MATCH
Home: ${input.homeTeamName} (team id ${input.homeTeamId})
Away: ${input.awayTeamName} (team id ${input.awayTeamId})

LOCKED HOME ROSTER
${homeRoster || '- none supplied'}

LOCKED AWAY ROSTER
${awayRoster || '- none supplied'}

RULES
- Read every uploaded photo together. Photos can overlap or show different sections of the same match.
- Do not invent a player, spelling, score, pairing, or result.
- Match handwritten names only to the roster IDs above.
- If a handwritten name is ambiguous, put null in that player slot and explain it in note.
- Singles normally has one Home player and one Away player.
- Doubles normally has two Home players and two Away players.
- An intentionally blank opponent slot may represent an automatic point. Leave that slot null and mention it in note.
- homeOutcome is always from the Home team's perspective: W, L, or T.
- Standard full matches often have 18 singles and 9 doubles, but do not manufacture missing contests.
- If the final team score is clearly written, copy it and set scoreSource to Visible.
- If no final score is visibly written but the complete contest results clearly permit a total, you may calculate it and set scoreSource to Computed.
- Otherwise use null scores and scoreSource Unknown.
- confidence must be a number from 0 to 1 for each contest.
- Use the order/position shown on the board when visible. Otherwise use sequential positions within Singles and Doubles.
- Return JSON only. No markdown fences and no commentary.

JSON SHAPE
{
  "homeScore": number | null,
  "awayScore": number | null,
  "scoreSource": "Visible" | "Computed" | "Unknown",
  "contests": [
    {
      "format": "Singles" | "Doubles",
      "position": number,
      "homePlayerIds": [string | null],
      "awayPlayerIds": [string | null],
      "homeOutcome": "W" | "L" | "T",
      "confidence": number,
      "note": string
    }
  ],
  "warnings": [string]
}`;
}

function flagDuplicateRoundPlayers(contests: WhiteboardImportedContest[]) {
  const usage = new Map<string, WhiteboardImportedContest[]>();

  for (const contest of contests) {
    for (const player of contest.players) {
      if (!player.playerId) continue;
      const key = `${contest.format}::${player.playerId}`;
      const rows = usage.get(key) ?? [];
      rows.push(contest);
      usage.set(key, rows);
    }
  }

  for (const rows of usage.values()) {
    if (rows.length < 2) continue;
    for (const contest of rows) {
      contest.reviewReasons = unique([
        ...contest.reviewReasons,
        `The same player appears in more than one ${contest.format.toLowerCase()} contest.`,
      ]);
      contest.confidence = 'Review';
    }
  }

  for (const contest of contests) {
    const ids = contest.players.map((player) => player.playerId).filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      contest.reviewReasons = unique([...contest.reviewReasons, 'The same player appears on both sides of this contest.']);
      contest.confidence = 'Review';
    }
  }
}

function normalizePlayerIds(
  value: unknown,
  expectedSlots: number,
  teamId: string,
  rosterKeys: Set<string>,
  reviewReasons: string[],
  sideLabel: string,
): string[] {
  const values = Array.isArray(value) ? value.slice(0, expectedSlots) : [];
  const normalized: string[] = [];

  for (let index = 0; index < expectedSlots; index += 1) {
    const rawId = values[index];
    const id = typeof rawId === 'string' ? rawId.trim() : '';
    if (!id) {
      normalized.push('');
      continue;
    }
    if (!rosterKeys.has(rosterKey(teamId, id))) {
      normalized.push('');
      reviewReasons.push(`AI returned a ${sideLabel} player that is not on that locked roster.`);
      continue;
    }
    normalized.push(id);
  }

  return normalized;
}

function slotsForSide(
  side: ResultContestSide,
  teamId: string,
  ids: string[],
) {
  return ids.map((playerId, index) => ({
    playerId,
    teamId,
    side,
    slot: (index + 1) as 1 | 2,
  }));
}

function complementaryOutcome(outcome: ResultContestOutcome): ResultContestOutcome {
  return outcome === 'W' ? 'L' : outcome === 'L' ? 'W' : 'T';
}

function parseFormat(value: unknown): ResultContestFormat | null {
  if (value === 'Singles' || value === 'Doubles') return value;
  return null;
}

function parseOutcome(value: unknown): ResultContestOutcome | null {
  if (value === 'W' || value === 'L' || value === 'T') return value;
  return null;
}

function parseScoreSource(value: unknown): WhiteboardImportResult['scoreSource'] {
  if (value === 'Visible' || value === 'Computed' || value === 'Unknown') return value;
  return 'Unknown';
}

function halfPointScore(value: unknown): number | null {
  if (value == null || value === '') return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || !Number.isInteger(score * 2)) return null;
  return score;
}

function finiteConfidence(value: unknown): number | null {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return null;
  return Math.max(0, Math.min(1, confidence));
}

function positiveInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nextAvailablePosition(used: Set<number>, start: number): number {
  let position = Math.max(1, start);
  while (used.has(position)) position += 1;
  return position;
}

function formatOrder(format: ResultContestFormat): number {
  return format === 'Singles' ? 0 : 1;
}

function rosterKey(teamId: string, playerId: string): string {
  return `${teamId}::${playerId}`;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item, 300)).filter(Boolean)
    : [];
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
