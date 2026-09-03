import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {RatedResult} from './RatedResult';
import {buildStoryBacktestReport} from './StoryBacktestReport';

function row(index: number, overrides: Partial<RatedResult> = {}): RatedResult {
  const before = 900 + (index - 1) * 7;
  return {
    id: `r${index}`, contestId: `c${index}`, matchId: `m${index}`, eventId: `round-${index}`, seasonId: 'season-1',
    seasonName: 'Season One', eventLabel: `Round ${index}`, eventOrder: index,
    format: 'Singles', side: 'Away', venue: 'Home', subjectPlayerIds: ['p1'], subjectNames: ['Player One'],
    subjectCiBefore: [before], subjectCiAfter: [before + 7], subjectCiDeltas: [7],
    teamId: 't1', teamName: 'Team One', opponentTeamId: 't2', opponentTeamName: 'Team Two',
    outcome: 'W', won: true, actualPoints: 1, expectedPoints: .5, winProbability: .5,
    subjectEffectiveCi: before, opponentEffectiveCi: 950, ciDeficit: 950 - before, ciDelta: 7,
    modelVersion: 'test', playedAt: `2026-10-0${index}T12:00:00Z`,
    ...overrides,
  };
}

describe('buildStoryBacktestReport', () => {
  it('summarizes only surfaced Pulse facts after hidden-category filtering', () => {
    const report = buildStoryBacktestReport([
      row(1),
      row(2, {winProbability: .18, expectedPoints: .18, ciDeficit: 100}),
      row(3, {winProbability: .20, expectedPoints: .20, ciDeficit: 90}),
    ], 'season-1', 2);

    assert.equal(report.seasonName, 'Season One');
    assert.equal(report.resultRows, 3);
    assert.equal(report.events.length, 3);
    assert.equal(report.events[2].eventLabel, 'Round 3');
    assert.equal(report.events[2].candidateCount, 3);
    assert.equal(report.candidateCount, 4);
    assert.deepEqual(report.countsByTrigger, {
      UPSET: 2,
      CI_SURGE: 1,
      WIN_STREAK: 1,
    });
    assert.equal(report.countsByTrigger.PERSONAL_BEST, undefined);
    assert.equal(report.countsByTrigger.HEAD_TO_HEAD, undefined);
    assert.equal(Object.values(report.countsByImportance).reduce((sum, value) => sum + value, 0), report.candidateCount);
    assert.ok(report.scoreDistribution.maximum !== null);
    assert.equal(report.topCandidates.length, 2);
    assert.ok(report.topCandidates[0].storyScore >= report.topCandidates[1].storyScore);
  });

  it('returns an empty factual report when a season has no results', () => {
    const report = buildStoryBacktestReport([row(1)], 'missing-season');
    assert.equal(report.resultRows, 0);
    assert.equal(report.candidateCount, 0);
    assert.deepEqual(report.events, []);
    assert.deepEqual(report.scoreDistribution, {minimum: null, median: null, p75: null, p90: null, maximum: null});
  });
});
