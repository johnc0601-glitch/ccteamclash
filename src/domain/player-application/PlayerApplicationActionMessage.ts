export function playerApplicationActionError(error: unknown): string {
  const message = readMessage(error).toLowerCase();
  const code = readCode(error);

  if (message.includes('open current season') || message.includes('enrolled team')) {
    return 'That team is not available for the current application season.';
  }
  if (message.includes('pending player profile')) {
    return 'Your Player profile must be pending before you can submit this application.';
  }
  if (message.includes('only a pending player application')) {
    return 'This application can no longer be changed.';
  }
  if (code === '42501' || message.includes('access is required')) {
    return 'You are not permitted to change this player application.';
  }
  return 'Your player application could not be saved. Please try again.';
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
