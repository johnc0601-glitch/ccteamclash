import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {OFFICE_SECTIONS, type OfficeSectionId} from '@/shared/constants/commissioner';

const GROUPS: Array<{
  title: string;
  description: string;
  items: OfficeSectionId[];
  priority?: boolean;
}> = [
  {
    title: 'Match Week',
    description: 'The tools most likely to change between Monday and match day.',
    priority: true,
    items: ['matchPreviews', 'clashPulse', 'results', 'schedule'],
  },
  {
    title: 'League Management',
    description: 'Core season structure, rosters, standings, and competition setup.',
    items: ['teams', 'players', 'seasons', 'standings', 'playoffs', 'courses'],
  },
  {
    title: 'Community & Content',
    description: 'Stories, photos, moderation, and team conversations.',
    items: ['media', 'clubhouses'],
  },
  {
    title: 'Administration',
    description: 'Data maintenance and league-wide settings.',
    items: ['imports', 'settings'],
  },
];

export default function OfficeDashboardPage() {
  return (
    <OfficePage sectionId="dashboard">
      <div className="office-dashboard-groups">
        {GROUPS.map((group) => (
          <section className="office-dashboard-group" key={group.title}>
            <header className="office-dashboard-group-header">
              <div>
                <span>{group.title}</span>
                <p>{group.description}</p>
              </div>
            </header>

            <nav
              className={group.priority ? 'office-priority-grid' : 'office-section-grid office-section-grid-compact'}
              aria-label={group.title}
            >
              {group.items.map((sectionId, index) => {
                const item = OFFICE_SECTIONS[sectionId];
                const isPrimary = group.priority && index < 2;
                return (
                  <Link
                    href={item.href}
                    className={isPrimary ? 'office-section-card office-section-card-primary' : 'office-section-card'}
                    key={item.href}
                  >
                    <span>{item.title}</span>
                    <p>{item.description}</p>
                    <strong>{isPrimary ? 'Open workspace' : 'Open section'}</strong>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </OfficePage>
  );
}
