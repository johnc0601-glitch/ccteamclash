import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  PlayerApplication,
  ReviewPlayerApplicationStatus,
  SubmitPlayerApplicationInput,
} from '@/domain/player-application/PlayerApplication';
import type {PlayerApplicationRepository} from '@/domain/player-application/PlayerApplicationRepository';
import {PlayerApplicationService} from '@/domain/player-application/PlayerApplicationService';

const application: PlayerApplication = {
  id: 'application-1',
  profileId: 'profile-1',
  seasonId: 'season-1',
  requestedTeamId: 'team-1',
  playerType: 'Junior',
  gender: 'Female',
  playedBefore: true,
  status: 'Pending',
  createdAt: '2026-08-15T20:00:00Z',
  updatedAt: '2026-08-15T20:00:00Z',
  reviewedAt: null,
  reviewedBy: null,
};

class FakeRepository implements PlayerApplicationRepository {
  calls: Array<{operation: string; value: unknown}> = [];

  async listApplications(seasonId?: string) {
    this.calls.push({operation: 'list', value: seasonId});
    return [application];
  }

  async getApplication(applicationId: string) {
    this.calls.push({operation: 'get', value: applicationId});
    return application;
  }

  async submitApplication(input: SubmitPlayerApplicationInput) {
    this.calls.push({operation: 'submit', value: input});
    return application;
  }

  async changeRequestedTeam(applicationId: string, requestedTeamId: string) {
    this.calls.push({operation: 'change-team', value: {applicationId, requestedTeamId}});
    return {...application, requestedTeamId};
  }

  async cancelApplication(applicationId: string) {
    this.calls.push({operation: 'cancel', value: applicationId});
    return {...application, status: 'Cancelled' as const};
  }

  async reviewApplication(applicationId: string, status: ReviewPlayerApplicationStatus) {
    this.calls.push({operation: 'review', value: {applicationId, status}});
    return {...application, status};
  }
}

test('submits an explicit Adult/Junior and gender choice without actor or membership data', async () => {
  const repository = new FakeRepository();
  const service = new PlayerApplicationService(repository);
  const result = await service.submitApplication({
    seasonId: ' season-1 ',
    requestedTeamId: ' team-1 ',
    playerType: 'Junior',
    gender: 'Female',
    playedBefore: false,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(repository.calls, [{
    operation: 'submit',
    value: {
      seasonId: 'season-1',
      requestedTeamId: 'team-1',
      playerType: 'Junior',
      gender: 'Female',
      playedBefore: false,
    },
  }]);
});

test('fails friendly submission validation before calling the repository', async () => {
  const repository = new FakeRepository();
  const service = new PlayerApplicationService(repository);
  const result = await service.submitApplication({
    seasonId: '',
    requestedTeamId: 'team-1',
    playerType: 'Adult',
    gender: 'Male',
    playedBefore: false,
  });

  assert.deepEqual(result, {ok: false, message: 'Choose a season.'});
  assert.deepEqual(repository.calls, []);
});

test('requires explicit valid application classifications', async () => {
  const repository = new FakeRepository();
  const service = new PlayerApplicationService(repository);
  const invalidType = await service.submitApplication({
    seasonId: 'season-1',
    requestedTeamId: 'team-1',
    playerType: 'Unknown' as 'Adult',
    gender: 'Male',
    playedBefore: false,
  });
  const invalidGender = await service.submitApplication({
    seasonId: 'season-1',
    requestedTeamId: 'team-1',
    playerType: 'Adult',
    gender: 'Unknown' as 'Male',
    playedBefore: false,
  });

  assert.deepEqual(invalidType, {ok: false, message: 'Choose Adult or Junior.'});
  assert.deepEqual(invalidGender, {ok: false, message: 'Choose Male or Female.'});
  assert.deepEqual(repository.calls, []);
});

test('supports requested-team changes and cancellation without actor identifiers', async () => {
  const repository = new FakeRepository();
  const service = new PlayerApplicationService(repository);

  assert.equal((await service.changeRequestedTeam(' application-1 ', ' team-2 ')).ok, true);
  assert.equal((await service.cancelApplication(' application-1 ')).ok, true);
  assert.deepEqual(repository.calls, [
    {operation: 'change-team', value: {applicationId: 'application-1', requestedTeamId: 'team-2'}},
    {operation: 'cancel', value: 'application-1'},
  ]);
});

test('review accepts only terminal review decisions and delegates authority to the RPC', async () => {
  const repository = new FakeRepository();
  const service = new PlayerApplicationService(repository);
  const invalid = await service.reviewApplication('application-1', 'Pending' as 'Approved');
  const approved = await service.reviewApplication(' application-1 ', 'Approved');

  assert.deepEqual(invalid, {ok: false, message: 'Choose Approved or Rejected.'});
  assert.equal(approved.ok, true);
  assert.deepEqual(repository.calls, [
    {operation: 'review', value: {applicationId: 'application-1', status: 'Approved'}},
  ]);
});

test('repository authorization failures remain failures', async () => {
  const expected = new Error('permission denied');
  const repository = new FakeRepository();
  repository.submitApplication = async () => { throw expected; };
  const service = new PlayerApplicationService(repository);

  await assert.rejects(
    service.submitApplication({
      seasonId: 'season-1',
      requestedTeamId: 'team-1',
      playerType: 'Adult',
      gender: 'Male',
      playedBefore: false,
    }),
    expected,
  );
});

test('RLS-filtered reads remain repository-controlled', async () => {
  const repository = new FakeRepository();
  const service = new PlayerApplicationService(repository);

  assert.deepEqual(await service.listApplications(' season-1 '), [application]);
  assert.equal(await service.getApplication(' application-1 '), application);
  assert.deepEqual(repository.calls, [
    {operation: 'list', value: 'season-1'},
    {operation: 'get', value: 'application-1'},
  ]);
});
