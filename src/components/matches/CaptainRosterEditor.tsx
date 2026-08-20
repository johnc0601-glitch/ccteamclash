'use client';

import {useMemo, useState} from 'react';
import {saveCaptainRosterAvailabilityBatch} from '@/app/matches/[id]/captainRosterManagementActions';
import {emailCaptainUnconfirmed} from '@/app/matches/[id]/captainReminderActions';
import styles from '@/app/matches/[id]/Matchday.module.css';
import type {ManagedTeamRoster} from '@/domain/match-roster/MatchAttendance';

type Status = ManagedTeamRoster['players'][number]['status'];

const compactButtonStyle = {
  minHeight: 30,
  padding: '4px 8px',
  fontSize: 11,
};

export function CaptainRosterEditor({
  roster,
  teamName,
  emailConfigured,
}: {
  roster: ManagedTeamRoster;
  teamName: string;
  emailConfigured: boolean;
}) {
  const initial = useMemo(
    () => Object.fromEntries(roster.players.map((player) => [player.playerId, player.status])) as Record<string, Status>,
    [roster.players],
  );
  const [draft, setDraft] = useState<Record<string, Status>>(initial);

  const changes = roster.players
    .filter((player) => draft[player.playerId] !== player.status)
    .map((player) => ({playerId: player.playerId, status: draft[player.playerId]}));
  const dirtyCount = changes.length;

  const counts = roster.players.reduce((result, player) => {
    result[draft[player.playerId] ?? player.status] += 1;
    return result;
  }, {Playing: 0, NotPlaying: 0, Unconfirmed: 0});

  const canEmailUnconfirmed = Boolean(
    emailConfigured
    && roster.emailReminderOpen
    && roster.attendanceOpen
    && counts.Unconfirmed > 0
    && dirtyCount === 0
  );
  const selectedBox = '0 0 0 2px var(--cc-heading)';

  function choose(playerId: string, status: Status) {
    setDraft((current) => ({...current, [playerId]: status}));
  }

  function discard() {
    setDraft(initial);
  }

  return (
    <article className={styles.captainTeamRoster}>
      <header className={styles.captainTeamHeader}>
        <div>
          <span>Open</span>
          <h3>{teamName}</h3>
        </div>
        <p>{counts.Playing} yes · {counts.NotPlaying} no · {counts.Unconfirmed} unconfirmed</p>
      </header>

      {canEmailUnconfirmed ? (
        <form action={emailCaptainUnconfirmed} className={styles.confirmRosterForm}>
          <input name="matchId" type="hidden" value={roster.matchId} />
          <button type="submit">Email {counts.Unconfirmed} unconfirmed</button>
        </form>
      ) : null}

      <div className={styles.captainPlayerList}>
        {roster.players.map((player) => {
          const status = draft[player.playerId] ?? player.status;
          const changed = status !== player.status;
          return (
            <div
              className={styles.captainPlayerRow}
              key={player.playerId}
              style={{minHeight: 48, padding: '6px 10px', gap: 8}}
            >
              <div>
                <strong>{player.playerName}</strong>
                <span>{formatStatus(status)}{changed ? ' · unsaved' : ''}</span>
              </div>
              <span className={styles.captainPlayerActions} style={{display: 'flex', gap: 4, whiteSpace: 'nowrap'}}>
                <button
                  aria-pressed={status === 'Playing'}
                  onClick={() => choose(player.playerId, 'Playing')}
                  style={{
                    ...compactButtonStyle,
                    background: '#4f7f32',
                    borderColor: '#4f7f32',
                    boxShadow: status === 'Playing' ? selectedBox : 'none',
                    color: '#fff',
                  }}
                  type="button"
                >Yes</button>
                <button
                  aria-pressed={status === 'NotPlaying'}
                  onClick={() => choose(player.playerId, 'NotPlaying')}
                  style={{
                    ...compactButtonStyle,
                    background: '#b64040',
                    borderColor: '#b64040',
                    boxShadow: status === 'NotPlaying' ? selectedBox : 'none',
                    color: '#fff',
                  }}
                  type="button"
                >No</button>
                <button
                  aria-pressed={status === 'Unconfirmed'}
                  onClick={() => choose(player.playerId, 'Unconfirmed')}
                  style={{...compactButtonStyle, boxShadow: status === 'Unconfirmed' ? selectedBox : 'none'}}
                  type="button"
                >Unconfirmed</button>
              </span>
            </div>
          );
        })}
      </div>

      {dirtyCount > 0 ? (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 4,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 8,
            alignItems: 'center',
            padding: '8px 10px',
            borderTop: '1px solid rgba(255,255,255,.16)',
            background: '#101820',
            color: '#fff',
            fontSize: 12,
          }}
        >
          <strong style={{color: '#fff'}}>{dirtyCount} unsaved change{dirtyCount === 1 ? '' : 's'}</strong>
          <div style={{display: 'flex', gap: 6}}>
            <button
              onClick={discard}
              style={{
                minHeight: 32,
                padding: '5px 9px',
                border: '1px solid rgba(255,255,255,.35)',
                borderRadius: 5,
                background: '#fff',
                color: '#101820',
                fontWeight: 900,
                cursor: 'pointer',
              }}
              type="button"
            >
              Discard
            </button>
            <form action={saveCaptainRosterAvailabilityBatch}>
              <input name="matchId" type="hidden" value={roster.matchId} />
              <input name="teamId" type="hidden" value={roster.teamId} />
              <input name="changes" type="hidden" value={JSON.stringify(changes)} />
              <button
                style={{
                  minHeight: 32,
                  padding: '5px 10px',
                  border: '1px solid var(--cc-teal)',
                  borderRadius: 5,
                  background: 'var(--cc-teal)',
                  color: '#fff',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
                type="submit"
              >
                Save roster ({dirtyCount})
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function formatStatus(status: Status): string {
  if (status === 'Playing') return 'Yes';
  if (status === 'NotPlaying') return 'No';
  return 'Unconfirmed';
}
