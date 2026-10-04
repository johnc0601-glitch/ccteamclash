import {OfficePage} from '@/components/commissioner/OfficePage';
import styles from './Settings.module.css';

type OfficeSettingsPageProps = {
  searchParams: Promise<{
    notice?: string | string[];
    error?: string | string[];
  }>;
};

export default async function OfficeSettingsPage({searchParams}: OfficeSettingsPageProps) {
  const query = await searchParams;
  const notice = readParam(query.notice);
  const error = readParam(query.error);

  return (
    <OfficePage sectionId="settings">
      <div className={styles.stack}>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <section className="office-module-frame" aria-labelledby="matchup-predictor-access">
          <span>Match pages</span>
          <h2 id="matchup-predictor-access">Matchup predictor access</h2>
          <p>
            Matchup percentages are visible only to approved captains and commissioners.
            They begin as roster-based estimates, update from confirmed availability, and recalculate from the official rosters after lock.
          </p>
          <p className={styles.current}>
            Current policy: Captains + Commissioner · Recalculates through roster lock
          </p>
        </section>
      </div>
    </OfficePage>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
