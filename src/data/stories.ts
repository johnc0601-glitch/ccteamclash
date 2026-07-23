import type {Story} from '@/shared/types';

export const seedStories: Story[] = [
  {
    slug: 'match-5-everything-on-the-line',
    title: 'Match 5: Everything Is on the Line',
    excerpt: 'The standings tighten as the league heads into a pivotal weekend of Team Clash competition.',
    category: 'Match Preview',
    date: 'July 12, 2026',
    image: 'hero',
    body: [
      'Rivalries, standings pressure, and one of the biggest weekends of the season converge at Castle Hayne.',
      'Every point matters as teams fight for position entering the final stretch. Expect aggressive lines, tight matches, and plenty of Team Clash energy.',
    ],
    links: [{label: 'View schedule', url: '/schedule'}],
  },
  {
    slug: 'dark-knights-statement-match',
    title: 'Dark Knights Prepare for a Statement Match',
    excerpt: 'A confident roster enters the weekend with playoff positioning within reach.',
    category: 'Team News',
    date: 'July 10, 2026',
    image: 'purple',
    body: [
      'The Dark Knights arrive focused and confident, with a chance to reshape the standings.',
      'Their matchup with the Ninjas should be one of the closest battles of the weekend.',
    ],
  },
  {
    slug: 'castle-hayne-course-report',
    title: 'Castle Hayne Is Ready for Clash Day',
    excerpt: 'Course conditions, key holes, and what players should expect this Saturday.',
    category: 'Course Report',
    date: 'July 8, 2026',
    image: 'orange',
    body: [
      'Castle Hayne rewards controlled drives and confident putting.',
      'Players should expect warm conditions and a course that will punish missed landing zones.',
    ],
  },
];
