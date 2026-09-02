import type {StoryCandidate, StoryFactValue, StoryTriggerType} from './StoryCandidate';

export const pulseTriggerLabels: Record<StoryTriggerType, string> = {
  WIN_STREAK: 'Win streaks',
  STREAK_SNAPPED: 'Streaks snapped',
  UPSET: 'Upsets',
  CI_SURGE: 'CI surges',
  RANK_MILESTONE: 'Rank milestones',
  CAREER_MILESTONE: 'Career milestones',
  PERSONAL_BEST: 'Personal bests',
  FIRST_SINCE: 'First since',
  HEAD_TO_HEAD: 'Head-to-head',
  TEAM_SERIES: 'Team series',
  DOUBLES_CHEMISTRY: 'Doubles chemistry',
  RECORD: 'Records',
};

/**
 * Converts verified Pulse candidate data into deterministic, copy-ready text.
 * This formatter never adds facts beyond the candidate's verified fact payload.
 */
export function pulseFactHeadline(candidate: StoryCandidate): string {
  const facts = candidate.headlineFacts;
  const subject = firstFact(facts, ['winner', 'player', 'players', 'pair', 'team', 'leader', 'holder', 'subject']);
  const opponent = firstFact(facts, ['opponentTeam', 'opponent', 'opponentName']);
  const label = pulseTriggerLabels[candidate.triggerType];

  if (subject && opponent) return `${label}: ${subject} vs ${opponent}`;
  if (subject) return `${label}: ${subject}`;
  return label;
}

export function pulseFactSummary(candidate: StoryCandidate): string {
  const hidden = new Set(['resultId', 'modelVersion', 'upsetConfidence', 'probabilityConfidence']);
  const facts = Object.entries(candidate.headlineFacts)
    .filter(([key, value]) => !hidden.has(key) && value !== null && value !== '' && typeof value !== 'boolean')
    .slice(0, 5)
    .map(([key, value]) => `${humanizeKey(key)} ${formatFactValue(key, value)}`);
  return facts.join(' · ') || 'Verified Clash fact';
}

/** Short form intended for graphics, captions, and the Random Fact visual. */
export function pulseFactText(candidate: StoryCandidate): string {
  const facts = candidate.headlineFacts;
  const player = firstFact(facts, ['player', 'winner', 'players', 'pair', 'leader', 'holder', 'subject']);
  const team = firstFact(facts, ['team']);
  const opponent = firstFact(facts, ['opponentTeam', 'opponent', 'opponentName']);
  const format = firstFact(facts, ['format']);

  switch (candidate.triggerType) {
    case 'WIN_STREAK': {
      const length = numberFact(facts, 'streakLength');
      return player && length !== null
        ? `${player} has won ${length} straight ${format ? `${format.toLowerCase()} ` : ''}matches.`
        : fallbackFactText(candidate);
    }
    case 'CI_SURGE': {
      const gain = numberFact(facts, 'ciGain');
      const matchdays = numberFact(facts, 'matchdays');
      return player && gain !== null && matchdays !== null
        ? `${player} gained ${signed(gain)} CI across ${matchdays} Matchdays.`
        : fallbackFactText(candidate);
    }
    case 'UPSET': {
      const probability = numberFact(facts, 'winProbability');
      const deficit = numberFact(facts, 'ciDeficit');
      if (player && opponent && probability !== null) {
        return `${player} beat ${opponent} after entering with a ${Math.round(probability * 100)}% model win chance.`;
      }
      if (player && opponent && deficit !== null) {
        return `${player} beat ${opponent} despite a ${Math.round(Math.abs(deficit))}-point CI disadvantage.`;
      }
      return fallbackFactText(candidate);
    }
    default:
      if (player && team && opponent) return `${player} (${team}) vs ${opponent}: ${pulseFactSummary(candidate)}.`;
      return fallbackFactText(candidate);
  }
}

/** Detailed copy block intended to be pasted into ChatGPT or another editor. */
export function pulseFactChatText(candidate: StoryCandidate): string {
  const lines = [
    'VERIFIED CLASH FACT',
    `Fact: ${pulseFactText(candidate)}`,
    `Type: ${pulseTriggerLabels[candidate.triggerType]}`,
    `Season: ${pulseSeasonLabel(candidate.seasonId)}`,
    `Context: ${candidate.eventId ?? candidate.matchId ?? candidate.seasonId}`,
    `Verified details: ${pulseFactSummary(candidate)}`,
    'Source: Clash Pulse verified league result data.',
  ];
  if (candidate.contextFacts.editorialReviewRequired === true) {
    lines.push('Caution: rating evidence requires commissioner review; do not state an exact probability unless it appears in the verified details.');
  }
  return lines.join('\n');
}

export function pulseFactBundle(candidates: StoryCandidate[]): string {
  return [
    'VERIFIED CLASH FACTS',
    'Use only these supplied facts as factual claims. Do not invent names, records, scores, streaks, probabilities, dates, or historical context.',
    '',
    ...candidates.flatMap((candidate, index) => [
      `${index + 1}. ${pulseFactText(candidate)}`,
      `   ${pulseFactSummary(candidate)}`,
      `   ${pulseSeasonLabel(candidate.seasonId)} · ${pulseTriggerLabels[candidate.triggerType]}`,
      '',
    ]),
  ].join('\n').trim();
}

export function pulseSeasonLabel(seasonId: string): string {
  const match = seasonId.match(/(20\d{2})-(20\d{2})/);
  return match ? `${match[1]}–${match[2].slice(-2)}` : seasonId;
}

function fallbackFactText(candidate: StoryCandidate): string {
  return `${pulseFactHeadline(candidate)} — ${pulseFactSummary(candidate)}.`;
}

function firstFact(facts: Readonly<Record<string, StoryFactValue>>, keys: string[]): string {
  for (const key of keys) {
    const value = facts[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function numberFact(facts: Readonly<Record<string, StoryFactValue>>, key: string): number | null {
  const value = facts[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function humanizeKey(key: string): string {
  const labels: Record<string, string> = {
    ciGain: 'CI gain',
    startCi: 'starting CI',
    currentCi: 'ending CI',
    ciDeficit: 'CI deficit',
    winProbability: 'win probability',
    matchdays: 'Matchdays',
  };
  return labels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLocaleLowerCase();
}

function formatFactValue(key: string, value: StoryFactValue): string {
  if (typeof value === 'number') {
    if (/probability/i.test(key)) return `${Math.round(value * 100)}%`;
    if (/delta|deficit|gain|change|surge/i.test(key)) return signed(value);
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${Math.round(value)}`;
}
