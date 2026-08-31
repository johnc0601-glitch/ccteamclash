import type {Story} from '@/shared/types';

export const seedStories: Story[] = [
  {
    id: 'seed-match-5-everything-on-the-line',
    slug: 'match-5-everything-on-the-line',
    title: 'Match 5: Everything Is on the Line',
    category: 'Match Preview',
    publishedAt: '2026-07-12T12:00:00.000Z',
    image: 'hero',
    body: [
      'Rivalries, standings pressure, and one of the biggest weekends of the season converge at Castle Hayne.',
      'Every point matters as teams fight for position entering the final stretch. Expect aggressive lines, tight matches, and plenty of Team Clash energy.',
    ],
    links: [{label: 'View schedule', url: '/schedule'}],
    status: 'published',
    revision: 1,
  },
  {
    id: 'seed-dark-knights-statement-match',
    slug: 'dark-knights-statement-match',
    title: 'Dark Knights Prepare for a Statement Match',
    category: 'Team News',
    publishedAt: '2026-07-10T12:00:00.000Z',
    image: 'purple',
    body: [
      'The Dark Knights arrive focused and confident, with a chance to reshape the standings.',
      'Their matchup with the Ninjas should be one of the closest battles of the weekend.',
    ],
    status: 'published',
    revision: 1,
  },
  {
    id: 'seed-castle-hayne-course-report',
    slug: 'castle-hayne-course-report',
    title: 'Castle Hayne Is Ready for Clash Day',
    category: 'Course Report',
    publishedAt: '2026-07-08T12:00:00.000Z',
    image: 'orange',
    body: [
      'Castle Hayne rewards controlled drives and confident putting.',
      'Players should expect warm conditions and a course that will punish missed landing zones.',
    ],
    status: 'published',
    revision: 1,
  },
];
