'use client';

import {useEffect, useState} from 'react';
import {PlayerFormDialog} from '@/components/players/PlayerFormDialog';
import {ConfirmationDialog} from '@/components/teams/ConfirmationDialog';
import {SearchBar} from '@/components/teams/SearchBar';
import {services} from '@/core/ServiceContainer';
import type {Player} from '@/models/Player';
import type {Team} from '@/models/Team';
import type {
  PlayerFieldErrors,
  PlayerInput,
  PlayerStatusFilter,
} from '@/types/player';
import styles from './PlayerManagement.module.css';

type EditorState = {mode: 'create'} | {mode: 'edit'; player: Player} | null;
type ConfirmationState = {action: 'archive' | 'delete'; player: Player} | null;

export function PlayerManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState('all');
  const [status, setStatus] = useState<PlayerStatusFilter>('all');
  const [editor, setEditor] = useState<EditorState>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [fieldErrors, setFieldErrors] = useState<PlayerFieldErrors>({});
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    services.teams.getAll({status: 'active'}).then((nextTeams) => {
      if (!cancelled) setTeams(nextTeams);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    services.players.getAll({search, teamId, status})
      .then((nextPlayers) => {
        if (cancelled) return;
        setPlayers(nextPlayers);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessage({type: 'error', text: 'Players could not be loaded.'});
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [revision, search, status, teamId]);

  const teamNames = new Map(teams.map((team) => [team.id, team.name]));

  async function handleSubmit(input: PlayerInput) {
    if (!editor) return;
    setSubmitting(true);
    const result = editor.mode === 'create'
      ? await services.players.create(input)
      : await services.players.update(editor.player.id, input);
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage({type: 'error', text: result.message});
      return;
    }

    setEditor(null);
    setFieldErrors({});
    setMessage({type: 'success', text: editor.mode === 'create' ? 'Player added.' : 'Player updated.'});
    setRevision((current) => current + 1);
  }

  async function handleConfirmedAction() {
    if (!confirmation) return;
    setSubmitting(true);
    const result = confirmation.action === 'archive'
      ? await services.players.archive(confirmation.player.id)
      : await services.players.delete(confirmation.player.id);
    setSubmitting(false);

    if (!result.ok) {
      setMessage({type: 'error', text: result.message});
    } else {
      setMessage({
        type: 'success',
        text: confirmation.action === 'archive' ? 'Player archived.' : 'Player deleted.',
      });
      setRevision((current) => current + 1);
    }
    setConfirmation(null);
  }

  function openCreate() {
    setFieldErrors({});
    setMessage(null);
    setEditor({mode: 'create'});
  }

  function openEdit(player: Player) {
    setFieldErrors({});
    setMessage(null);
    setEditor({mode: 'edit', player});
  }

  return (
    <section className={styles.management}>
      <div className={styles.toolbar}>
        <SearchBar value={search} onChange={setSearch} label="Search players" placeholder="Search name or PDGA number" />
        <label>
          <span>Team</span>
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="all">All teams</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as PlayerStatusFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button type="button" className={styles.primaryButton} onClick={openCreate}>Add player</button>
      </div>

      {message ? (
        <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.listHeader}>
        <div>
          <span>Player list</span>
          <h2>{players.length} {players.length === 1 ? 'player' : 'players'}</h2>
        </div>
      </div>

      {loading ? <div className={styles.state}>Loading players...</div> : null}
      {!loading && players.length === 0 ? <div className={styles.state}>No players found.</div> : null}

      {!loading && players.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.playerTable}>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Women&apos;s Top 10</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td><strong>{player.name}</strong></td>
                  <td>{teamNames.get(player.teamId) ?? player.teamId}</td>
                  <td>{player.eligibleForWomensRanking ? 'Eligible' : '-'}</td>
                  <td><span className={player.active ? styles.active : styles.archived}>{player.active ? 'Active' : 'Archived'}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" onClick={() => openEdit(player)}>Edit</button>
                      {player.active ? <button type="button" onClick={() => setConfirmation({action: 'archive', player})}>Archive</button> : null}
                      <button type="button" className={styles.dangerText} onClick={() => setConfirmation({action: 'delete', player})}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editor ? (
        <PlayerFormDialog
          player={editor.mode === 'edit' ? editor.player : undefined}
          teams={teams}
          fieldErrors={fieldErrors}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setEditor(null)}
        />
      ) : null}

      {confirmation ? (
        <ConfirmationDialog
          title={confirmation.action === 'archive' ? 'Archive player?' : 'Delete player?'}
          message={confirmation.action === 'archive'
            ? `${confirmation.player.name} will be removed from active rosters.`
            : `${confirmation.player.name} will be permanently removed.`}
          confirmLabel={confirmation.action === 'archive' ? 'Archive player' : 'Delete player'}
          destructive={confirmation.action === 'delete'}
          submitting={submitting}
          onConfirm={handleConfirmedAction}
          onClose={() => setConfirmation(null)}
        />
      ) : null}
    </section>
  );
}
