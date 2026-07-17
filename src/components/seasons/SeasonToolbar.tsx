import type {SeasonStatusFilter, SeasonViewMode} from '@/domain/season/Season';
import {SearchBar} from '@/components/teams/SearchBar';
import styles from './SeasonManagement.module.css';

type SeasonToolbarProps = {
  search: string;
  status: SeasonStatusFilter;
  view: SeasonViewMode;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: SeasonStatusFilter) => void;
  onViewChange: (value: SeasonViewMode) => void;
  onCreate: () => void;
};

export function SeasonToolbar({
  search,
  status,
  view,
  onSearchChange,
  onStatusChange,
  onViewChange,
  onCreate,
}: SeasonToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Season list controls">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        label="Search seasons"
        placeholder="Search seasons"
      />
      <div className={styles.toolbarControls}>
        <label className={styles.selectControl}>
          <span>Status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value as SeasonStatusFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className={styles.viewToggle} role="group" aria-label="Season list view">
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
          Create season
        </button>
      </div>
    </section>
  );
}
