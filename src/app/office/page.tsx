import Link from 'next/link';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {RoundCloseoutBoard} from '@/components/commissioner/RoundCloseoutBoard';
import {OFFICE_NAV_ITEMS} from '@/shared/constants/commissioner';
import {getRoundCloseouts} from '@/services/commissioner/RoundCloseoutService';

type OfficeDashboardSearch = {
  round?: string;
  notice?: string;
  error?: string;
};

export default async function OfficeDashboardPage({searchParams}: {searchParams?: Promise<OfficeDashboardSearch>}) {
  const query = searchParams ? await searchParams : {};
  const rounds = await getRoundCloseouts();
  const selected = rounds.find((round) => round.id === query.round)
    ?? [...rounds].reverse().find((round) => round.started)
    ?? rounds[0]
    ?? null;

  return (
    <OfficePage sectionId="dashboard">
      <RoundCloseoutBoard rounds={rounds} selected={selected} notice={query.notice} error={query.error} />
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
