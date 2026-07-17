import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {OFFICE_NAV_ITEMS} from '@/shared/constants/commissioner';

export default function OfficeDashboardPage() {
  return (
    <OfficePage sectionId="dashboard">
      <nav className="office-section-grid" aria-label="Commissioner sections">
        {OFFICE_NAV_ITEMS.slice(1).map((item) => (
          <Link href={item.href} className="office-section-card" key={item.href}>
            <span>{item.title}</span>
            <p>{item.description}</p>
            <strong>Open section</strong>
          </Link>
        ))}
      </nav>
    </OfficePage>
  );
}
