import assert from 'node:assert/strict';
import test from 'node:test';
import {getSpreadCoverOptions, isApprovedCommissioner, isSpreadVoteOpen, moveClashLine, roundHomeSpreadLine, spreadLineLabel} from './SpreadVote';

test('only approved commissioners may see the pilot', () => {
  assert.equal(isApprovedCommissioner({profileRole: 'Commissioner', profileStatus: 'Approved'}), true);
  assert.equal(isApprovedCommissioner({profileRole: 'Captain', profileStatus: 'Approved'}), false);
  assert.equal(isApprovedCommissioner({profileRole: 'Commissioner', profileStatus: 'Pending'}), false);
  assert.equal(isApprovedCommissioner(undefined), false);
});
test('spread matches the public favored-by half-point line', () => {
  assert.equal(roundHomeSpreadLine(4.27), 4.5);
  assert.equal(roundHomeSpreadLine(-4.27), -4.5);
  assert.equal(roundHomeSpreadLine(0.1), 0);
  assert.equal(roundHomeSpreadLine(null), null);
  assert.equal(roundHomeSpreadLine(Infinity), null);
  assert.equal(spreadLineLabel(-4.5, 'Home', 'Away'), 'Away favored by 4.5 points');
});
test('vote closes at the scheduled Eastern time, including daylight saving', () => {
  const match = {date: '2026-11-22', time: '09:00:00', status: 'Scheduled'};
  assert.equal(isSpreadVoteOpen(match, new Date('2026-11-22T13:59:00Z')), true);
  assert.equal(isSpreadVoteOpen(match, new Date('2026-11-22T14:00:00Z')), false);
  assert.equal(isSpreadVoteOpen({...match, status: 'Completed'}, new Date('2026-11-20T12:00:00Z')), false);
  assert.equal(isSpreadVoteOpen({...match, time: null}, new Date('2026-11-20T12:00:00Z')), false);
  const summer = {date: '2027-06-05', time: '09:00:00', status: 'Scheduled'};
  assert.equal(isSpreadVoteOpen(summer, new Date('2027-06-05T12:59:00Z')), true);
  assert.equal(isSpreadVoteOpen(summer, new Date('2027-06-05T13:00:00Z')), false);
});

test('favorite cover means the old low vote, underdog cover means the old high vote', () => {
  const options = getSpreadCoverOptions(5.5, 'Dark Knights', 'Beast Mode');
  assert.deepEqual(options, {
    favorite: {teamName: 'Dark Knights', choice: 'low', label: 'Dark Knights covers', explanation: 'Win by more than 5.5 points'},
    underdog: {teamName: 'Beast Mode', choice: 'high', label: 'Beast Mode covers', explanation: 'Win, tie, or lose by fewer than 5.5 points'},
  });
  const reversed = getSpreadCoverOptions(-4.5, 'Dark Knights', 'Beast Mode');
  assert.equal(reversed.favorite.teamName, 'Beast Mode');
  assert.equal(reversed.favorite.choice, 'low');
  assert.equal(reversed.underdog.teamName, 'Dark Knights');
  assert.equal(reversed.underdog.choice, 'high');
  assert.throws(() => getSpreadCoverOptions(0, 'Home', 'Away'));
});

test('30-person poll moves only after six net picks, then caps at 1.5 points', () => {
  assert.equal(moveClashLine(18, 0, 0), 18);
  assert.equal(moveClashLine(18, 1, 0), 18);
  assert.equal(moveClashLine(18, 5, 0), 18);
  assert.equal(moveClashLine(18, 6, 0), 18.5);
  assert.equal(moveClashLine(18, 18, 12), 18.5);
  assert.equal(moveClashLine(18, 20, 10), 18.5);
  assert.equal(moveClashLine(18, 21, 9), 19);
  assert.equal(moveClashLine(18, 25, 5), 19.5);
  assert.equal(moveClashLine(18, 30, 0), 19.5);
  assert.equal(moveClashLine(18, 0, 30), 16.5);
  assert.equal(moveClashLine(18, 12, 12), 18);
  assert.equal(moveClashLine(-18, 12, 0), -19);
  assert.equal(moveClashLine(-18, 0, 6), -17.5);
  assert.equal(moveClashLine(0.5, 0, 30), 0.5);
  assert.equal(moveClashLine(35.5, 30, 0), 36);
  assert.throws(() => moveClashLine(0, 1, 0));
});
