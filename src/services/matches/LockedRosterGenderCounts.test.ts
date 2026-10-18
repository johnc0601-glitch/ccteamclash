import assert from 'node:assert/strict';
import test from 'node:test';
import {lockedRosterGenderCounts} from './LockedRosterGenderCounts';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';

const roster = (...ids: string[]) => ({players: ids.map((playerId) => ({playerId}))} as Pick<OfficialMatchRoster, 'players'>);
const genders = new Map([['male', 'Male' as const], ['female', 'Female' as const], ['borrowed', 'Female' as const], ['nonparticipant', 'Male' as const]]);

test('locked counts use official IDs including borrowed players, not current team membership', () => {
  assert.deepEqual(lockedRosterGenderCounts(roster('male', 'female', 'borrowed'), genders), {maleCount: 1, femaleCount: 2});
});
test('commissioner roster corrections change the counts', () => {
  assert.deepEqual(lockedRosterGenderCounts(roster('male', 'female'), genders), {maleCount: 1, femaleCount: 1});
  assert.deepEqual(lockedRosterGenderCounts(roster('female', 'borrowed'), genders), {maleCount: 0, femaleCount: 2});
});
test('missing player metadata is unavailable rather than a false zero; empty roster is zero', () => {
  assert.deepEqual(lockedRosterGenderCounts(roster('unknown'), genders), {maleCount: null, femaleCount: null});
  assert.deepEqual(lockedRosterGenderCounts(roster(), genders), {maleCount: 0, femaleCount: 0});
});
