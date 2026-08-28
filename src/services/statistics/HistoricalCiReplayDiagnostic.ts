export function formatHistoricalCiReplayFailure(reason: string, error: unknown): string {
  const replayMessage = error instanceof Error ? error.message : String(error);
  return `Historical CI ledger validation failed (${reason}); deterministic replay fallback failed: ${replayMessage}`;
}
