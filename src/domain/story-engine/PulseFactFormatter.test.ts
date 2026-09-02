import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pulseFactBundle,
  pulseFactChatText,
  pulseFactSummary,
  pulseFactText,
} from './PulseFactFormatter';
import type {StoryCandidate, StoryTriggerType} from './StoryCandidate';

const scores = {
  magnitude: 80,
  rarity: 20,
  historicalSignificance: 10,
  recency: 100,
  standingsSignificance: 0,
  opponentQuality: 0,
};

function candidate(
  triggerType: StoryTriggerType,
  headlineFacts: StoryCandidate['headlineFacts'],
  contextFacts: StoryCandidate['contextFacts'] = {},
): StoryCandidate {
  return {
    id: `test:${triggerType}`,
    triggerType,
    seasonId: '2025-2026',
    eventId: 'round-3',
    matchId: 'match-7',
    playerIds: ['player-1'],
    teamIds: ['team-1', 'team-2'],
    headlineFacts,
    contextFacts,
    scores,
    storyScore: 82,
    confidence: 'verified',
  };
}

test('formats a win streak without adding unsupported details', () => {
  const item = candidate('WIN_STREAK', {
    player: 'Nicole Pierre',
    format: 'Doubles',
    streakLength: 4,
    team: 'Ninjas',
  });

  assert.equal(pulseFactText(item), 'Nicole Pierre has won 4 straight doubles matches.');
});

test('formats a CI surge from verified window facts', () => {
  const item = candidate('CI_SURGE', {
    player: 'Alex Player',
    matchdays: 3,
    ciGain: 24,
    startCi: 920,
    currentCi: 944,
    team: 'Beast Mode',
  });

  assert.equal(pulseFactText(item), 'Alex Player gained +24 CI across 3 Matchdays.');
  assert.match(pulseFactSummary(item), /CI gain \+24/);
  assert.match(pulseFactSummary(item), /starting CI 920/);
  assert.match(pulseFactSummary(item), /ending CI 944/);
  assert.doesNotMatch(pulseFactSummary(item), /current ci/i);
});

test('uses exact upset probability only when it exists in headline facts', () => {
  const verified = candidate('UPSET', {
    winner: 'Nadya Gutierrez & Nicole Pierre',
    opponentTeam: 'KB',
    team: 'Ninjas',
    winProbability: 0.333,
    ciDeficit: 30,
  });
  const probabilityWithheld = candidate('UPSET', {
    winner: 'Nadya Gutierrez & Nicole Pierre',
    opponentTeam: 'KB',
    team: 'Ninjas',
    winProbability: null,
    ciDeficit: 30,
  });

  assert.equal(
    pulseFactText(verified),
    'Nadya Gutierrez & Nicole Pierre beat KB after entering with a 33% model win chance.',
  );
  assert.equal(
    pulseFactText(probabilityWithheld),
    'Nadya Gutierrez & Nicole Pierre beat KB despite a 30-point CI disadvantage.',
  );
});

test('chat copy carries review caution for provisional rating evidence', () => {
  const item = candidate(
    'UPSET',
    {
      winner: 'Player One',
      opponentTeam: 'Team Two',
      winProbability: null,
      ciDeficit: 15,
    },
    {editorialReviewRequired: true},
  );

  const copy = pulseFactChatText(item);
  assert.match(copy, /requires commissioner review/i);
  assert.doesNotMatch(copy, /% model win chance/);
});

test('fact bundle tells downstream writing tools not to invent facts', () => {
  const bundle = pulseFactBundle([
    candidate('WIN_STREAK', {player: 'Player One', format: 'Singles', streakLength: 3, team: 'Team One'}),
    candidate('CI_SURGE', {player: 'Player Two', matchdays: 5, ciGain: 31, startCi: 900, currentCi: 931, team: 'Team Two'}),
  ]);

  assert.match(bundle, /Do not invent names, records, scores, streaks, probabilities, dates, or historical context\./);
  assert.match(bundle, /Player One has won 3 straight singles matches\./);
  assert.match(bundle, /Player Two gained \+31 CI across 5 Matchdays\./);
});
