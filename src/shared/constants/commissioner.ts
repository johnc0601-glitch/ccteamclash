export type OfficeSectionConfig = {
  title: string;
  description: string;
  href: string;
};

export const OFFICE_SECTIONS = {
  dashboard: {
    title: 'Dashboard',
    description: 'A central view of league operations and commissioner workflows.',
    href: '/office',
  },
  teams: {
    title: 'Teams',
    description: 'Organize team identities, captains, and roster assignments.',
    href: '/office/teams',
  },
  players: {
    title: 'Players',
    description: 'Maintain the league player directory and team associations.',
    href: '/office/players',
  },
  seasons: {
    title: 'Seasons',
    description: 'Set the active season and preserve the structure of past seasons.',
    href: '/office/seasons',
  },
  schedule: {
    title: 'Schedule',
    description: 'Plan league dates, matchups, and course assignments.',
    href: '/office/schedule',
  },
  results: {
    title: 'Results',
    description: 'Record completed matches and review submitted scores.',
    href: '/office/results',
  },
  imports: {
    title: 'Imports',
    description: 'Import historical team and player summary records.',
    href: '/office/imports',
  },
  standings: {
    title: 'Standings',
    description: 'Review the competitive order produced by league results.',
    href: '/office/standings',
  },
  courses: {
    title: 'Courses',
    description: 'Maintain the course directory used across league operations.',
    href: '/office/courses',
  },
  media: {
    title: 'Media',
    description: 'Coordinate league stories, photos, and publishing assets.',
    href: '/office/media',
  },
  settings: {
    title: 'Settings',
    description: 'Configure league-wide preferences and office access.',
    href: '/office/settings',
  },
} as const satisfies Record<string, OfficeSectionConfig>;

export type OfficeSectionId = keyof typeof OFFICE_SECTIONS;

export const OFFICE_NAV_ITEMS = Object.values(OFFICE_SECTIONS);
