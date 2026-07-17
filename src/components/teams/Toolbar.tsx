import type {TeamSortOption, TeamStatusFilter, TeamViewMode} from '@/types/team';
import {SearchBar} from '@/components/teams/SearchBar';
import styles from './TeamManagement.module.css';

type ToolbarProps = {
  search: string;
  status: TeamStatusFilter;
  sort: TeamSortOption;
  view: TeamViewMode;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TeamStatusFilter) => void;
  onSortChange: (value: TeamSortOption) => void;
  onViewChange: (value: TeamViewMode) => void;
  onCreate: () => void;
};

export function Toolbar({
  search,
  status,
  sort,
  view,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onViewChange,
  onCreate,
}: ToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Team list controls">
      <SearchBar value={search} onChange={onSearchChange} />
      <div className={styles.toolbarControls}>
        <label className={styles.selectControl}>
          <span>Status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value as TeamStatusFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className={styles.selectControl}>
          <span>Sort</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value as TeamSortOption)}>
            <option value="alphabetical">Alphabetical</option>
            <option value="recently-updated">Recently updated</option>
            <option value="city">City</option>
            <option value="course">Course</option>
            <option value="status">Status</option>
          </select>
        </label>
        <div className={styles.viewToggle} role="group" aria-label="Team list view">
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
          Create team
        </button>
      </div>
    </section>
  );
}
