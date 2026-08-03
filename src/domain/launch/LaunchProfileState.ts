import type {LaunchProfile} from '@/domain/launch/LaunchData';

export type LaunchProfileState =
  | 'missing'
  | 'pending_player'
  | 'pending_captain'
  | 'pending_commissioner'
  | 'approved_player'
  | 'approved_captain'
  | 'approved_commissioner'
  | 'rejected'
  | 'suspended';

export function resolveLaunchProfileState(
  profile: LaunchProfile | null | undefined,
): LaunchProfileState {
  if (!profile) return 'missing';
  if (profile.status === 'Rejected') return 'rejected';
  if (profile.status === 'Suspended') return 'suspended';

  if (profile.status === 'Pending') {
    if (profile.role === 'Player') return 'pending_player';
    if (profile.role === 'Captain') return 'pending_captain';
    if (profile.role === 'Commissioner') return 'pending_commissioner';
    return 'rejected';
  }

  if (profile.status === 'Approved') {
    if (profile.role === 'Player') return 'approved_player';
    if (profile.role === 'Captain') return 'approved_captain';
    if (profile.role === 'Commissioner') return 'approved_commissioner';
  }

  return 'rejected';
}
