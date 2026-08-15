export function playerApplicationReviewActionError(error: unknown): string {
  const message = readMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('returning-player claim')) return 'Resolve the returning-player claim before approval.';
  if (normalized.includes('already exists')) return 'A player with this name already exists. Review this as a returning player.';
  if (normalized.includes('pending player application')) return 'This application has already been reviewed or is unavailable.';
  if (normalized.includes('player profile not found')) return 'The applicant profile is unavailable.';
  if (normalized.includes('already linked')) return message;
  if (readCode(error) === '42501' || normalized.includes('commissioner access')) {
    return 'Approved Commissioner access is required.';
  }
  return 'The player application could not be reviewed. Please try again.';
}

function readMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return typeof error === 'string' ? error : '';
}

function readCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}
