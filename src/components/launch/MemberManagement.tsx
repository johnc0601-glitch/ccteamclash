import Link from 'next/link';
import type {LaunchPlayer, LaunchProfile, LaunchTeam, PlayerClaim} from '@/domain/launch/LaunchData';
import {
  approveClaim,
  approveProfile,
  assignCaptain,
  rejectClaim,
  rejectProfile,
  suspendProfile,
} from '@/app/office/players/actions';
import styles from './MemberManagement.module.css';

type MemberManagementProps = {
  claims?: PlayerClaim[];
  commissionerProfileId?: string;
  error?: string;
  notice?: string;
  players?: LaunchPlayer[];
  profiles?: LaunchProfile[];
  showMessages?: boolean;
  teams?: LaunchTeam[];
};

export function MemberManagement({
  claims = [],
  commissionerProfileId,
  error,
  notice,
  players = [],
  profiles = [],
  showMessages = true,
  teams = [],
}: MemberManagementProps) {
  const pendingClaims = claims.filter((claim) => claim.status === 'Pending');
  const approvedProfiles = profiles.filter((profile) => profile.status === 'Approved');
  const captainProfiles = profiles.filter((profile) => profile.role === 'Captain');

  return (
    <section className={styles.management} aria-label="League account workflow">
      {showMessages && notice ? <p className={styles.notice}>{notice}</p> : null}
      {showMessages && error ? (
        <div className={styles.error}>
          <p>{error}</p>
          {error.includes('Sign in') ? <Link href="/account">Open account sign in</Link> : null}
        </div>
      ) : null}

      <header className={styles.sectionIntro}>
        <span>League accounts</span>
        <h2>Claims and access</h2>
        <p>Approve account requests, connect accounts to player records, and assign captain team access.</p>
      </header>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Pending claims" value={pendingClaims.length} />
        <SummaryCard label="Approved members" value={approvedProfiles.length} />
        <SummaryCard label="Captains" value={captainProfiles.length} />
        <SummaryCard label="Suspended" value={profiles.filter((profile) => profile.status === 'Suspended').length} />
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
                <div className={styles.memberPrimary}>
                  <strong>{claim.submittedName}</strong>
                  <span className={styles.badge}>{claim.status}</span>
                </div>
                <span className={styles.claimMeta}>{getClaimMeta(claim)}</span>
                <span className={styles.muted}>{getProfileName(profiles, claim.profileId)} submitted this claim.</span>
                <form className={styles.reviewForm} action={approveClaim}>
                  <input name="claimId" type="hidden" value={claim.id} />
                  <label htmlFor={`player-${claim.id}`}>Imported player record</label>
                  <select id={`player-${claim.id}`} name="playerId" defaultValue={claim.requestedPlayerId ?? ''} required>
                    <option value="">Select player</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}{player.pdgaNumber ? ` - PDGA ${player.pdgaNumber}` : ''}
                      </option>
                    ))}
                  </select>
                  <div className={styles.actions}>
                    <button className={styles.primaryButton} type="submit">Approve and link</button>
                    <button className={styles.secondaryButton} formAction={rejectClaim} type="submit">Reject</button>
                  </div>
                </form>
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
            {profiles.length ? profiles.map((profile) => (
              <article className={styles.memberRow} key={profile.id}>
                <div className={styles.memberPrimary}>
                  <strong>{profile.displayName}</strong>
                  <span className={styles.badge}>{profile.status}</span>
                </div>
                <span className={styles.memberMeta}>{profile.role}{profile.id === commissionerProfileId ? ' - You' : ''}</span>
                <span className={styles.muted}>
                  {getPlayerSummary(players, profile.playerId)}
                </span>
                <span className={styles.muted}>{getTeamSummary(teams, profile.captainTeamId)}</span>
                {profile.status === 'Approved' && profile.id !== commissionerProfileId ? (
                  <CaptainAssignment profile={profile} teams={teams} />
                ) : null}
                <div className={styles.actions}>
                  {profile.status !== 'Approved' ? (
                    <ProfileAction action={approveProfile} label="Approve" profileId={profile.id} />
                  ) : null}
                  {profile.status !== 'Rejected' ? (
                    <ProfileAction action={rejectProfile} label="Reject" profileId={profile.id} secondary />
                  ) : null}
                  {profile.status !== 'Suspended' && profile.id !== commissionerProfileId ? (
                    <ProfileAction action={suspendProfile} label="Suspend" profileId={profile.id} secondary />
                  ) : null}
                </div>
              </article>
            )) : (
              <p className={styles.emptyState}>No league profiles yet.</p>
            )}
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

function CaptainAssignment({profile, teams}: {profile: LaunchProfile; teams: LaunchTeam[]}) {
  return (
    <form className={styles.captainForm} action={assignCaptain}>
      <input name="profileId" type="hidden" value={profile.id} />
      <label htmlFor={`captain-team-${profile.id}`}>Captain access</label>
      <div>
        <select id={`captain-team-${profile.id}`} name="teamId" defaultValue={profile.captainTeamId ?? ''}>
          <option value="">Player only</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
        <button className={styles.primaryButton} type="submit">Save</button>
      </div>
    </form>
  );
}

function ProfileAction({
  action,
  label,
  profileId,
  secondary = false,
}: {
  action: (formData: FormData) => Promise<void>;
  label: string;
  profileId: string;
  secondary?: boolean;
}) {
  return (
    <form action={action}>
      <input name="profileId" type="hidden" value={profileId} />
      <button className={secondary ? styles.secondaryButton : styles.primaryButton} type="submit">{label}</button>
    </form>
  );
}

function getClaimMeta(claim: PlayerClaim): string {
  return claim.submittedPdgaNumber ? `PDGA #${claim.submittedPdgaNumber}` : 'No PDGA number submitted';
}

function getProfileName(profiles: LaunchProfile[], profileId: string): string {
  return profiles.find((profile) => profile.id === profileId)?.displayName ?? 'A league member';
}

function getPlayerSummary(players: LaunchPlayer[], playerId: string | null): string {
  const player = players.find((candidate) => candidate.id === playerId);
  if (!player) return 'No player record linked';
  return `Linked player: ${player.name}`;
}

function getTeamSummary(teams: LaunchTeam[], captainTeamId: string | null): string {
  const team = teams.find((candidate) => candidate.id === captainTeamId);
  if (!team) return 'No captain team assigned';
  return `Captain team: ${team.name}`;
}
