import assert from 'node:assert/strict';
import test from 'node:test';

import {
  rankTeamStrengths,
  sortOfficeRosterPlayers,
  type OfficeRosterPlayer,
} from './officeTeamDashboard';

function player(
  name: string,
  strengthCi: number | null,
  attendanceStatus: OfficeRosterPlayer['attendanceStatus'],
): OfficeRosterPlayer {
  return {
    id: name.toLowerCase().replaceAll(' ', '-'),
    name,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    strengthCi,
    strengthCiProvisional: false,
    attendanceStatus,
  };
}

test('sorts operational rosters by attendance group, then CI descending', () => {
  const sorted = sortOfficeRosterPlayers([
    player('Out Strong', 980, 'NotPlaying'),
    player('Waiting Strong', 970, 'Unconfirmed'),
    player('Playing Low', 900, 'Playing'),
    player('Playing High', 950, 'Playing'),
    player('Waiting Low', 880, 'Unconfirmed'),
  ], true);

  assert.deepEqual(sorted.map((entry) => entry.name), [
    'Playing High',
    'Playing Low',
    'Waiting Strong',
    'Waiting Low',
    'Out Strong',
  ]);
});

test('sorts by CI when there is no attendance context', () => {
  const sorted = sortOfficeRosterPlayers([
    player('Lower', 900, null),
    player('Missing', null, null),
    player('Higher', 960, null),
  ], false);

  assert.deepEqual(sorted.map((entry) => entry.name), ['Higher', 'Lower', 'Missing']);
});

test('ranks teams by venue-neutral active roster strength', () => {
  const ranks = rankTeamStrengths([
    {id: 'team-b', strength: 910},
    {id: 'team-a', strength: 940},
    {id: 'team-c', strength: null},
    {id: 'team-d', strength: 925},
  ]);

  assert.deepEqual(ranks, {
    'team-a': 1,
    'team-d': 2,
    'team-b': 3,
  });
});
