import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {captureRosterPredictionStage} from './PredictionLifecycle';
import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import type {PredictionSnapshotRepository} from './PredictionSnapshotRepository';
import {calculateRosterStageStrength} from './RosterStrength';

class MemoryRepository implements PredictionSnapshotRepository {
  saved: TeamStrengthPredictionSnapshot[][] = [];

  async saveIfAbsent(snapshots: readonly TeamStrengthPredictionSnapshot[]): Promise<void> {
    this.saved.push([...snapshots]);
  }
}

test('captures home and away snapshots together with one home adjustment', async () => {
  const repository = new MemoryRepository();
  const home = strength('activeRoster', 900);
  const away = strength('activeRoster', 900);
  assert.ok(home && away);

  const result = await captureRosterPredictionStage({
    repository,
    matchId: 'match-1',
    homeTeamId: 'home-team',
    awayTeamId: 'away-team',
    homeStrength: home,
    awayStrength: away,
    matchVenue: 'Home',
    capturedAt: '2026-10-03T12:00:00.000Z',
  });

  assert.equal(result.captured, true);
  if (!result.captured) return;
  assert.equal(repository.saved.length, 1);
  assert.equal(repository.saved[0].length, 2);
  const [homeSnapshot, awaySnapshot] = result.snapshots;
  assert.equal(homeSnapshot.venue, 'Home');
  assert.equal(awaySnapshot.venue, 'Away');
  assert.equal(homeSnapshot.matchupStrengthDifference, 8);
  assert.equal(awaySnapshot.matchupStrengthDifference, -8);
  assert.ok(Math.abs(homeSnapshot.chanceOfVictory + awaySnapshot.chanceOfVictory - 1) < 1e-12);
  assert.equal(homeSnapshot.capturedAt, awaySnapshot.capturedAt);
  assert.equal(homeSnapshot.captureReason, 'PreMatch');
  assert.equal(awaySnapshot.captureReason, 'PreMatch');
});

test('neutral venue produces symmetric neutral predictions', async () => {
  const repository = new MemoryRepository();
  const home = strength('matchLineup', 900);
  const away = strength('matchLineup', 900);
  assert.ok(home && away);

  const result = await captureRosterPredictionStage({
    repository,
    matchId: 'match-2',
    homeTeamId: 'home-team',
    awayTeamId: 'away-team',
    homeStrength: home,
    awayStrength: away,
    matchVenue: 'Neutral',
  });

  assert.equal(result.captured, true);
  if (!result.captured) return;
  assert.equal(result.snapshots[0].venue, 'Neutral');
  assert.equal(result.snapshots[1].venue, 'Neutral');
  assert.equal(result.snapshots[0].matchupStrengthDifference, 0);
  assert.equal(result.snapshots[1].matchupStrengthDifference, 0);
  assert.equal(result.snapshots[0].chanceOfVictory, 0.5);
  assert.equal(result.snapshots[1].chanceOfVictory, 0.5);
});

test('does not write mixed information stages', async () => {
  const repository = new MemoryRepository();
  const home = strength('activeRoster', 900);
  const away = strength('matchLineup', 900);
  assert.ok(home && away);

  const result = await captureRosterPredictionStage({
    repository,
    matchId: 'match-3',
    homeTeamId: 'home-team',
    awayTeamId: 'away-team',
    homeStrength: home,
    awayStrength: away,
    matchVenue: 'Home',
  });

  assert.deepEqual(result, {captured: false, reason: 'StageMismatch'});
  assert.equal(repository.saved.length, 0);
});

function strength(
  source: 'activeRoster' | 'confirmedAvailableRoster' | 'matchLineup',
  ci: number,
) {
  const players = Array.from({length: 18}, (_, index) => player(`p-${index}`, ci));
  return calculateRosterStageStrength(source, players, players.map((candidate) => candidate.id));
}

function player(id: string, ci: number): LaunchPlayer {
  return {
    id,
    name: id,
    gender: 'Male',
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex: ci,
    clashIndexProvisional: false,
    currentTeamId: 'team',
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  };
}
