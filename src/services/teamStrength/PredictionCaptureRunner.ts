import {
  captureCurrentRosterPrediction,
  type PredictionCaptureCoordinatorInput,
  type PredictionCaptureCoordinatorResult,
} from './PredictionCaptureCoordinator';
import type {PredictionSnapshotRepository} from './PredictionSnapshotRepository';

export type PredictionCaptureCandidate = Omit<
  PredictionCaptureCoordinatorInput,
  'repository' | 'now'
>;

export interface PredictionCaptureCandidateRepository {
  getCaptureCandidates(now: Date): Promise<PredictionCaptureCandidate[]>;
}

export type PredictionCaptureRunSummary = {
  processed: number;
  captured: number;
  skipped: number;
  failed: number;
  reasons: Partial<Record<NonCapturedReason, number>>;
};

type NonCapturedReason = Extract<PredictionCaptureCoordinatorResult, {captured: false}>['reason'];

/**
 * Processes only candidates whose lifecycle window is currently valid. One bad
 * match must not prevent other matches from preserving their calibration data.
 */
export async function processPredictionCaptures(input: {
  candidateRepository: PredictionCaptureCandidateRepository;
  snapshotRepository: PredictionSnapshotRepository;
  now?: Date;
  onError?: (context: {matchId: string; error: unknown}) => void;
}): Promise<PredictionCaptureRunSummary> {
  const now = input.now ?? new Date();
  const candidates = await input.candidateRepository.getCaptureCandidates(now);
  const summary: PredictionCaptureRunSummary = {
    processed: candidates.length,
    captured: 0,
    skipped: 0,
    failed: 0,
    reasons: {},
  };

  for (const candidate of candidates) {
    try {
      const result = await captureCurrentRosterPrediction({
        ...candidate,
        repository: input.snapshotRepository,
        now,
      });

      if (result.captured) {
        summary.captured += 1;
      } else {
        summary.skipped += 1;
        summary.reasons[result.reason] = (summary.reasons[result.reason] ?? 0) + 1;
      }
    } catch (error) {
      summary.failed += 1;
      input.onError?.({matchId: candidate.matchId, error});
    }
  }

  return summary;
}
