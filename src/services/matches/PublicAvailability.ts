import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';

export const PUBLIC_AVAILABILITY_PREVIEW_COUNT = 5;

export type PublicAvailabilityPreview = {
  previewPlayers: TeamAttendanceMember[];
  remainingCount: number;
};

export function orderPublicAvailability(
  players: readonly TeamAttendanceMember[],
): TeamAttendanceMember[] {
  return [
    ...players.filter((player) => player.status === 'Playing'),
    ...players.filter((player) => player.status === 'Unconfirmed'),
    ...players.filter((player) => player.status === 'NotPlaying'),
  ];
}

export function buildPublicAvailabilityPreview(
  players: readonly TeamAttendanceMember[],
): PublicAvailabilityPreview {
  const ordered = orderPublicAvailability(players);
  return {
    previewPlayers: ordered.slice(0, PUBLIC_AVAILABILITY_PREVIEW_COUNT),
    remainingCount: Math.max(0, ordered.length - PUBLIC_AVAILABILITY_PREVIEW_COUNT),
  };
}
