'use client';

import {useEffect, useState} from 'react';
import type {
  Season,
  SeasonFieldErrors,
  SeasonInput,
  SeasonStatusFilter,
  SeasonViewMode,
} from '@/domain/season/Season';
import {seasonService} from '@/domain/season/seasonServiceInstance';
import {ConfirmationDialog} from '@/components/teams/ConfirmationDialog';
import {SeasonCard} from '@/components/seasons/SeasonCard';
import {SeasonDetailsDialog} from '@/components/seasons/SeasonDetailsDialog';
import {SeasonFormDialog} from '@/components/seasons/SeasonFormDialog';
import {SeasonRow} from '@/components/seasons/SeasonRow';
import {SeasonToolbar} from '@/components/seasons/SeasonToolbar';
import styles from './SeasonManagement.module.css';

type EditorState =
  | {mode: 'create'}
  | {mode: 'edit'; season: Season}
  | null;

type ConfirmationState = {
  action: 'archive' | 'delete';
  season: Season;
} | null;

export function SeasonManagement() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SeasonStatusFilter>('all');
  const [view, setView] = useState<SeasonViewMode>('table');
  const [editor, setEditor] = useState<EditorState>(null);
  const [detailsSeason, setDetailsSeason] = useState<Season | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [fieldErrors, setFieldErrors] = useState<SeasonFieldErrors>({});
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    seasonService.getAll({search, status})
      .then((nextSeasons) => {
        if (cancelled) return;
        setSeasons(nextSeasons);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessage({type: 'error', text: 'Seasons could not be loaded.'});
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [revision, search, status]);

  function openCreateDialog() {
    setFieldErrors({});
    setMessage(null);
    setEditor({mode: 'create'});
  }

  function openEditDialog(season: Season) {
    setFieldErrors({});
    setMessage(null);
    setDetailsSeason(null);
    setEditor({mode: 'edit', season});
  }

  async function handleFormSubmit(values: SeasonInput) {
    if (!editor) return;

    setSubmitting(true);
    const result = editor.mode === 'create'
      ? await seasonService.create(values)
      : await seasonService.update(editor.season.id, values);
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage({type: 'error', text: result.message});
      return;
    }

    setEditor(null);
    setFieldErrors({});
    setMessage({
      type: 'success',
      text: editor.mode === 'create' ? 'Season created.' : 'Season updated.',
    });
    setRevision((current) => current + 1);
  }

  async function handleImmediateAction(action: 'activate' | 'duplicate', season: Season) {
    setProcessingId(season.id);
    const result = action === 'activate'
      ? await seasonService.activate(season.id)
      : await seasonService.duplicate(season.id);
    setProcessingId(null);

    if (!result.ok) {
      setMessage({type: 'error', text: result.message});
      return;
    }

    setMessage({
      type: 'success',
      text: action === 'activate'
        ? `${result.data.name} is now the active season.`
        : `${result.data.name} created as a draft.`,
    });
    setDetailsSeason(null);
    setRevision((current) => current + 1);
  }

  async function handleConfirmedAction() {
    if (!confirmation) return;

    setSubmitting(true);
    const result = confirmation.action === 'archive'
      ? await seasonService.archive(confirmation.season.id)
      : await seasonService.delete(confirmation.season.id);
    setSubmitting(false);

    if (!result.ok) {
      setMessage({type: 'error', text: result.message});
      setConfirmation(null);
      return;
    }

    setMessage({
      type: 'success',
      text: confirmation.action === 'archive' ? 'Season archived.' : 'Season deleted.',
    });
    setConfirmation(null);
    setDetailsSeason(null);
    setRevision((current) => current + 1);
  }

  const actionProps = {
    onView: setDetailsSeason,
    onEdit: openEditDialog,
    onArchive: (season: Season) => setConfirmation({action: 'archive', season}),
    onDuplicate: (season: Season) => handleImmediateAction('duplicate', season),
    onActivate: (season: Season) => handleImmediateAction('activate', season),
    onDelete: (season: Season) => setConfirmation({action: 'delete', season}),
  };

  return (
    <section className={styles.management}>
      <SeasonToolbar
        search={search}
        status={status}
        view={view}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onViewChange={setView}
        onCreate={openCreateDialog}
      />

      {message ? (
        <div
          className={message.type === 'success' ? styles.successMessage : styles.errorMessage}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      ) : null}

      <div className={styles.listHeader}>
        <div>
          <span>Season list</span>
          <h2>{seasons.length} {seasons.length === 1 ? 'season' : 'seasons'}</h2>
        </div>
        <p>Showing {status === 'all' ? 'all seasons' : status}</p>
      </div>

      {loading ? <div className={styles.loadingState}>Loading seasons...</div> : null}

      {!loading && seasons.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No seasons found</h3>
          <p>Adjust the current search or status filter.</p>
        </div>
      ) : null}

      {!loading && seasons.length > 0 && view === 'table' ? (
        <div className={styles.tableWrap}>
          <table className={styles.seasonTable}>
            <thead>
              <tr>
                <th>Season</th>
                <th>Year</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <SeasonRow
                  key={season.id}
                  season={season}
                  disabled={processingId === season.id}
                  {...actionProps}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && seasons.length > 0 && view === 'cards' ? (
        <div className={styles.cardGrid}>
          {seasons.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              disabled={processingId === season.id}
              {...actionProps}
            />
          ))}
        </div>
      ) : null}

      {editor ? (
        <SeasonFormDialog
          season={editor.mode === 'edit' ? editor.season : undefined}
          fieldErrors={fieldErrors}
          submitting={submitting}
          onSubmit={handleFormSubmit}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {detailsSeason ? (
        <SeasonDetailsDialog
          season={detailsSeason}
          onEdit={openEditDialog}
          onClose={() => setDetailsSeason(null)}
        />
      ) : null}

      {confirmation ? (
        <ConfirmationDialog
          title={confirmation.action === 'archive' ? 'Archive season?' : 'Delete season?'}
          message={confirmation.action === 'archive'
            ? `${confirmation.season.name} will be archived and deactivated.`
            : `${confirmation.season.name} will be permanently removed from the repository.`}
          confirmLabel={confirmation.action === 'archive' ? 'Archive season' : 'Delete season'}
          destructive={confirmation.action === 'delete'}
          submitting={submitting}
          onConfirm={handleConfirmedAction}
          onClose={() => setConfirmation(null)}
        />
      ) : null}
    </section>
  );
}
