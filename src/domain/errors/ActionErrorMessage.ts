export type ActionErrorCategory =
  | 'authentication'
  | 'profile_pending'
  | 'profile_rejected'
  | 'profile_suspended'
  | 'identity'
  | 'team_assignment'
  | 'team_participation'
  | 'match_locked'
  | 'snapshot_required'
  | 'match_unavailable'
  | 'authorization'
  | 'database_or_unexpected';

export type NormalizedActionError = {
  category: ActionErrorCategory;
  message: string;
};

export const SIGN_IN_REQUIRED_MESSAGE = 'Please sign in to continue.';

export function normalizeActionError(
  error: unknown,
  fallbackMessage: string,
): NormalizedActionError {
  const message = readMessage(error).toLowerCase();

  if (includesAny(message, ['sign in', 'not authenticated', 'auth session', 'jwt'])) {
    return normalized('authentication', SIGN_IN_REQUIRED_MESSAGE);
  }
  if (includesAny(message, ['pending approval', 'approval is pending', 'awaiting approval'])) {
    return normalized('profile_pending', 'Your profile is pending approval.');
  }
  if (message.includes('rejected')) {
    return normalized('profile_rejected', 'Your profile has been rejected.');
  }
  if (message.includes('suspended')) {
    return normalized('profile_suspended', 'Your profile is suspended.');
  }
  if (includesAny(message, ['not linked', 'unlinked', 'player profile is not eligible'])) {
    return normalized('identity', 'Your profile is not linked to an active player record.');
  }
  if (includesAny(message, ['no captain team', 'assigned to a team', 'team assignment'])) {
    return normalized('team_assignment', 'No team assignment is available for this action.');
  }
  if (includesAny(message, ['not participating', 'does not include', 'not on a team you manage'])) {
    return normalized('team_participation', 'Your team is not participating in this match.');
  }
  if (includesAny(message, ['locked', 'attendance is closed', 'confirmation is closed', 'after lock'])) {
    return normalized('match_locked', 'This match is locked. Attendance and roster changes are closed.');
  }
  if (includesAny(message, ['snapshot', 'official roster'])) {
    return normalized('snapshot_required', 'The official match roster is not available yet.');
  }
  if (includesAny(message, ['match not found', 'match is unavailable', 'match could not'])) {
    return normalized('match_unavailable', 'This match is currently unavailable.');
  }
  if (includesAny(message, [
    'not permitted',
    'not authorized',
    'cannot confirm',
    'cannot manage',
    'access is required',
    'approved profile is required',
    'commissioner is required',
    'commissioner access',
    'captain access',
    'only approved',
    'only commissioners',
    'only captains',
    'you cannot',
  ])) {
    return normalized('authorization', 'This action is not permitted for your role.');
  }

  return normalized('database_or_unexpected', fallbackMessage);
}

export function normalizeAuthError(error: unknown): NormalizedActionError {
  const message = readMessage(error).toLowerCase();
  const code = readCode(error);

  if (message.includes('invalid login credentials')) {
    return normalized('authentication', 'Email or password is incorrect. Use password reset if needed.');
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return normalized('database_or_unexpected', 'Too many email requests. Wait a few minutes and try again.');
  }
  if (message.includes('email not confirmed')) {
    return normalized('authentication', 'Confirm your email address before signing in.');
  }
  if (message.includes('already registered')) {
    return normalized('authentication', 'An account already exists for this email. Sign in or reset your password.');
  }

  return normalized('database_or_unexpected', 'The account request could not be completed. Please try again.');
}

function normalized(category: ActionErrorCategory, message: string): NormalizedActionError {
  return {category, message};
}

function includesAny(message: string, candidates: string[]): boolean {
  return candidates.some((candidate) => message.includes(candidate));
}

function readMessage(error: unknown): string {
  if (typeof error === 'string') return error.trim();
  if (error instanceof Error) return error.message.trim();
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message.trim();
  }
  return '';
}

function readCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}
