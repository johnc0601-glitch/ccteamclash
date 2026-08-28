import assert from 'node:assert/strict';
import test from 'node:test';

import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import type {PredictionSnapshotRepository} from './PredictionSnapshotRepository';
import {
  processPredictionCaptures,
  type PredictionCaptureCandidate,
  type PredictionCaptureCandidateRepository,
} from './PredictionCaptureRunner';

class CandidateRepository implements PredictionCaptureCandidateRepository {
  constructor(private readonly candidates: PredictionCaptureCandidate[]) {}
  async getCaptureCandidates(): Promise<PredictionCaptureCandidate[]> {
    return this.candidates;
  }
}

class SnapshotRepository implements PredictionSnapshotRepository {
  saved: TeamStrengthPredictionSnapshot[][] = [];
  failMatchId?: string;

  async saveIfAbsent(snapshots: readonly TeamStrengthPredictionSnapshot[]): Promise<void> {
    if (this.failMatchId && snapshots[0]?.matchId === this.failMatchId) {
      throw new Error('write failed');
    }
    this.saved.push([...snapshots]);
  }
}

test('captures valid candidates and isolates per-match failures', async () => {
  const snapshots = new SnapshotRepository();
  snapshots.failMatchId = 'match-2';
  const errors: string[] = [];

  const summary = await processPredictionCaptures({
    candidateRepository: new CandidateRepository([
      candidate('match-1'),
      candidate('match-2'),
    ]),
    snapshotRepository: snapshots,
    now: new Date('2026-10-02T05:00:00.000Z'),
    onError: ({matchId}) => errors.push(matchId),
  });

  assert.equal(summary.processed, 2);
  assert.equal(summary.captured, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.skipped, 0);
  assert.deepEqual(errors, ['match-2']);
  assert.equal(snapshots.saved.length, 1);
});

test('counts lifecycle skips by reason', async () => {
  const snapshots = new SnapshotRepository();
  const notDue = candidate('not-due');
  const cancelled = {...candidate('cancelled'), matchStatus: 'Cancelled' as const};

  const summary = await processPredictionCaptures({
    candidateRepository: new CandidateRepository([notDue, cancelled]),
    snapshotRepository: snapshots,
    now: new Date('2026-10-02T03:00:00.000Z'),
  });

  assert.equal(summary.captured, 0);
  assert.equal(summary.skipped, 2);
  assert.equal(summary.reasons.NotDue, 1);
  assert.equal(summary.reasons.NotEligible, 1);
  assert.equal(snapshots.saved.length, 0);
});

function candidate(matchId: string): PredictionCaptureCandidate {
  return {
    matchId,
    matchDate: '2026-10-03',
    matchStatus: 'Scheduled',
    homeTeamId: 'home',
    awayTeamId: 'away',
    matchVenue: 'Home',
    homePlayers: players('home'),
    awayPlayers: players('away'),
  };
}

function players(prefix: string): LaunchPlayer[] {
  return Array.from({length: 18}, (_, index) => ({
    id: `${prefix}-${index}`,
    name: `${prefix}-${index}`,
    gender: 'Male' as const,
    pdgaNumber: '',
    pdgaRating: null,
    clashIndex: 900,
    clashIndexProvisional: false,
    currentTeamId: prefix,
    homeArea: '',
    active: true,
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T00:00:00Z',
  }));
}
