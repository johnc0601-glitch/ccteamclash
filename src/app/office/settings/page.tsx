import {OfficePage} from '@/components/commissioner/OfficePage';
import {createClient} from '@/lib/supabase/server';
import {grantClashPulseReader, revokeClashPulseReader} from './actions';
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
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{data: profiles}, {data: grants, error: grantError}] = await Promise.all([
    supabase.from('launch_profiles').select('id,display_name,role,status').order('display_name'),
    (supabase as any).from('clash_pulse_readers').select('profile_id,granted_at').order('granted_at'),
  ]);
  const readers = (grants ?? []) as {profile_id: string; granted_at: string}[];
  const accountNames = new Map((profiles ?? []).map(p => [p.id, p.display_name || p.id]));
  const granted = new Set(readers.map(r => r.profile_id));
  const eligible = (profiles ?? []).filter(p =>
    p.status === 'Approved' && p.role !== 'Commissioner' && !granted.has(p.id)
  );

  return (
    <OfficePage sectionId="settings">
      <div className={styles.stack}>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <section className="office-module-frame" aria-labelledby="pulse-reader-access">
          <span>Clash Pulse</span>
          <h2 id="pulse-reader-access">Research reader access</h2>
          <p>Give selected approved accounts read-only access to the full Clash Pulse fact library. Readers get a Clash Pulse main-menu link, but cannot edit or publish facts and do not gain Office access.</p>
          {grantError ? <p className={styles.error}>Reader grants are not available until the Clash Pulse access migration is installed.</p> : (
            <>
              <form className={styles.form} action={grantClashPulseReader}>
                <label htmlFor="pulse-reader-profile">Approved member account</label>
                <select id="pulse-reader-profile" name="profileId" defaultValue="" required disabled={!eligible.length}>
                  <option value="" disabled>Select an account</option>
                  {eligible.map(p => <option key={p.id} value={p.id}>{p.display_name || p.id}</option>)}
                </select>
                <div className={styles.actions}><button className={styles.saveButton} disabled={!eligible.length}>Grant read-only access</button></div>
              </form>
              <h3>Approved readers ({readers.length})</h3>
              {readers.length ? readers.map(r => (
                <div key={r.profile_id} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12}}>
                  <span>{accountNames.get(r.profile_id) ?? 'Unknown account'}</span>
                  <form action={revokeClashPulseReader}>
                    <input type="hidden" name="profileId" value={r.profile_id} />
                    <button type="submit">Revoke access</button>
                  </form>
                </div>
              )) : <p>No additional readers have been granted access. Commissioners already have access.</p>}
            </>
          )}
        </section>

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
