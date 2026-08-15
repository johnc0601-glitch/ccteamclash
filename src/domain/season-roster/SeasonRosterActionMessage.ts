export function seasonRosterActionError(error: unknown): string {
  const message = readMessage(error).toLowerCase();
  const code = readCode(error);

  if (message.includes('category cap has been reached')) {
    return 'That roster category has reached its season cap.';
  }
  if (message.includes('permanent membership')) {
    return 'This player is already rostered or was previously dropped for this season.';
  }
  if (message.includes('team is not enrolled')) {
    return 'This team is not enrolled in the selected season.';
  }
  if (message.includes('captain additions are closed')) {
    return 'Season roster additions now require Commissioner approval.';
  }
  if (message.includes('already dropped')) {
    return 'This player was already dropped and cannot be reactivated.';
  }
  if (message.includes('player must be active')) {
    return 'Only an active player can be added to a season roster.';
  }
  if (code === '42501' || message.includes('not permitted')) {
    return 'This roster action is not permitted for your role.';
  }
  return 'The season roster could not be updated. Please try again.';
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
