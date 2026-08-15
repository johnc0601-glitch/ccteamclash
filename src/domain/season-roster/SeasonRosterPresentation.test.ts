import assert from 'node:assert/strict';
import test from 'node:test';
import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import type {Season} from '@/domain/season/Season';
import type {SeasonRosterMembership, SeasonTeam} from '@/domain/season-roster/SeasonRosterMembership';
import {buildSeasonRosterTeamViews} from '@/domain/season-roster/SeasonRosterPresentation';

test('Commissioner sees all enrolled teams while Captain sees only their assigned enrolled team', () => {
  const commissioner = views({role: 'Commissioner', teamId: null});
  const captain = views({role: 'Captain', teamId: 'team-home'});

  assert.deepEqual(commissioner.map((team) => team.seasonTeam.teamId), ['team-home', 'team-away']);
  assert.deepEqual(captain.map((team) => team.seasonTeam.teamId), ['team-home']);
});

test('Captain additions close after lock while Commissioner additions remain available', () => {
  assert.equal(views({role: 'Captain', teamId: 'team-home'})[0].canAdd, true);
  const lockedCaptain = views({role: 'Captain', teamId: 'team-home'}, true)[0];
  const lockedCommissioner = views({role: 'Commissioner', teamId: null}, true)[0];

  assert.equal(lockedCaptain.canAdd, false);
  assert.equal(lockedCaptain.addUnavailableMessage, 'Season roster additions now require Commissioner approval.');
  assert.equal(lockedCommissioner.canAdd, true);
});

test('formats finite and unlimited category counts and separates Active from Dropped', () => {
  const team = views({role: 'Commissioner', teamId: null})[0];

  assert.deepEqual(team.countLabels, {Men: '1 / 25', Women: '0 / Unlimited', Junior: '0 / Unlimited'});
  assert.deepEqual(team.activeMembers.map((member) => member.playerId), ['active-player']);
  assert.deepEqual(team.droppedMembers.map((member) => member.playerId), ['dropped-player']);
  assert.ok(!team.candidates.some((player) => player.id === 'dropped-player'));
});

function views(
  viewer: {role: 'Commissioner'; teamId: null} | {role: 'Captain'; teamId: string},
  locked = false,
) {
  return buildSeasonRosterTeamViews({
    season: season(locked),
    seasonTeams: [seasonTeam('team-home'), seasonTeam('team-away')],
    memberships: [
      membership('active-player', 'Active'),
      membership('dropped-player', 'Dropped'),
    ],
    teams: [team('team-home', 'Home Team'), team('team-away', 'Away Team')],
    players: [player('active-player'), player('dropped-player'), player('candidate-player')],
    viewer,
  });
}

function season(locked: boolean): Season {
  return {
    id: 'season-one', leagueId: 'league', name: 'Season One', year: 2026,
    description: '', startDate: '2026-08-01', endDate: '2026-11-01', registrationOpen: true,
    mensRosterCap: 25, womensRosterCap: null, juniorRosterCap: null,
    rosterRulesLockAt: locked ? '2026-08-01T19:00:00Z' : null,
    rosterRulesLockedAt: locked ? '2026-08-01T19:00:00Z' : null,
    rosterRulesLocked: locked, active: true, published: true, archived: false,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
}

function seasonTeam(teamId: string): SeasonTeam {
  return {id: `st-${teamId}`, seasonId: 'season-one', teamId, addedBy: 'commissioner', createdAt: '2026-01-01T00:00:00Z'};
}

function membership(playerId: string, status: 'Active' | 'Dropped'): SeasonRosterMembership {
  return {
    id: `membership-${playerId}`, seasonId: 'season-one', teamId: 'team-home', playerId,
    rosterCategory: 'Men', status, addedBy: 'commissioner', addedAt: '2026-01-01T00:00:00Z',
    droppedBy: status === 'Dropped' ? 'captain' : null,
    droppedAt: status === 'Dropped' ? '2026-08-02T00:00:00Z' : null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
}

function player(id: string): LaunchPlayer {
  return {id, name: id, gender: 'Unknown', pdgaNumber: '', pdgaRating: null, currentTeamId: null, homeArea: '', active: true, createdAt: '', updatedAt: ''};
}

function team(id: string, name: string): LaunchTeam {
  return {id, name, shortName: name, logo: '', active: true, createdAt: '', updatedAt: ''};
}
