import type {
  SchedulePublicationFilter,
  ScheduleViewMode,
} from '@/domain/schedule/Schedule';
import type {Season} from '@/domain/season/Season';
import {SearchBar} from '@/components/teams/SearchBar';
import styles from './ScheduleManagement.module.css';

type ScheduleToolbarProps = {
  search: string;
  seasonId: string;
  publication: SchedulePublicationFilter;
  view: ScheduleViewMode;
  seasons: Season[];
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onPublicationChange: (value: SchedulePublicationFilter) => void;
  onViewChange: (value: ScheduleViewMode) => void;
  onCreate: () => void;
};

export function ScheduleToolbar({
  search,
  seasonId,
  publication,
  view,
  seasons,
  canCreate,
  onSearchChange,
  onSeasonChange,
  onPublicationChange,
  onViewChange,
  onCreate,
}: ScheduleToolbarProps) {
  return (
    <section className={styles.toolbar} aria-label="Schedule list controls">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        label="Search schedules, rounds, teams, or courses"
        placeholder="Search schedules, rounds, teams, or courses"
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
            value={publication}
            onChange={(event) => onPublicationChange(event.target.value as SchedulePublicationFilter)}
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <div className={styles.viewToggle} role="group" aria-label="Schedule list view">
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
        <button
          type="button"
          className={styles.createButton}
          disabled={!canCreate}
          onClick={onCreate}
        >
          Create schedule
        </button>
      </div>
    </section>
  );
}
