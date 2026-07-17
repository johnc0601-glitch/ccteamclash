import type {ImportPreview as ImportPreviewModel} from '@/domain/import/ImportService';
import {StatusBadge} from '@/components/imports/StatusBadge';
import styles from './ImportManagement.module.css';

type ImportPreviewProps = {
  preview: ImportPreviewModel;
};

export function ImportPreview({preview}: ImportPreviewProps) {
  const {job} = preview;

  return (
    <section className={styles.previewPanel} aria-label="Import preview">
      <header>
        <span>Preview changes</span>
        <h3>{job.summary.challengeLabel}</h3>
      </header>
      <dl className={styles.detailsGrid}>
        <div><dt>Challenge</dt><dd>{job.summary.challengeLabel}</dd></div>
        <div><dt>Season</dt><dd>{job.summary.seasonName}</dd></div>
        <div><dt>Home team</dt><dd>{job.summary.homeTeamName}</dd></div>
        <div><dt>Away team</dt><dd>{job.summary.awayTeamName}</dd></div>
        <div><dt>Import status</dt><dd><StatusBadge status={job.status} /></dd></div>
        <div><dt>Records</dt><dd>{job.summary.recordsFound} found / {job.summary.recordsApplied} applied</dd></div>
      </dl>
      <div className={styles.expectedUpdates}>
        <span>Expected updates</span>
        {preview.expectedUpdates.length ? (
          <ul>
            {preview.expectedUpdates.map((update) => <li key={update}>{update}</li>)}
          </ul>
        ) : <p>No updates are expected for this import state.</p>}
      </div>
    </section>
  );
}

