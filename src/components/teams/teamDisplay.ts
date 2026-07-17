import type {Team} from '@/models/Team';

export function formatTeamLocation(team: Team): string {
  return [team.city, team.state].filter(Boolean).join(', ') || 'Not assigned';
}
