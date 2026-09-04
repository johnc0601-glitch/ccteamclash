import assert from 'node:assert/strict';
import test from 'node:test';
import {buildPublicRosterSummaries} from './PublicRosterSummary';
import type {PublicPlayerView} from './PublicPlayerService';

function statistics(wins: number, losses: number, ties = 0) {
  const matchesPlayed = wins + losses + ties;
  return {
    playerId: 'abel-jimenez',
    playerName: 'Abel Jimenez',
    seasonId: 'historical',
    teamIds: [],
    matchesPlayed,
    finalsQualified: false,
    singlesRecord: {wins, losses, ties},
    doublesRecord: {wins: 0, losses: 0, ties: 0},
    overallRecord: {wins, losses, ties},
    winPercentage: matchesPlayed ? ((wins + ties * 0.5) / matchesPlayed) * 100 : 0,
    pointsEarned: wins + ties * 0.5,
    currentStreak: '--',
  };
}

function playerView(): PublicPlayerView {
  return {
    player: {
      id: 'abel-jimenez',
      name: 'Abel Jimenez',
      teamId: 'riptide',
      pdgaNumber: '284579',
      pdgaRating: 912,
      clashIndex: 923,
      gender: 'Male',
      active: true,
      createdAt: '2026-07-19T00:00:00.000Z',
      updatedAt: '2026-08-28T15:46:51.687961+00:00',
    },
    teamName: 'Riptide',
    currentSeasonName: 'Coastal Clash 2026-2027',
    careerStatistics: statistics(5, 1, 1),
    history: [{id: 'large-history-row'}] as PublicPlayerView['history'],
  };
}

test('compact roster summary preserves collapsed-row record without full profile data', () => {
  const [summary] = buildPublicRosterSummaries([playerView()]);

  assert.deepEqual(summary, {
    id: 'abel-jimenez',
    name: 'Abel Jimenez',
    record: '5-1-1',
    recordLabel: 'Career',
  });
  assert.equal('history' in summary, false);
  assert.equal('careerStatistics' in summary, false);
  assert.equal('player' in summary, false);
});

test('compact roster summary prefers current-season record when matches exist', () => {
  const view = playerView();
  view.currentStatistics = statistics(1, 0);

  const [summary] = buildPublicRosterSummaries([view]);
  assert.equal(summary.record, '1-0');
  assert.equal(summary.recordLabel, 'Coastal Clash 2026-2027');
});
