export const PLAYER_APPLICATION_TYPES = ['Adult', 'Junior'] as const;
export const PLAYER_APPLICATION_GENDERS = ['Male', 'Female'] as const;
export const PLAYER_APPLICATION_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
] as const;

export type PlayerApplicationType = typeof PLAYER_APPLICATION_TYPES[number];
export type PlayerApplicationGender = typeof PLAYER_APPLICATION_GENDERS[number];
export type PlayerApplicationStatus = typeof PLAYER_APPLICATION_STATUSES[number];

export type PlayerApplication = {
  id: string;
  profileId: string;
  seasonId: string;
  requestedTeamId: string;
  playerType: PlayerApplicationType;
  gender: PlayerApplicationGender;
  playedBefore: boolean;
  status: PlayerApplicationStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type SubmitPlayerApplicationInput = {
  seasonId: string;
  requestedTeamId: string;
  playerType: PlayerApplicationType;
  gender: PlayerApplicationGender;
  playedBefore: boolean;
};

export type ReviewPlayerApplicationStatus = Extract<
  PlayerApplicationStatus,
  'Approved' | 'Rejected'
>;

export type PlayerApplicationServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string};

export function isPlayerApplicationType(value: unknown): value is PlayerApplicationType {
  return typeof value === 'string'
    && PLAYER_APPLICATION_TYPES.includes(value as PlayerApplicationType);
}

export function isPlayerApplicationGender(value: unknown): value is PlayerApplicationGender {
  return typeof value === 'string'
    && PLAYER_APPLICATION_GENDERS.includes(value as PlayerApplicationGender);
}

export function isReviewPlayerApplicationStatus(
  value: unknown,
): value is ReviewPlayerApplicationStatus {
  return value === 'Approved' || value === 'Rejected';
}
