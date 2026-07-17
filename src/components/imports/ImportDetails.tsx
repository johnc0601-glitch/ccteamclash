import {DialogShell} from '@/components/teams/DialogShell';
import {ImportPreview} from '@/components/imports/ImportPreview';
import {StatusBadge} from '@/components/imports/StatusBadge';
import {ValidationSummary} from '@/components/imports/ValidationSummary';
import {formatImportDate} from '@/components/imports/importDisplay';
import type {ImportJob} from '@/domain/import/ImportJob';
import type {ImportPreview as ImportPreviewModel} from '@/domain/import/ImportService';
import styles from './ImportManagement.module.css';

type ImportDetailsProps = {
  job: ImportJob;
  preview: ImportPreviewModel | null;
  processing: boolean;
  onValidate: (job: ImportJob) => void;
  onApply: (job: ImportJob) => void;
  onCancelJob: (job: ImportJob) => void;
  onClose: () => void;
};

export function ImportDetails({
  job,
  preview,
  processing,
  onValidate,
  onApply,
  onCancelJob,
  onClose,
}: ImportDetailsProps) {
  return (
    <DialogShell title="Import details" eyebrow={job.filename} onClose={onClose} size="large">
      <div className={styles.detailsBody}>
        <header className={styles.detailsHeader}>
          <div>
            <span>{job.source}</span>
            <h3>{job.summary.challengeLabel}</h3>
            <p>Imported by {job.summary.importedBy} on {formatImportDate(job.createdAt)}</p>
          </div>
          <StatusBadge status={job.status} />
        </header>

        <dl className={styles.detailsGrid}>
          <div><dt>Filename</dt><dd>{job.filename}</dd></div>
          <div><dt>Completed</dt><dd>{formatImportDate(job.completedAt)}</dd></div>
          <div><dt>Season</dt><dd>{job.summary.seasonName}</dd></div>
          <div><dt>Source</dt><dd>{job.source}</dd></div>
        </dl>

        <ValidationSummary errors={job.errors} warnings={job.warnings} />

        {preview ? <ImportPreview preview={preview} /> : null}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          {job.status === 'Pending' || job.status === 'Failed' ? (
            <button type="button" className={styles.primaryButton} disabled={processing} onClick={() => onValidate(job)}>
              {processing ? 'Validating...' : 'Validate'}
            </button>
          ) : null}
          {job.status === 'Ready' ? (
            <button type="button" className={styles.primaryButton} disabled={processing} onClick={() => onApply(job)}>
              {processing ? 'Applying...' : 'Apply import'}
            </button>
          ) : null}
          {['Pending', 'Validating', 'Ready', 'Failed'].includes(job.status) ? (
            <button type="button" className={styles.dangerButton} disabled={processing} onClick={() => onCancelJob(job)}>
              Cancel import
            </button>
          ) : null}
        </div>
      </div>
    </DialogShell>
  );
}

