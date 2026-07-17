'use client';

import {useEffect, useMemo, useState} from 'react';
import {DialogShell} from '@/components/teams/DialogShell';
import {ImportDetails} from '@/components/imports/ImportDetails';
import {ImportHistoryTable} from '@/components/imports/ImportHistoryTable';
import {ImportTable} from '@/components/imports/ImportTable';
import {ImportToolbar} from '@/components/imports/ImportToolbar';
import {UploadArea} from '@/components/imports/UploadArea';
import {services} from '@/core/ServiceContainer';
import type {ImportHistory} from '@/domain/import/ImportHistory';
import type {
  ImportFieldErrors,
  ImportJob,
  ImportJobInput,
  ImportStatus,
  ImportStatusFilter,
} from '@/domain/import/ImportJob';
import type {ImportPreview, ImportWorkspace} from '@/domain/import/ImportService';
import styles from './ImportManagement.module.css';

type Message = {type: 'success' | 'error'; text: string} | null;

const EMPTY_WORKSPACE: ImportWorkspace = {
  seasons: [],
  teams: [],
  challenges: [],
};

export function ImportManagement() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [workspace, setWorkspace] = useState<ImportWorkspace>(EMPTY_WORKSPACE);
  const [search, setSearch] = useState('');
  const [seasonId, setSeasonId] = useState('all');
  const [status, setStatus] = useState<ImportStatusFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailsJob, setDetailsJob] = useState<ImportJob | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ImportFieldErrors>({});
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const detailsJobId = detailsJob?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadImports() {
      try {
        const [nextWorkspace, nextJobs, nextHistory] = await Promise.all([
          services.imports.getWorkspace(),
          services.imports.getJobs({search, seasonId, status}),
          services.imports.getHistory({search, seasonId, status}),
        ]);
        if (cancelled) return;

        setWorkspace(nextWorkspace);
        setJobs(nextJobs);
        setHistory(nextHistory);

        if (detailsJobId) {
          const previewResult = await services.imports.getPreview(detailsJobId);
          if (cancelled) return;
          if (previewResult.ok) {
            setDetailsJob(previewResult.data.job);
            setPreview(previewResult.data);
          } else {
            setDetailsJob(null);
            setPreview(null);
          }
        }
        setLoading(false);
      } catch {
        if (cancelled) return;
        setMessage({type: 'error', text: 'Import data could not be loaded.'});
        setLoading(false);
      }
    }

    loadImports();
    return () => {
      cancelled = true;
    };
  }, [detailsJobId, revision, search, seasonId, status]);

  const dashboard = useMemo(() => {
    const byStatus = jobs.reduce<Record<ImportStatus, number>>((counts, job) => ({
      ...counts,
      [job.status]: counts[job.status] + 1,
    }), {
      Pending: 0,
      Validating: 0,
      Ready: 0,
      Applied: 0,
      Failed: 0,
      Cancelled: 0,
    });

    return {
      total: jobs.length,
      ready: byStatus.Ready,
      applied: byStatus.Applied,
      failed: byStatus.Failed,
      byStatus,
    };
  }, [jobs]);

  function refresh(successText: string) {
    setMessage({type: 'success', text: successText});
    setRevision((current) => current + 1);
  }

  async function openDetails(job: ImportJob) {
    const previewResult = await services.imports.getPreview(job.id);
    if (!previewResult.ok) {
      setMessage({type: 'error', text: previewResult.message});
      return;
    }

    setDetailsJob(previewResult.data.job);
    setPreview(previewResult.data);
  }

  async function handleUpload(values: ImportJobInput) {
    setSubmitting(true);
    const result = await services.imports.createJob(values);
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage({type: 'error', text: result.message});
      return;
    }

    setFieldErrors({});
    setUploadOpen(false);
    setDetailsJob(result.data);
    setPreview(null);
    refresh('Import job created. Validate it before applying official results.');
  }

  async function handleValidate(job: ImportJob) {
    setProcessingId(job.id);
    const result = await services.imports.validateJob(job.id);
    setProcessingId(null);

    if (!result.ok) {
      setMessage({type: 'error', text: result.message});
      return;
    }

    setDetailsJob(result.data);
    const previewResult = await services.imports.getPreview(result.data.id);
    if (previewResult.ok) setPreview(previewResult.data);
    refresh(result.data.status === 'Ready'
      ? 'Import validated and ready for preview.'
      : 'Import validation failed. Review the errors before retrying.');
  }

  async function handleApply(job: ImportJob) {
    setProcessingId(job.id);
    const result = await services.imports.applyJob(job.id);
    setProcessingId(null);

    if (!result.ok) {
      setMessage({type: 'error', text: result.message});
      return;
    }

    setDetailsJob(result.data);
    const previewResult = await services.imports.getPreview(result.data.id);
    if (previewResult.ok) setPreview(previewResult.data);
    refresh('Import applied and recorded in history.');
  }

  async function handleCancel(job: ImportJob) {
    setProcessingId(job.id);
    const result = await services.imports.cancelJob(job.id);
    setProcessingId(null);

    if (!result.ok) {
      setMessage({type: 'error', text: result.message});
      return;
    }

    setDetailsJob(result.data);
    const previewResult = await services.imports.getPreview(result.data.id);
    if (previewResult.ok) setPreview(previewResult.data);
    refresh('Import cancelled and recorded in history.');
  }

  return (
    <section className={styles.management}>
      <ImportToolbar
        search={search}
        seasonId={seasonId}
        status={status}
        seasons={workspace.seasons}
        onSearchChange={setSearch}
        onSeasonChange={setSeasonId}
        onStatusChange={setStatus}
        onUpload={() => {
          setFieldErrors({});
          setMessage(null);
          setUploadOpen(true);
        }}
      />

      {message ? (
        <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      <section className={styles.dashboard} aria-label="Import dashboard">
        <div><span>Total imports</span><strong>{dashboard.total}</strong></div>
        <div><span>Ready</span><strong>{dashboard.ready}</strong></div>
        <div><span>Applied</span><strong>{dashboard.applied}</strong></div>
        <div><span>Failed</span><strong>{dashboard.failed}</strong></div>
      </section>

      <div className={styles.listHeader}>
        <div>
          <span>Import queue</span>
          <h2>{jobs.length} {jobs.length === 1 ? 'import' : 'imports'}</h2>
        </div>
        <p>Official scoring files are validated before any import is applied.</p>
      </div>

      {loading ? <div className={styles.loadingState}>Loading imports...</div> : null}
      {!loading && jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No imports found</h3>
          <p>Adjust the current search or filters.</p>
        </div>
      ) : null}
      {!loading && jobs.length > 0 ? (
        <ImportTable
          jobs={jobs}
          processingId={processingId}
          onView={openDetails}
          onValidate={handleValidate}
          onApply={handleApply}
          onCancel={handleCancel}
        />
      ) : null}

      <section className={styles.historySection} aria-labelledby="import-history-title">
        <div className={styles.listHeader}>
          <div>
            <span>Permanent history</span>
            <h2 id="import-history-title">Import history</h2>
          </div>
          <p>{history.length} history {history.length === 1 ? 'record' : 'records'} in this view</p>
        </div>
        {history.length ? <ImportHistoryTable history={history} /> : <div className={styles.inlineEmpty}>No history records match this view.</div>}
      </section>

      {uploadOpen ? (
        <DialogShell title="Upload import" eyebrow="Official results" onClose={() => setUploadOpen(false)} size="large">
          <UploadArea
            workspace={workspace}
            fieldErrors={fieldErrors}
            submitting={submitting}
            onSubmit={handleUpload}
            onCancel={() => setUploadOpen(false)}
          />
        </DialogShell>
      ) : null}

      {detailsJob ? (
        <ImportDetails
          job={detailsJob}
          preview={preview}
          processing={processingId === detailsJob.id}
          onValidate={handleValidate}
          onApply={handleApply}
          onCancelJob={handleCancel}
          onClose={() => {
            setDetailsJob(null);
            setPreview(null);
          }}
        />
      ) : null}
    </section>
  );
}
