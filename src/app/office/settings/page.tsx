import {OfficePage} from '@/components/commissioner/OfficePage';
import {createClient} from '@/lib/supabase/server';
import {
  getMatchPredictionVisibility,
  type MatchPredictionVisibility,
} from '@/services/settings/MatchPredictionVisibility';
import {updateMatchPredictionVisibility} from './actions';
import {SaveVisibilityButton} from './SaveVisibilityButton';
import styles from './Settings.module.css';

type OfficeSettingsPageProps = {
  searchParams: Promise<{
    notice?: string | string[];
    error?: string | string[];
  }>;
};

const OPTIONS: Array<{
  value: MatchPredictionVisibility;
  label: string;
  description: string;
}> = [
  {
    value: 'Public',
    label: 'Public',
    description: 'Everyone can see the matchup predictor on match pages.',
  },
  {
    value: 'CaptainsCommissioner',
    label: 'Captains + Commissioner',
    description: 'Only approved captains and commissioners can see matchup predictions.',
  },
  {
    value: 'Commissioner',
    label: 'Commissioner only',
    description: 'Only approved commissioners can see matchup predictions.',
  },
];

export default async function OfficeSettingsPage({searchParams}: OfficeSettingsPageProps) {
  const query = await searchParams;
  const supabase = await createClient();
  const visibility = await getMatchPredictionVisibility(supabase);
  const notice = readParam(query.notice);
  const error = readParam(query.error);

  return (
    <OfficePage sectionId="settings">
      <div className={styles.stack}>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <section className="office-module-frame" aria-labelledby="matchup-predictor-visibility">
          <span>Match pages</span>
          <h2 id="matchup-predictor-visibility">Matchup predictor visibility</h2>
          <p>Choose who can see the Chance of Victory predictor on matchup pages.</p>
          <p className={styles.current}>Current setting: {labelForVisibility(visibility)}</p>

          <form action={updateMatchPredictionVisibility} className={styles.form}>
            {OPTIONS.map((option) => (
              <label className={styles.option} key={option.value}>
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  defaultChecked={visibility === option.value}
                />
                <span>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
              </label>
            ))}

            <div className={styles.actions}>
              <SaveVisibilityButton />
            </div>
          </form>
        </section>
      </div>
    </OfficePage>
  );
}

function labelForVisibility(visibility: MatchPredictionVisibility) {
  return OPTIONS.find((option) => option.value === visibility)?.label ?? 'Public';
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
