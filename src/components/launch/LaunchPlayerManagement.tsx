import type {LaunchPlayer, LaunchTeam} from '@/domain/launch/LaunchData';
import {savePlayer} from '@/app/office/players/actions';
import styles from './LaunchPlayerManagement.module.css';

type LaunchPlayerManagementProps = {
  error?: string;
  notice?: string;
  players?: LaunchPlayer[];
  teams?: LaunchTeam[];
};

export function LaunchPlayerManagement({
  error,
  notice,
  players = [],
  teams = [],
}: LaunchPlayerManagementProps) {
  const activePlayers = players.filter((player) => player.active);
  const assignedPlayers = players.filter((player) => player.currentTeamId);

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
          <div className={styles.playerList}>
            {players.length ? players.map((player) => (
              <article className={styles.playerRow} key={player.id}>
                <div className={styles.playerPrimary}>
                  <div>
                    <strong>{player.name}</strong>
                    <span>{getPlayerMeta(player)}</span>
                  </div>
                  <span className={player.active ? styles.activeBadge : styles.inactiveBadge}>
                    {player.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className={styles.muted}>Team: {getTeamName(teams, player.currentTeamId)}</p>
                <details className={styles.editBox}>
                  <summary>Edit player</summary>
                  <PlayerForm player={player} teams={teams} />
                </details>
              </article>
            )) : (
              <p className={styles.emptyState}>No player records yet.</p>
            )}
          </div>
        </section>
      </div>
    </section>
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
