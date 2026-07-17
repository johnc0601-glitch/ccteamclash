import type {ImportChallenge} from '@/domain/import/ImportJob';
import type {Season} from '@/domain/season/Season';
import type {Team} from '@/models/Team';

export function formatImportDate(value: string): string {
  if (!value) return 'Not completed';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatChallengeDate(value: string): string {
  if (!value) return 'Date pending';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function getSeasonName(seasonId: string, seasons: Season[]): string {
  return seasons.find((season) => season.id === seasonId)?.name ?? seasonId;
}

export function getTeamName(teamId: string, teams: Team[]): string {
  return teams.find((team) => team.id === teamId)?.name ?? teamId;
}

export function getChallengeLabel(challenge: ImportChallenge, teams: Team[]): string {
  return `${challenge.roundName}: ${getTeamName(challenge.homeTeamId, teams)} vs ${getTeamName(challenge.awayTeamId, teams)}`;
}

