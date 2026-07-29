'use client';

import {useEffect, useState} from 'react';
import type {Course} from '@/domain/course/Course';
import type {Team} from '@/models/Team';
import type {
  TeamFieldErrors,
  TeamInput,
  TeamSortOption,
  TeamStatusFilter,
  TeamViewMode,
} from '@/types/team';
import {ConfirmationDialog} from '@/components/teams/ConfirmationDialog';
import {TeamCard} from '@/components/teams/TeamCard';
import {TeamDetailsDialog} from '@/components/teams/TeamDetailsDialog';
import {TeamFormDialog} from '@/components/teams/TeamFormDialog';
import {TeamRow} from '@/components/teams/TeamRow';
import {Toolbar} from '@/components/teams/Toolbar';
import styles from './TeamManagement.module.css';

type EditorState =
  | {mode: 'create'}
  | {mode: 'edit'; team: Team}
  | null;

type ConfirmationState = {
  action: 'archive' | 'delete';
  team: Team;
} | null;

type TeamApiResponse = {
  teams?: Team[];
  ok?: boolean;
  message?: string;
  fieldErrors?: TeamFieldErrors;
  error?: string;
};

export function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TeamStatusFilter>('all');
  const [sort, setSort] = useState<TeamSortOption>('alphabetical');
  const [view, setView] = useState<TeamViewMode>('table');
  const [editor, setEditor] = useState<EditorState>(null);
  const [detailsTeam, setDetailsTeam] = useState<Team | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [fieldErrors, setFieldErrors] = useState<TeamFieldErrors>({});
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({search, status, sort});
    fetch(`/api/teams?${params.toString()}`, {cache: 'no-store'})
      .then((response) => response.json() as Promise<TeamApiResponse>)
      .then((payload) => {
        if (cancelled) return;
        setTeams(payload.teams ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessage({type: 'error', text: 'Teams could not be loaded.'});
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [revision, search, sort, status]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/courses?status=active', {cache: 'no-store'})
      .then((response) => response.json() as Promise<{courses?: Course[]}>)
      .then((payload) => {
        if (!cancelled) setCourses(payload.courses ?? []);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function openCreateDialog() {
    setFieldErrors({});
    setMessage(null);
    setEditor({mode: 'create'});
  }

  function openEditDialog(team: Team) {
    setFieldErrors({});
    setMessage(null);
    setDetailsTeam(null);
    setEditor({mode: 'edit', team});
  }

  async function handleFormSubmit(values: TeamInput) {
    if (!editor) return;

    setSubmitting(true);
    const result = await saveTeamAction(editor.mode === 'create'
      ? {action: 'create', input: values}
      : {action: 'update', id: editor.team.id, input: values});
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage({type: 'error', text: result.message ?? result.error ?? 'Team could not be saved.'});
      return;
    }

    setTeams(result.teams ?? []);
    setEditor(null);
    setFieldErrors({});
    setMessage({
      type: 'success',
      text: editor.mode === 'create' ? 'Team created.' : 'Team updated.',
    });
    setRevision((current) => current + 1);
  }

  async function handleConfirmedAction() {
    if (!confirmation) return;

    setSubmitting(true);
    const result = await saveTeamAction({
      action: confirmation.action,
      id: confirmation.team.id,
    });
    setSubmitting(false);

    if (!result.ok) {
      setMessage({type: 'error', text: result.message ?? result.error ?? 'Team could not be updated.'});
      setConfirmation(null);
      return;
    }

    setMessage({
      type: 'success',
      text: confirmation.action === 'archive' ? 'Team archived.' : 'Team deleted.',
    });
    setTeams(result.teams ?? []);
    setConfirmation(null);
    setDetailsTeam(null);
    setRevision((current) => current + 1);
  }

  const actionProps = {
    onView: setDetailsTeam,
    onEdit: openEditDialog,
    onArchive: (team: Team) => setConfirmation({action: 'archive', team}),
    onDelete: (team: Team) => setConfirmation({action: 'delete', team}),
  };

  return (
    <section className={styles.management}>
      <Toolbar
        search={search}
        status={status}
        sort={sort}
        view={view}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onSortChange={setSort}
        onViewChange={setView}
        onCreate={openCreateDialog}
      />

      {message ? (
        <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.listHeader}>
        <div>
          <span>Team list</span>
          <h2>{teams.length} {teams.length === 1 ? 'team' : 'teams'}</h2>
        </div>
        <p>Showing {status === 'all' ? 'all teams' : status}</p>
      </div>

      {loading ? <div className={styles.loadingState}>Loading teams...</div> : null}

      {!loading && teams.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No teams found</h3>
          <p>Adjust the current search or status filter.</p>
        </div>
      ) : null}

      {!loading && teams.length > 0 && view === 'table' ? (
        <div className={styles.tableWrap}>
          <table className={styles.teamTable}>
            <thead>
              <tr>
                <th>Logo</th>
                <th>Name</th>
                <th>Captain</th>
                <th>Course</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => <TeamRow key={team.id} team={team} {...actionProps} />)}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && teams.length > 0 && view === 'cards' ? (
        <div className={styles.cardGrid}>
          {teams.map((team) => <TeamCard key={team.id} team={team} {...actionProps} />)}
        </div>
      ) : null}

      {editor ? (
        <TeamFormDialog
          team={editor.mode === 'edit' ? editor.team : undefined}
          fieldErrors={fieldErrors}
          submitting={submitting}
          courses={courses}
          onSubmit={handleFormSubmit}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {detailsTeam ? (
        <TeamDetailsDialog
          team={detailsTeam}
          onEdit={openEditDialog}
          onClose={() => setDetailsTeam(null)}
        />
      ) : null}

      {confirmation ? (
        <ConfirmationDialog
          title={confirmation.action === 'archive' ? 'Archive team?' : 'Delete team?'}
          message={confirmation.action === 'archive'
            ? `${confirmation.team.name} will move out of active team lists.`
            : `${confirmation.team.name} will be permanently removed from the repository.`}
          confirmLabel={confirmation.action === 'archive' ? 'Archive team' : 'Delete team'}
          destructive={confirmation.action === 'delete'}
          submitting={submitting}
          onConfirm={handleConfirmedAction}
          onClose={() => setConfirmation(null)}
        />
      ) : null}
    </section>
  );
}

async function saveTeamAction(payload: object): Promise<TeamApiResponse> {
  const response = await fetch('/api/teams', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });
  const result = await response.json() as TeamApiResponse;

  if (!response.ok) {
    return {...result, ok: false};
  }

  return result;
}
