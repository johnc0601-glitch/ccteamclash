'use client';

import {useEffect, useState} from 'react';
import {PlayerFormDialog} from '@/components/players/PlayerFormDialog';
import {PlayerCard} from '@/components/players/PlayerCard';
import {PlayerDetailsDialog} from '@/components/players/PlayerDetailsDialog';
import {PlayerRow} from '@/components/players/PlayerRow';
import {PlayerToolbar} from '@/components/players/PlayerToolbar';
import {ConfirmationDialog} from '@/components/teams/ConfirmationDialog';
import {services} from '@/core/ServiceContainer';
import type {Player} from '@/models/Player';
import type {Team} from '@/models/Team';
import type {PlayerStatistics} from '@/services/statistics';
import type {
  PlayerFieldErrors,
  PlayerInput,
  PlayerSortOption,
  PlayerStatusFilter,
  PlayerViewMode,
} from '@/types/player';
import styles from './PlayerManagement.module.css';

type EditorState = {mode: 'create'} | {mode: 'edit'; player: Player} | null;
type ConfirmationState = {action: 'archive' | 'delete'; player: Player} | null;

export function PlayerManagement() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [statisticsByPlayer, setStatisticsByPlayer] = useState<Map<string, PlayerStatistics>>(new Map());
  const [activeSeasonName, setActiveSeasonName] = useState('Current season');
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState('all');
  const [status, setStatus] = useState<PlayerStatusFilter>('all');
  const [sort, setSort] = useState<PlayerSortOption>('alphabetical');
  const [view, setView] = useState<PlayerViewMode>('table');
  const [editor, setEditor] = useState<EditorState>(null);
  const [detailsPlayer, setDetailsPlayer] = useState<Player | null>(null);
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
    async function loadPlayers() {
      try {
        setLoading(true);
        const [nextPlayers, activeSeason] = await Promise.all([
          services.players.getAll({search, teamId, status, sort}),
          services.seasons.getActive(),
        ]);
        const playerStatistics = activeSeason
          ? await services.statistics.getPlayerStatisticsForPlayers(
            nextPlayers.map((player) => player.id),
            activeSeason.id,
          )
          : [];

        if (cancelled) return;
        setPlayers(nextPlayers);
        setStatisticsByPlayer(new Map(playerStatistics.map((statistics) => [statistics.playerId, statistics])));
        setActiveSeasonName(activeSeason?.name ?? 'No active season');
        setLoading(false);
      } catch {
        if (cancelled) return;
        setMessage({type: 'error', text: 'Players could not be loaded.'});
        setLoading(false);
      }
    }
    loadPlayers();
    return () => { cancelled = true; };
  }, [revision, search, sort, status, teamId]);

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
    setDetailsPlayer(null);
    setEditor({mode: 'edit', player});
  }

  function getPlayerStats(player: Player) {
    const statistics = statisticsByPlayer.get(player.id);
    return {
      matchesPlayed: statistics?.matchesPlayed ?? 0,
      finalsQualified: Boolean(statistics?.finalsQualified),
    };
  }

  function getPlayerTeamName(player: Player): string {
    return player.teamId ? teamNames.get(player.teamId) ?? player.teamId : 'Unassigned';
  }

  const actionProps = {
    onView: setDetailsPlayer,
    onEdit: openEdit,
    onArchive: (player: Player) => setConfirmation({action: 'archive', player}),
    onDelete: (player: Player) => setConfirmation({action: 'delete', player}),
  };

  return (
    <section className={styles.management}>
      <PlayerToolbar
        search={search}
        teamId={teamId}
        status={status}
        sort={sort}
        view={view}
        teams={teams}
        onSearchChange={setSearch}
        onTeamChange={setTeamId}
        onStatusChange={setStatus}
        onSortChange={setSort}
        onViewChange={setView}
        onCreate={openCreate}
      />

      {message ? (
        <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.listHeader}>
        <div>
          <span>Player list</span>
          <h2>{players.length} {players.length === 1 ? 'player' : 'players'}</h2>
          <p>{activeSeasonName} attendance and finals qualification</p>
        </div>
      </div>

      {loading ? <div className={styles.state}>Loading players...</div> : null}
      {!loading && players.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No players found</h3>
          <p>Adjust the current search, team, or status filter.</p>
        </div>
      ) : null}

      {!loading && players.length > 0 && view === 'table' ? (
        <div className={styles.tableWrap}>
          <table className={styles.playerTable}>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Season matches</th>
                <th>Finals</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const {matchesPlayed, finalsQualified} = getPlayerStats(player);
                return (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    teamName={getPlayerTeamName(player)}
                    matchesPlayed={matchesPlayed}
                    finalsQualified={finalsQualified}
                    {...actionProps}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && players.length > 0 && view === 'cards' ? (
        <div className={styles.cardGrid}>
          {players.map((player) => {
            const {matchesPlayed, finalsQualified} = getPlayerStats(player);
            return (
              <PlayerCard
                key={player.id}
                player={player}
                teamName={getPlayerTeamName(player)}
                matchesPlayed={matchesPlayed}
                finalsQualified={finalsQualified}
                {...actionProps}
              />
            );
          })}
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

      {detailsPlayer ? (() => {
        const {matchesPlayed, finalsQualified} = getPlayerStats(detailsPlayer);
        return (
          <PlayerDetailsDialog
            player={detailsPlayer}
            teamName={getPlayerTeamName(detailsPlayer)}
            matchesPlayed={matchesPlayed}
            finalsQualified={finalsQualified}
            onEdit={openEdit}
            onClose={() => setDetailsPlayer(null)}
          />
        );
      })() : null}

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
