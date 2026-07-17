import type {ImportJob} from '@/domain/import/ImportJob';
import {StatusBadge} from '@/components/imports/StatusBadge';
import {formatImportDate} from '@/components/imports/importDisplay';
import styles from './ImportManagement.module.css';

type ImportTableProps = {
  jobs: ImportJob[];
  processingId: string | null;
  onView: (job: ImportJob) => void;
  onValidate: (job: ImportJob) => void;
  onApply: (job: ImportJob) => void;
  onCancel: (job: ImportJob) => void;
};

export function ImportTable({
  jobs,
  processingId,
  onView,
  onValidate,
  onApply,
  onCancel,
}: ImportTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.importTable}>
        <thead>
          <tr>
            <th>File</th>
            <th>Challenge</th>
            <th>Season</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const processing = processingId === job.id;

            return (
              <tr key={job.id}>
                <td>
                  <button type="button" className={styles.nameButton} onClick={() => onView(job)}>
                    {job.filename}
                  </button>
                  <span className={styles.rowDescription}>{job.source}</span>
                </td>
                <td>{job.summary.challengeLabel}</td>
                <td>{job.summary.seasonName}</td>
                <td><StatusBadge status={job.status} /></td>
                <td>{formatImportDate(job.createdAt)}</td>
                <td>
                  <div className={styles.actionRow}>
                    <button type="button" onClick={() => onView(job)}>View</button>
                    {job.status === 'Pending' || job.status === 'Failed' ? (
                      <button type="button" disabled={processing} onClick={() => onValidate(job)}>
                        {processing ? 'Working...' : 'Validate'}
                      </button>
                    ) : null}
                    {job.status === 'Ready' ? (
                      <button type="button" disabled={processing} onClick={() => onApply(job)}>
                        {processing ? 'Working...' : 'Apply'}
                      </button>
                    ) : null}
                    {['Pending', 'Validating', 'Ready', 'Failed'].includes(job.status) ? (
                      <button type="button" disabled={processing} className={styles.dangerText} onClick={() => onCancel(job)}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

