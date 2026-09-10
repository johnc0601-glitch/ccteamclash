'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {reviewTeamApplicationInline} from './quick-actions';
import styles from './Captain.module.css';

type TeamApplication = {
  id: string;
  displayName: string;
  playerType: string;
  gender: string;
};

export function CaptainApprovalQueue({applications}: {applications: TeamApplication[]}) {
  const router = useRouter();
  const [queue, setQueue] = useState(applications);
  const [message, setMessage] = useState<string | null>(null);
  const [, startRefresh] = useTransition();

  if (!queue.length) {
    return <p className={styles.empty}>{message ?? 'No season requests need captain confirmation.'}</p>;
  }

  function finish(applicationId: string, displayName: string, status: 'Approved' | 'Rejected') {
    const wasLast = queue.length === 1;
    setQueue((current) => current.filter((application) => application.id !== applicationId));
    setMessage(status === 'Approved' ? `${displayName} approved.` : `${displayName} rejected.`);
    if (wasLast) startRefresh(() => router.refresh());
  }

  return (
    <div className={styles.list}>
      {message ? <p className={styles.approvalStatus}>{message}</p> : null}
      {queue.map((application) => (
        <ApprovalRow key={application.id} application={application} onDone={finish} />
      ))}
    </div>
  );
}

function ApprovalRow({application, onDone}: {application: TeamApplication; onDone: (id: string, name: string, status: 'Approved' | 'Rejected') => void}) {
  const initialGender = application.gender === 'Male' || application.gender === 'Female' ? application.gender : '';
  const [gender, setGender] = useState<'Male' | 'Female' | ''>(initialGender);
  const [isJunior, setIsJunior] = useState(application.playerType === 'Junior');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function approve() {
    if (!gender) {
      setError('Choose Male or Female first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reviewTeamApplicationInline({
        applicationId: application.id,
        status: 'Approved',
        gender,
        playerType: isJunior ? 'Junior' : 'Adult',
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
        <span>{isJunior ? 'Junior' : 'Adult'}</span>
      </div>
      <div className={styles.approvalControls}>
        <label>
          <span>Male / Female</span>
          <select value={gender} onChange={(event) => setGender(event.target.value as 'Male' | 'Female' | '')} disabled={pending}>
            <option value="">Choose</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <label className={styles.approvalCheck}>
          <input type="checkbox" checked={isJunior} onChange={(event) => setIsJunior(event.target.checked)} disabled={pending} />
          <span>Junior</span>
        </label>
      </div>
      <div className={styles.approvalActions}>
        <button className={styles.primaryButton} type="button" onClick={approve} disabled={pending}>{pending ? 'Saving…' : 'Approve'}</button>
        <button type="button" onClick={reject} disabled={pending}>Reject</button>
      </div>
      {error ? <p className={styles.approvalError}>{error}</p> : null}
    </article>
  );
}
