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
        src: '/pwa/team-clash-app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa/team-clash-app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa/team-clash-app-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/pwa/team-clash-app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Matchday',
        short_name: 'Matchday',
        description: 'Open your next Team Clash match.',
        url: '/matchday',
        icons: [{src: '/pwa/team-clash-app-icon-192.png', sizes: '192x192', type: 'image/png'}],
      },
      {
        name: 'Schedule',
        short_name: 'Schedule',
        description: 'Open the current Team Clash schedule.',
        url: '/schedule',
        icons: [{src: '/pwa/team-clash-app-icon-192.png', sizes: '192x192', type: 'image/png'}],
      },
      {
        name: 'League',
        short_name: 'League',
        description: 'Standings, players, teams, and league information.',
        url: '/league',
        icons: [{src: '/pwa/team-clash-app-icon-192.png', sizes: '192x192', type: 'image/png'}],
      },
    ],
  };
}
