import assert from 'node:assert/strict';
import test from 'node:test';
import {MockResultsRepository} from '@/domain/results/ResultsRepository';
import {ResultsService} from '@/domain/results/ResultsService';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';

function createService() {
  return new ResultsService(new MockResultsRepository(), new MockScheduleRepository());
}

test('results workflow saves and edits a draft, publishes it, and exposes only the final result', async () => {
  const service = createService();
  const matchId = 'summer-2026-r1-dark-ninjas';

  const draft = await service.saveDraft(matchId, {homeScore: 4, awayScore: null});
  assert.equal(draft.ok, true);
  assert.equal(await service.getPublishedResult(matchId), undefined);

  const edited = await service.saveDraft(matchId, {homeScore: 5, awayScore: 3});
  assert.equal(edited.ok, true);
  if (!edited.ok) return;
  assert.equal(edited.data.homeScore, 5);

  const published = await service.publish(matchId, {homeScore: 5, awayScore: 3});
  assert.equal(published.ok, true);
  assert.equal((await service.getPublishedResult(matchId))?.status, 'Published');

  const duplicate = await service.publish(matchId, {homeScore: 6, awayScore: 3});
  assert.equal(duplicate.ok, false);
  const forbiddenEdit = await service.saveDraft(matchId, {homeScore: 6, awayScore: 3});
  assert.equal(forbiddenEdit.ok, false);

  const reopened = await service.reopen(matchId);
  assert.equal(reopened.ok, true);
  assert.equal(await service.getPublishedResult(matchId), undefined);

  const corrected = await service.saveDraft(matchId, {homeScore: 6, awayScore: 3});
  assert.equal(corrected.ok, true);
});

test('results workflow rejects incomplete, invalid, and nonexistent published results', async () => {
  const service = createService();
  const incomplete = await service.publish('summer-2026-r1-dark-ninjas', {
    homeScore: 4,
    awayScore: null,
  });
  assert.equal(incomplete.ok, false);
  if (!incomplete.ok) assert.equal(incomplete.fieldErrors?.awayScore, 'A score is required before publishing.');

  const invalid = await service.saveDraft('summer-2026-r1-dark-ninjas', {
    homeScore: -1,
    awayScore: 2.5,
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.ok(invalid.fieldErrors?.homeScore);
    assert.ok(invalid.fieldErrors?.awayScore);
  }

  const missing = await service.publish('does-not-exist', {homeScore: 1, awayScore: 0});
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.message, 'Scheduled match not found.');
});
