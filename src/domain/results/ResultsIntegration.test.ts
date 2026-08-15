import assert from 'node:assert/strict';
import test from 'node:test';
import {MockResultsRepository} from '@/domain/results/ResultsRepository';
import {ResultsService} from '@/domain/results/ResultsService';
import {MockScheduleRepository} from '@/domain/schedule/ScheduleRepository';
import type {ResultContestInput} from '@/domain/results/MatchResult';

function createService() {
  const repository = new MockResultsRepository();
  repository.setOfficialRosters('summer-2026-r1-dark-ninjas', officialRosters());
  return new ResultsService(repository, new MockScheduleRepository());
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

test('player contests save with drafts, publish with the parent result, and unlock only after reopening', async () => {
  const service = createService();
  const matchId = 'summer-2026-r1-dark-ninjas';
  const contests = validContests(matchId);

  assert.equal((await service.saveDraft(matchId, {homeScore: 4, awayScore: 3, contests})).ok, true);
  assert.equal((await service.getContests(matchId)).length, 2);
  assert.equal((await service.publish(matchId, {homeScore: 5, awayScore: 3, contests})).ok, true);
  assert.equal((await service.saveDraft(matchId, {homeScore: 6, awayScore: 3, contests})).ok, false);
  assert.equal((await service.reopen(matchId)).ok, true);
  assert.equal((await service.saveDraft(matchId, {homeScore: 6, awayScore: 3, contests})).ok, true);
});

test('player contest validation rejects incomplete singles, malformed doubles, and wrong teams', async () => {
  const service = createService();
  const matchId = 'summer-2026-r1-dark-ninjas';
  const contests = validContests(matchId);
  contests[0].awayScore = null;
  const incomplete = await service.publish(matchId, {homeScore: 5, awayScore: 3, contests});
  assert.equal(incomplete.ok, false);
  if (!incomplete.ok) assert.match(incomplete.fieldErrors?.contests ?? '', /both singles scores/i);

  const wrongTeam = validContests(matchId);
  wrongTeam[1].players[0].teamId = 'ninjas';
  const invalid = await service.saveDraft(matchId, {homeScore: 5, awayScore: 3, contests: wrongTeam});
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.match(invalid.fieldErrors?.contests ?? '', /scheduled home and away teams/i);
});

test('player contests require both official manifests and snapshot participants', async () => {
  const repository = new MockResultsRepository();
  const service = new ResultsService(repository, new MockScheduleRepository());
  const matchId = 'summer-2026-r1-dark-ninjas';

  repository.setOfficialRosters(matchId, officialRosters().slice(0, 1));
  const partial = await service.saveDraft(matchId, {homeScore: 5, awayScore: 3, contests: validContests(matchId)});
  assert.equal(partial.ok, false);
  if (!partial.ok) assert.match(partial.fieldErrors?.contests ?? '', /complete official match roster/i);

  repository.setOfficialRosters(matchId, officialRosters());
  const invalid = validContests(matchId);
  invalid[0].players[0].playerId = 'not-on-snapshot';
  const rejected = await service.saveDraft(matchId, {homeScore: 5, awayScore: 3, contests: invalid});
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.fieldErrors?.contests ?? '', /official match roster/i);
});

test('team-only scoring remains valid without an official snapshot', async () => {
  const service = new ResultsService(new MockResultsRepository(), new MockScheduleRepository());
  assert.equal((await service.saveDraft('summer-2026-r1-dark-ninjas', {homeScore: 5, awayScore: 3})).ok, true);
  assert.equal((await service.publish('summer-2026-r1-dark-ninjas', {homeScore: 5, awayScore: 3})).ok, true);
});

function validContests(matchId: string): ResultContestInput[] {
  return [
    {
      id: `${matchId}-singles-1`, format: 'Singles', position: 1,
      homeOutcome: 'W', awayOutcome: 'L', homeScore: 7, awayScore: 4,
      players: [
        {playerId: 'home-1', teamId: 'dark-knights', side: 'Home', slot: 1},
        {playerId: 'away-1', teamId: 'ninjas', side: 'Away', slot: 1},
      ],
    },
    {
      id: `${matchId}-doubles-1`, format: 'Doubles', position: 1,
      homeOutcome: 'T', awayOutcome: 'T', homeScore: null, awayScore: null,
      players: [
        {playerId: 'home-1', teamId: 'dark-knights', side: 'Home', slot: 1},
        {playerId: 'home-2', teamId: 'dark-knights', side: 'Home', slot: 2},
        {playerId: 'away-1', teamId: 'ninjas', side: 'Away', slot: 1},
        {playerId: 'away-2', teamId: 'ninjas', side: 'Away', slot: 2},
      ],
    },
  ];
}

function officialRosters() {
  return [
    {
      teamId: 'dark-knights',
      teamName: 'Historical Dark Knights',
      players: ['home-1', 'home-2'].map((playerId) => ({
        playerId,
        playerName: `Historical ${playerId}`,
        teamId: 'dark-knights',
        teamName: 'Historical Dark Knights',
      })),
    },
    {
      teamId: 'ninjas',
      teamName: 'Historical Ninjas',
      players: ['away-1', 'away-2'].map((playerId) => ({
        playerId,
        playerName: `Historical ${playerId}`,
        teamId: 'ninjas',
        teamName: 'Historical Ninjas',
      })),
    },
  ];
}
