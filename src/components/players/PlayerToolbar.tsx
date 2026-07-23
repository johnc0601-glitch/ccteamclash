import {SearchBar} from '@/components/teams/SearchBar';
import type {Team} from '@/models/Team';
import type {PlayerSortOption, PlayerStatusFilter, PlayerViewMode} from '@/types/player';
import styles from './PlayerManagement.module.css';

type PlayerToolbarProps = {
  search: string;
  teamId: string;
  status: PlayerStatusFilter;
  sort: PlayerSortOption;
  view: PlayerViewMode;
  teams: Team[];
  onSearchChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onStatusChange: (value: PlayerStatusFilter) => void;
  onSortChange: (value: PlayerSortOption) => void;
  onViewChange: (value: PlayerViewMode) => void;
  onCreate: () => void;
};

export function PlayerToolbar({
  search,
  teamId,
  status,
  sort,
  view,
  teams,
  onSearchChange,
  onTeamChange,
  onStatusChange,
  onSortChange,
  onViewChange,
  onCreate,
}: PlayerToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Player list controls">
      <SearchBar value={search} onChange={onSearchChange} label="Search players" placeholder="Search name, team, PDGA, rating" />
      <div className={styles.toolbarControls}>
        <label className={styles.selectControl}>
          <span>Team</span>
          <select value={teamId} onChange={(event) => onTeamChange(event.target.value)}>
            <option value="all">All teams</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label className={styles.selectControl}>
          <span>Status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value as PlayerStatusFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className={styles.selectControl}>
          <span>Sort</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value as PlayerSortOption)}>
            <option value="alphabetical">Alphabetical</option>
            <option value="recently-updated">Recently updated</option>
            <option value="team">Team</option>
            <option value="rating">Rating</option>
            <option value="status">Status</option>
          </select>
        </label>
        <div className={styles.viewToggle} role="group" aria-label="Player list view">
          <button
            type="button"
            className={view === 'table' ? styles.viewActive : undefined}
            aria-pressed={view === 'table'}
            onClick={() => onViewChange('table')}
          >
            Table
          </button>
          <button
            type="button"
            className={view === 'cards' ? styles.viewActive : undefined}
            aria-pressed={view === 'cards'}
            onClick={() => onViewChange('cards')}
          >
            Cards
          </button>
        </div>
        <button type="button" className={styles.createButton} onClick={onCreate}>
          Add player
        </button>
      </div>
    </section>
  );
}
