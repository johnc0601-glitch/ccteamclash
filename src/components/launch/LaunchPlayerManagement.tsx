'use client';

import {useMemo, useState} from 'react';
import type {LaunchPlayer, LaunchProfile, LaunchTeam} from '@/domain/launch/LaunchData';
import {
  approveProfile,
  assignAccess,
  deleteAccount,
  rejectProfile,
  savePlayer,
  suspendProfile,
} from '@/app/office/players/actions';
import styles from './LaunchPlayerManagement.module.css';

type LaunchPlayerManagementProps = {
  error?: string;
  notice?: string;
  players?: LaunchPlayer[];
  profiles?: LaunchProfile[];
  commissionerProfileId?: string;
  teams?: LaunchTeam[];
};

export function LaunchPlayerManagement({
  error,
  notice,
  players = [],
  profiles = [],
  commissionerProfileId,
  teams = [],
}: LaunchPlayerManagementProps) {
  const [search, setSearch] = useState('');
  const activePlayers = players.filter((player) => player.active);
  const assignedPlayers = players.filter((player) => player.currentTeamId);
  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return players;
    return players.filter((player) => {
      const searchable = [
        player.name,
        player.pdgaNumber,
        player.pdgaRating,
        getTeamName(teams, player.currentTeamId),
        player.gender,
        getLinkedProfile(profiles, player.id)?.displayName,
        getLinkedProfile(profiles, player.id)?.status,
      ].join(' ').toLowerCase();
      return searchable.includes(query);
    });
  }, [players, profiles, search, teams]);

  return (
    <section className={styles.management} aria-label="Player control">
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.summaryGrid}>
        <SummaryCard label="Players" value={players.length} />
        <SummaryCard label="Active" value={activePlayers.length} />
        <SummaryCard label="Assigned" value={assignedPlayers.length} />
        <SummaryCard label="Inactive" value={players.length - activePlayers.length} />
      </div>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="add-player-title">
          <header className={styles.panelHeader}>
            <span>Manual entry</span>
            <h2 id="add-player-title">Add player</h2>
            <p>Create a player record even when that person does not have an account.</p>
          </header>
          <PlayerForm teams={teams} />
        </section>

        <section className={styles.panel} aria-labelledby="player-directory-title">
          <header className={styles.panelHeader}>
            <span>Directory</span>
            <h2 id="player-directory-title">Player records</h2>
            <p>Assign teams, update ratings, and mark roster availability.</p>
          </header>
          <div className={styles.searchBox}>
            <label htmlFor="playerDirectorySearch">Search players</label>
            <input
              id="playerDirectorySearch"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, team, PDGA, rating"
              type="search"
              value={search}
            />
          </div>
          <div className={styles.playerList}>
            {visiblePlayers.length ? visiblePlayers.map((player) => (
              <article className={styles.playerRow} key={player.id}>
                {(() => {
                  const profile = getLinkedProfile(profiles, player.id);
                  return (
                    <>
                <div className={styles.playerPrimary}>
                  <div>
                    <strong>{player.name}</strong>
                    <span>{getPlayerMeta(player)}</span>
                  </div>
                  <div className={styles.badges}>
                    <label className={styles.memberCheck}>
                      <input checked={Boolean(profile)} disabled type="checkbox" />
                      <span>Member</span>
                    </label>
                    <span className={player.active ? styles.activeBadge : styles.inactiveBadge}>
                      {player.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <p className={styles.muted}>Team: {getTeamName(teams, player.currentTeamId)}</p>
                <details className={styles.editBox}>
                  <summary>Edit player</summary>
                  <PlayerForm player={player} teams={teams} />
                  {profile ? (
                    <AccountAccess
                      commissionerProfileId={commissionerProfileId}
                      profile={profile}
                      teams={teams}
                    />
                  ) : (
                    <p className={styles.accountNote}>No website account is linked to this player.</p>
                  )}
                </details>
                    </>
                  );
                })()}
              </article>
            )) : (
              <p className={styles.emptyState}>{players.length ? 'No matching players.' : 'No player records yet.'}</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function AccountAccess({
  commissionerProfileId,
  profile,
  teams,
}: {
  commissionerProfileId?: string;
  profile: LaunchProfile;
  teams: LaunchTeam[];
}) {
  return (
    <section className={styles.accountAccess}>
      <div>
        <strong>Member account</strong>
        <span>{profile.status} / {profile.role}</span>
      </div>
      {profile.status === 'Approved' && profile.id !== commissionerProfileId ? (
        <form className={styles.captainForm} action={assignAccess}>
          <input name="profileId" type="hidden" value={profile.id} />
          <label>
            <span>Access</span>
            <select
              name="access"
              defaultValue={profile.role === 'Commissioner'
                ? 'commissioner'
                : profile.captainTeamId
                  ? `captain:${profile.captainTeamId}`
                  : 'player'}
            >
              <option value="player">Player only</option>
              {teams.map((team) => (
                <option key={team.id} value={`captain:${team.id}`}>Captain: {team.name}</option>
              ))}
              <option value="commissioner">Commissioner</option>
            </select>
          </label>
          <button className={styles.primaryButton} type="submit">Save access</button>
        </form>
      ) : null}
      <div className={styles.accountActions}>
        {profile.status !== 'Approved' ? <ProfileAction action={approveProfile} label="Approve member" profileId={profile.id} /> : null}
        {profile.status !== 'Rejected' ? <ProfileAction action={rejectProfile} label="Reject" profileId={profile.id} secondary /> : null}
        {profile.status !== 'Suspended' && profile.id !== commissionerProfileId ? (
          <ProfileAction action={suspendProfile} label="Suspend" profileId={profile.id} secondary />
        ) : null}
        {profile.id !== commissionerProfileId ? (
          <ProfileAction action={deleteAccount} label="Delete account" profileId={profile.id} secondary />
        ) : null}
      </div>
      {profile.id !== commissionerProfileId ? (
        <p className={styles.accountNote}>Delete account removes the website login and unlinks it from the player. Historical player records remain intact.</p>
      ) : null}
    </section>
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

function PlayerForm({player, teams}: {player?: LaunchPlayer; teams: LaunchTeam[]}) {
  return (
    <form className={styles.form} action={savePlayer}>
      <input name="playerId" type="hidden" value={player?.id ?? ''} />
      <label>
        <span>Name</span>
        <input name="name" defaultValue={player?.name ?? ''} required />
      </label>
      <div className={styles.formGrid}>
        <label>
          <span>Gender</span>
          <select name="gender" defaultValue={player?.gender ?? 'Unknown'}>
            <option value="Unknown">Unknown</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="active" defaultValue={String(player?.active ?? true)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
      </div>
      <div className={styles.formGrid}>
        <label>
          <span>PDGA number</span>
          <input name="pdgaNumber" defaultValue={player?.pdgaNumber ?? ''} inputMode="numeric" />
        </label>
        <label>
          <span>Rating</span>
          <input name="pdgaRating" defaultValue={player?.pdgaRating ?? ''} inputMode="numeric" />
        </label>
      </div>
      <label>
        <span>Team</span>
        <select name="currentTeamId" defaultValue={player?.currentTeamId ?? ''}>
          <option value="">Unassigned</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </label>
      <button className={styles.primaryButton} type="submit">{player ? 'Save player' : 'Add player'}</button>
    </form>
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

function getPlayerMeta(player: LaunchPlayer): string {
  const pieces = [
    player.gender,
    player.pdgaNumber ? `PDGA ${player.pdgaNumber}` : 'No PDGA',
    player.pdgaRating ? `Rating ${player.pdgaRating}` : 'No rating',
  ];
  return pieces.join(' / ');
}

function getTeamName(teams: LaunchTeam[], teamId: string | null): string {
  if (!teamId) return 'Unassigned';
  return teams.find((team) => team.id === teamId)?.name ?? 'Unknown team';
}

function getLinkedProfile(profiles: LaunchProfile[], playerId: string): LaunchProfile | undefined {
  return profiles.find((profile) => profile.playerId === playerId);
}
