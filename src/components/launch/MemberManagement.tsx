import Link from 'next/link';
import type {LaunchPlayer, LaunchProfile, LaunchTeam, PlayerClaim} from '@/domain/launch/LaunchData';
import {
  approveClaim,
  approveProfile,
  assignCaptain,
  linkProfileToPlayer,
  rejectClaim,
  rejectProfile,
  suspendProfile,
} from '@/app/office/players/actions';
import {PlayerRecordSelect} from './PlayerRecordSelect';
import {PendingSubmitButton} from '@/components/forms/PendingSubmitButton';
import styles from './MemberManagement.module.css';

type MemberManagementProps = {
  claims?: PlayerClaim[];
  commissionerProfileId?: string;
  error?: string;
  notice?: string;
  players?: LaunchPlayer[];
  profiles?: LaunchProfile[];
  showDirectory?: boolean;
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
  showDirectory = true,
  showMessages = true,
  teams = [],
}: MemberManagementProps) {
  const pendingClaims = claims.filter((claim) => claim.status === 'Pending');
  const profileIdsWithPendingClaims = new Set(pendingClaims.map((claim) => claim.profileId));
  const captainReadyClaims = pendingClaims.filter((claim) => getClaimTeam(players, teams, claim));
  const approvedProfiles = profiles.filter((profile) => profile.status === 'Approved');
  const captainProfiles = profiles.filter((profile) => profile.role === 'Captain');
  const unlinkedProfiles = profiles.filter((profile) => (
    profile.role !== 'Commissioner'
    && !profile.playerId
    && !profileIdsWithPendingClaims.has(profile.id)
    && profile.status !== 'Rejected'
    && profile.status !== 'Suspended'
  ));

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
        <span>Account requests</span>
        <h2>Needs attention</h2>
        <p>Resolve new or unlinked accounts here. All established players are managed in the player directory below.</p>
      </header>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Pending claims" value={pendingClaims.length} />
        <SummaryCard label="Unlinked accounts" value={unlinkedProfiles.length} />
        {showDirectory ? <SummaryCard label="Captain queue" value={captainReadyClaims.length} /> : null}
        {showDirectory ? <SummaryCard label="Approved members" value={approvedProfiles.length} /> : null}
        {showDirectory ? <SummaryCard label="Captains" value={captainProfiles.length} /> : null}
      </div>

      <section className={styles.panel} aria-labelledby="unlinked-accounts-title">
        <header className={styles.panelHeader}>
          <span className={styles.panelEyebrow}>Commissioner assist</span>
          <h2 id="unlinked-accounts-title">Unlinked accounts</h2>
        </header>
        <div className={styles.claimList}>
          {unlinkedProfiles.length ? unlinkedProfiles.map((profile) => (
            <article className={styles.claimRow} key={profile.id}>
              <div className={styles.memberPrimary}>
                <strong>{profile.displayName}</strong>
                <span className={styles.badge}>{profile.status}</span>
              </div>
              <span className={styles.claimMeta}>{profile.role}</span>
              <span className={styles.muted}>This account exists, but it is not connected to an imported player record.</span>
              <form className={styles.reviewForm} action={linkProfileToPlayer}>
                <input name="profileId" type="hidden" value={profile.id} />
                <label htmlFor={`link-player-${profile.id}`}>Player record</label>
                <PlayerRecordSelect
                  id={`link-player-${profile.id}`}
                  name="playerId"
                  players={players}
                  required
                />
                <label className={styles.checkboxLabel}>
                  <input name="useProfileName" type="checkbox" value="true" defaultChecked />
                  <span>Use account name on player record</span>
                </label>
                <div className={styles.actions}>
                  <button className={styles.primaryButton} type="submit">Link account</button>
                </div>
              </form>
            </article>
          )) : (
            <p className={styles.emptyState}>No unlinked player accounts.</p>
          )}
        </div>
      </section>

      <div className={showDirectory ? styles.grid : styles.singleGrid}>
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
                <span className={styles.muted}>{getClaimRouting(players, teams, claim)}</span>
                <form className={styles.reviewForm} action={approveClaim}>
                  <input name="claimId" type="hidden" value={claim.id} />
                  <label htmlFor={`player-${claim.id}`}>Imported player record</label>
                  <PlayerRecordSelect
                    defaultValue={claim.requestedPlayerId ?? ''}
                    id={`player-${claim.id}`}
                    name="playerId"
                    players={players}
                    required
                  />
                  <div className={styles.actions}>
                    <PendingSubmitButton
                      className={styles.primaryButton}
                      name="reviewIntent"
                      pendingLabel="Approving..."
                      pendingWhen={{name: 'reviewIntent', value: 'approve'}}
                      value="approve"
                    >
                      Approve and link
                    </PendingSubmitButton>
                    <PendingSubmitButton
                      className={styles.secondaryButton}
                      formAction={rejectClaim}
                      name="reviewIntent"
                      pendingLabel="Rejecting..."
                      pendingWhen={{name: 'reviewIntent', value: 'reject'}}
                      value="reject"
                    >
                      Reject
                    </PendingSubmitButton>
                  </div>
                </form>
              </article>
            )) : (
              <p className={styles.emptyState}>No pending player claims.</p>
            )}
          </div>
        </section>

        {showDirectory ? <section className={styles.panel} aria-labelledby="member-directory-title">
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
        </section> : null}
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

function getClaimRouting(players: LaunchPlayer[], teams: LaunchTeam[], claim: PlayerClaim): string {
  const team = getClaimTeam(players, teams, claim);
  if (team) return `Captain confirmation: ${team.name}`;
  if (claim.requestedPlayerId) return 'Commissioner assist needed: selected player has no current team.';
  return 'Commissioner assist needed: no player record selected.';
}

function getClaimTeam(players: LaunchPlayer[], teams: LaunchTeam[], claim: PlayerClaim): LaunchTeam | undefined {
  const player = claim.requestedPlayerId ? players.find((candidate) => candidate.id === claim.requestedPlayerId) : undefined;
  return player?.currentTeamId ? teams.find((team) => team.id === player.currentTeamId) : undefined;
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
