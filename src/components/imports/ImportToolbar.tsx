import {SearchBar} from '@/components/teams/SearchBar';
import {IMPORT_STATUSES, type ImportStatusFilter} from '@/domain/import/ImportJob';
import type {Season} from '@/domain/season/Season';
import styles from './ImportManagement.module.css';

type ImportToolbarProps = {
  search: string;
  seasonId: string;
  status: ImportStatusFilter;
  seasons: Season[];
  onSearchChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onStatusChange: (value: ImportStatusFilter) => void;
  onUpload: () => void;
};

export function ImportToolbar({
  search,
  seasonId,
  status,
  seasons,
  onSearchChange,
  onSeasonChange,
  onStatusChange,
  onUpload,
}: ImportToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Import controls">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        label="Search imports"
        placeholder="Search imports, teams, challenges, or filenames"
      />
      <div className={styles.toolbarControls}>
        <label className={styles.selectControl}>
          <span>Season</span>
          <select value={seasonId} onChange={(event) => onSeasonChange(event.target.value)}>
            <option value="all">All seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.selectControl}>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as ImportStatusFilter)}
          >
            <option value="all">All</option>
            {IMPORT_STATUSES.map((importStatus) => (
              <option key={importStatus} value={importStatus}>{importStatus}</option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.createButton} onClick={onUpload}>
          Upload file
        </button>
      </div>
    </section>
  );
}

