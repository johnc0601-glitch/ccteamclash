import {getLaunchMemberPreview} from '@/domain/launch/LaunchMemberPreview';
import styles from './MemberManagement.module.css';

export function MemberManagement() {
  const preview = getLaunchMemberPreview();
  const pendingClaims = preview.claims.filter((claim) => claim.status === 'Pending');
  const approvedProfiles = preview.profiles.filter((profile) => profile.status === 'Approved');
  const captainProfiles = preview.profiles.filter((profile) => profile.role === 'Captain');

  return (
    <section aria-label="Member workflow">
      <div className={styles.summaryGrid}>
        <SummaryCard label="Pending claims" value={pendingClaims.length} />
        <SummaryCard label="Approved members" value={approvedProfiles.length} />
        <SummaryCard label="Captains" value={captainProfiles.length} />
        <SummaryCard label="Suspended" value={preview.profiles.filter((profile) => profile.status === 'Suspended').length} />
      </div>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="member-claims-title">
          <header className={styles.panelHeader}>
            <span className={styles.panelEyebrow}>Approval queue</span>
            <h2 id="member-claims-title">Player claims</h2>
          </header>
          <div className={styles.claimList}>
            {pendingClaims.length ? pendingClaims.map((claim) => (
              <article className={styles.claimRow} key={claim.id}>
                <span className={styles.badge}>{claim.status}</span>
                <strong>{claim.submittedName}</strong>
                <span className={styles.claimMeta}>
                  {claim.submittedPdgaNumber ? `PDGA #${claim.submittedPdgaNumber}` : 'No PDGA number submitted'}
                </span>
              </article>
            )) : (
              <p className={styles.emptyState}>No pending player claims.</p>
            )}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="member-directory-title">
          <header className={styles.panelHeader}>
            <span className={styles.panelEyebrow}>Access</span>
            <h2 id="member-directory-title">Members</h2>
          </header>
          <div className={styles.memberList}>
            {preview.profiles.map((profile) => (
              <article className={styles.memberRow} key={profile.id}>
                <div className={styles.memberPrimary}>
                  <strong>{profile.displayName}</strong>
                  <span className={styles.badge}>{profile.status}</span>
                </div>
                <span className={styles.memberMeta}>{profile.role}</span>
                <span className={styles.muted}>
                  {profile.captainTeamId ? `Captain team: ${profile.captainTeamId}` : 'No captain team assigned'}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function SummaryCard({label, value}: {label: string; value: number}) {
  return (
    <article className={styles.summaryCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
