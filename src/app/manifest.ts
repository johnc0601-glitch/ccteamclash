import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Team Clash',
    short_name: 'Team Clash',
    description: 'CCTeamClash league schedules, Matchday, standings, players, teams, and team activity.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#090b0c',
    theme_color: '#090b0c',
    orientation: 'portrait-primary',
    categories: ['sports'],
    icons: [
      {
        src: '/pwa/team-clash-app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
