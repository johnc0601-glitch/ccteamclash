'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {approveTeamApplicationsInline, reviewTeamApplicationInline} from './quick-actions';
import styles from './Captain.module.css';

type TeamApplication = {
  id: string;
  displayName: string;
  playerType: string;
  gender: string;
};

type EditableApplication = {
  id: string;
  displayName: string;
  playerType: 'Adult' | 'Junior';
  gender: 'Male' | 'Female' | '';
};

export function CaptainApprovalQueue({applications}: {applications: TeamApplication[]}) {
  const router = useRouter();
  const [queue, setQueue] = useState<EditableApplication[]>(() => applications.map(normalizeApplication));
  const [message, setMessage] = useState<string | null>(null);
  const [bulkPending, startBulkTransition] = useTransition();
  const [, startRefresh] = useTransition();

  if (!queue.length) {
    return <p className={styles.empty}>{message ?? 'No season requests need captain confirmation.'}</p>;
  }

  const readyApplications = queue.filter((application) => application.gender === 'Male' || application.gender === 'Female');
  const needsGenderCount = queue.length - readyApplications.length;

  function updateApplication(applicationId: string, updates: Partial<Pick<EditableApplication, 'gender' | 'playerType'>>) {
    setQueue((current) => current.map((application) => (
      application.id === applicationId ? {...application, ...updates} : application
    )));
  }

  function finish(applicationId: string, displayName: string, status: 'Approved' | 'Rejected') {
    const wasLast = queue.length === 1;
    setQueue((current) => current.filter((application) => application.id !== applicationId));
    setMessage(status === 'Approved' ? `${displayName} approved.` : `${displayName} rejected.`);
    if (wasLast) startRefresh(() => router.refresh());
  }

  function approveAllReady() {
    if (!readyApplications.length || bulkPending) return;
    setMessage(null);

    startBulkTransition(async () => {
      const result = await approveTeamApplicationsInline(readyApplications.map((application) => ({
        applicationId: application.id,
        gender: application.gender as 'Male' | 'Female',
        playerType: application.playerType,
      })));

      const approvedIds = new Set(result.approvedIds);
      if (approvedIds.size) {
        setQueue((current) => current.filter((application) => !approvedIds.has(application.id)));
      }

      if (result.errors.length) {
        setMessage(`${result.approvedIds.length} approved. ${result.errors.length} still need attention.`);
      } else {
        setMessage(`${result.approvedIds.length} player${result.approvedIds.length === 1 ? '' : 's'} approved.`);
      }

      startRefresh(() => router.refresh());
    });
  }

  return (
    <div className={styles.approvalQueue}>
      <div className={styles.approvalToolbar}>
        <div>
          <strong>{queue.length} pending</strong>
          <span>
            {readyApplications.length} ready{needsGenderCount ? ` · ${needsGenderCount} need Male / Female` : ''}
          </span>
        </div>
        <button
          className={styles.primaryButton}
          type="button"
          onClick={approveAllReady}
          disabled={!readyApplications.length || bulkPending}
        >
          {bulkPending ? 'Approving…' : `Approve ${readyApplications.length} ready`}
        </button>
      </div>

      {message ? <p className={styles.approvalStatus}>{message}</p> : null}

      <div className={styles.list}>
        {queue.map((application) => (
          <ApprovalRow
            key={application.id}
            application={application}
            onChange={updateApplication}
            onDone={finish}
            disabled={bulkPending}
          />
        ))}
      </div>
    </div>
  );
}

function ApprovalRow({
  application,
  onChange,
  onDone,
  disabled,
}: {
  application: EditableApplication;
  onChange: (id: string, updates: Partial<Pick<EditableApplication, 'gender' | 'playerType'>>) => void;
  onDone: (id: string, name: string, status: 'Approved' | 'Rejected') => void;
  disabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || disabled;

  function approve() {
    if (!application.gender) {
      setError('Choose Male or Female first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reviewTeamApplicationInline({
        applicationId: application.id,
        status: 'Approved',
        gender: application.gender,
        playerType: application.playerType,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone(application.id, application.displayName, 'Approved');
    });
  }

  function reject() {
    if (!window.confirm(`Reject ${application.displayName}'s season request?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await reviewTeamApplicationInline({applicationId: application.id, status: 'Rejected'});
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone(application.id, application.displayName, 'Rejected');
    });
  }

  return (
    <article className={styles.approvalRow}>
      <div className={styles.approvalName}>
        <strong>{application.displayName}</strong>
        <span>{application.playerType}</span>
      </div>

      <div className={styles.approvalControls}>
        <label>
          <span>Male / Female</span>
          <select
            value={application.gender}
            onChange={(event) => onChange(application.id, {gender: event.target.value as 'Male' | 'Female' | ''})}
            disabled={busy}
          >
            <option value="">Choose</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <label className={styles.approvalCheck}>
          <input
            type="checkbox"
            checked={application.playerType === 'Junior'}
            onChange={(event) => onChange(application.id, {playerType: event.target.checked ? 'Junior' : 'Adult'})}
            disabled={busy}
          />
          <span>Junior</span>
        </label>
      </div>

      <div className={styles.approvalActions}>
        <button className={styles.primaryButton} type="button" onClick={approve} disabled={busy}>
          {pending ? 'Saving…' : 'Approve'}
        </button>
        <button type="button" onClick={reject} disabled={busy}>Reject</button>
      </div>

      {error ? <p className={styles.approvalError}>{error}</p> : null}
    </article>
  );
}

function normalizeApplication(application: TeamApplication): EditableApplication {
  return {
    id: application.id,
    displayName: application.displayName,
    gender: application.gender === 'Male' || application.gender === 'Female' ? application.gender : '',
    playerType: application.playerType === 'Junior' ? 'Junior' : 'Adult',
  };
}
