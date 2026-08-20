export const PROFILE_STATUSES = ['Pending', 'Approved', 'Suspended', 'Rejected'] as const;
export const PROFILE_ROLES = ['Player', 'Captain', 'Commissioner'] as const;
export const PLAYER_CLAIM_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const;
export const EVENT_STATUSES = ['Scheduled', 'Final', 'Cancelled'] as const;
export const EVENT_ROSTER_STATUSES = ['Open', 'Submitted', 'Locked'] as const;
export const EVENT_POST_TYPES = ['Comment', 'Photo'] as const;
export const EVENT_POST_STATUSES = ['Visible', 'Removed'] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
export type ProfileRole = (typeof PROFILE_ROLES)[number];
export type PlayerClaimStatus = (typeof PLAYER_CLAIM_STATUSES)[number];
export type LaunchEventStatus = (typeof EVENT_STATUSES)[number];
export type EventRosterStatus = (typeof EVENT_ROSTER_STATUSES)[number];
export type EventPostType = (typeof EVENT_POST_TYPES)[number];
export type EventPostStatus = (typeof EVENT_POST_STATUSES)[number];

export type LaunchProfile = {
  id: string;
  userId: string;
  displayName: string;
  role: ProfileRole;
  status: ProfileStatus;
  playerId: string | null;
  captainTeamId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlayerClaim = {
  id: string;
  profileId: string;
  requestedPlayerId: string | null;
  submittedName: string;
  submittedPdgaNumber: string;
  status: PlayerClaimStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type LaunchPlayer = {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Unknown';
  pdgaNumber: string;
  pdgaRating: number | null;
  clashIndex?: number | null;
  currentTeamId: string | null;
  homeArea: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LaunchTeam = {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LaunchEvent = {
  id: string;
  seasonLabel: string;
  homeTeamId: string;
  awayTeamId: string;
  courseName: string;
  directionsUrl: string;
  date: string;
  time: string;
  status: LaunchEventStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventRoster = {
  id: string;
  eventId: string;
  teamId: string;
  submittedByProfileId: string | null;
  status: EventRosterStatus;
  submittedAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventRosterPlayer = {
  id: string;
  eventRosterId: string;
  playerId: string;
  createdAt: string;
  updatedAt: string;
};

export type EventPost = {
  id: string;
  eventId: string;
  type: EventPostType;
  authorName: string;
  body: string;
  imageUrl: string | null;
  status: EventPostStatus;
  createdAt: string;
  removedAt: string | null;
  removedBy: string | null;
};

export type LaunchServiceResult<T> =
  | {ok: true; data: T}
  | {ok: false; message: string};

export type CreatePendingProfileInput = {
  userId: string;
  displayName: string;
};

export type SaveLaunchPlayerInput = {
  playerId?: string;
  name: string;
  gender: LaunchPlayer['gender'];
  pdgaNumber: string;
  pdgaRating: number | null;
  currentTeamId: string | null;
  active: boolean;
};

export type SubmitPlayerClaimInput = {
  profileId: string;
  requestedPlayerId: string | null;
  submittedName: string;
  submittedPdgaNumber: string;
};

export type SubmitEventRosterInput = {
  eventId: string;
  teamId: string;
  submittedByProfileId: string;
  playerIds: string[];
};

export type AddEventPostInput = {
  eventId: string;
  type: EventPostType;
  authorName: string;
  body: string;
  imageUrl?: string | null;
};

export type LaunchSeedData = {
  profiles: LaunchProfile[];
  playerClaims: PlayerClaim[];
  players: LaunchPlayer[];
  teams: LaunchTeam[];
  events: LaunchEvent[];
  eventRosters: EventRoster[];
  eventRosterPlayers: EventRosterPlayer[];
  eventPosts: EventPost[];
};
