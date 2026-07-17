import type {ImportHistory} from '@/domain/import/ImportHistory';
import {StatusBadge} from '@/components/imports/StatusBadge';
import {formatImportDate} from '@/components/imports/importDisplay';
import styles from './ImportManagement.module.css';

type ImportHistoryTableProps = {
  history: ImportHistory[];
};

export function ImportHistoryTable({history}: ImportHistoryTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.historyTable}>
        <thead>
          <tr>
            <th>Recorded</th>
            <th>File</th>
            <th>Action</th>
            <th>Status</th>
            <th>Imported by</th>
            <th>Issues</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record) => (
            <tr key={record.id}>
              <td>{formatImportDate(record.recordedAt)}</td>
              <td>
                <strong>{record.filename}</strong>
                <span className={styles.rowDescription}>{record.summary.challengeLabel}</span>
              </td>
              <td>{record.action}</td>
              <td><StatusBadge status={record.status} /></td>
              <td>{record.importedBy}</td>
              <td>{record.errors.length} errors / {record.warnings.length} warnings</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

