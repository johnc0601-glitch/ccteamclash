import assert from 'node:assert/strict';
import test from 'node:test';
import {buildCaptainReminderRecipients, buildCaptainReminderMessage} from '@/domain/match-roster/CaptainReminderEmail';

test('reminder recipients include only unconfirmed players with linked email addresses', () => {
  const recipients = buildCaptainReminderRecipients(
    [
      {playerId: 'a', playerName: 'A', teamId: 'team-1', status: 'Unconfirmed'},
      {playerId: 'b', playerName: 'B', teamId: 'team-1', status: 'Playing'},
      {playerId: 'c', playerName: 'C', teamId: 'team-1', status: 'NotPlaying'},
      {playerId: 'd', playerName: 'D', teamId: 'team-1', status: 'Unconfirmed'},
    ],
    new Map([
      ['a', 'a@example.com'],
      ['b', 'b@example.com'],
    ]),
  );

  assert.deepEqual(recipients, [{playerId: 'a', playerName: 'A', email: 'a@example.com'}]);
});

test('reminder message links directly to matchday and asks for Yes or No', () => {
  const message = buildCaptainReminderMessage({
    awayTeamName: 'Team Focus',
    homeTeamName: 'Wild Turkey',
    matchDateLabel: 'Saturday, October 3',
    matchUrl: 'https://ccteamclash.com/matches/match-1',
  });

  assert.match(message.subject, /Team Focus at Wild Turkey/);
  assert.match(message.text, /Yes or No/);
  assert.match(message.text, /https:\/\/ccteamclash.com\/matches\/match-1/);
  assert.match(message.html, /View Matchday/);
});
