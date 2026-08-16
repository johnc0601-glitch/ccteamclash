import assert from 'node:assert/strict';
import test from 'node:test';
import type {PlayerApplication} from '@/domain/player-application/PlayerApplication';
import type {Season} from '@/domain/season/Season';
import {resolvePlayerApplicationSeasonContext} from './playerApplicationSeasonContext';

const openSeason = season({id: 'open-season', registrationOpen: true});
const closedSeason = season({id: 'closed-season', registrationOpen: false});
const pendingApplication = application({seasonId: 'application-season', status: 'Pending'});

test('new application creation requires registration to be open', () => {
  assert.deepEqual(resolvePlayerApplicationSeasonContext({activeSeason: openSeason}), {
    newApplicationSeasonId: 'open-season',
    teamOptionsSeasonId: 'open-season',
  });
  assert.deepEqual(resolvePlayerApplicationSeasonContext({activeSeason: closedSeason}), {
    newApplicationSeasonId: undefined,
    teamOptionsSeasonId: undefined,
  });
});

test('Pending application keeps its own season after registration closes', () => {
  assert.deepEqual(resolvePlayerApplicationSeasonContext({
    activeSeason: closedSeason,
    application: pendingApplication,
  }), {
    newApplicationSeasonId: undefined,
    teamOptionsSeasonId: 'application-season',
  });
});

test('Pending application never switches to another active season', () => {
  assert.deepEqual(resolvePlayerApplicationSeasonContext({
    activeSeason: openSeason,
    application: pendingApplication,
  }), {
    newApplicationSeasonId: 'open-season',
    teamOptionsSeasonId: 'application-season',
  });
});

for (const status of ['Approved', 'Rejected', 'Cancelled'] as const) {
  test(`${status} application remains read-only`, () => {
    assert.deepEqual(resolvePlayerApplicationSeasonContext({
      activeSeason: openSeason,
      application: application({status}),
    }), {
      newApplicationSeasonId: 'open-season',
      teamOptionsSeasonId: undefined,
    });
  });
}

test('missing Pending application-season enrollment cannot fall back to the active season', () => {
  const context = resolvePlayerApplicationSeasonContext({
    activeSeason: openSeason,
    application: application({seasonId: 'missing-season', status: 'Pending'}),
  });
  assert.equal(context.teamOptionsSeasonId, 'missing-season');
  assert.notEqual(context.teamOptionsSeasonId, context.newApplicationSeasonId);
});

function application(overrides: Partial<PlayerApplication> = {}): PlayerApplication {
  return {
    id: 'application-1',
    profileId: 'profile-1',
    seasonId: 'application-season',
    requestedTeamId: 'team-1',
    playerType: 'Adult',
    gender: 'Male',
    playedBefore: false,
    status: 'Pending',
    createdAt: 'created',
    updatedAt: 'updated',
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  };
}

function season(overrides: Partial<Season> = {}): Season {
  return {
    id: 'season-1',
    leagueId: 'cc-team-clash',
    name: 'Season',
    year: 2099,
    description: '',
    startDate: '2099-01-01',
    endDate: '2099-12-31',
    registrationOpen: true,
    mensRosterCap: 25,
    womensRosterCap: null,
    juniorRosterCap: null,
    rosterRulesLockAt: null,
    rosterRulesLockedAt: null,
    rosterRulesLocked: false,
    active: true,
    published: true,
    archived: false,
    createdAt: 'created',
    updatedAt: 'updated',
    ...overrides,
  };
}
