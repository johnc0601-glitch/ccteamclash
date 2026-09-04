'use client';

import {useState, type SyntheticEvent} from 'react';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import {loadAvailabilityRosterRemainder} from '@/app/matches/[id]/publicRosterActions';
import v1 from '@/app/matches/[id]/MatchdayV1.module.css';

export function LazyAvailabilityRosterCard({
  teamName,
  label,
  teamId,
  matchId,
  previewPlayers,
  remainingCount,
}: {
  teamName: string;
  label: string;
  teamId: string;
  matchId: string;
  previewPlayers: TeamAttendanceMember[];
  remainingCount: number;
}) {
  const [remainingPlayers, setRemainingPlayers] = useState<TeamAttendanceMember[] | null>(remainingCount > 0 ? null : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || remainingPlayers !== null || loading || remainingCount <= 0) return;

    setLoading(true);
    setError('');
    const result = await loadAvailabilityRosterRemainder(matchId, teamId);
    if (result.ok) {
      setRemainingPlayers(result.players);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  return (
    <details className={v1.previewTeam} onToggle={handleToggle}>
      <summary className={v1.previewTeamHead}>
        <span>{teamName}</span>
        <span>{label}</span>
      </summary>
      <div className={v1.previewList}>
        {previewPlayers.length ? previewPlayers.map((player) => (
          <AvailabilityPlayerRow key={player.playerId} player={player} />
        )) : (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>No players listed yet</span></div>
        )}
        {remainingCount > 0 ? (
          <>
            <div className={`${v1.previewPlayer} ${v1.moreCount}`}>
              <span className={v1.previewMore}>+ {remainingCount} more</span>
            </div>
            <div className={v1.expandedRoster}>
              {loading ? <div className={v1.previewPlayer}><span className={v1.previewMore}>Loading availability…</span></div> : null}
              {error ? <div className={v1.previewPlayer}><span className={v1.previewMore}>{error}</span></div> : null}
              {remainingPlayers?.map((player) => (
                <AvailabilityPlayerRow key={player.playerId} player={player} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </details>
  );
}

function AvailabilityPlayerRow({player}: {player: TeamAttendanceMember}) {
  const status = player.status === 'Playing'
    ? 'Playing'
    : player.status === 'NotPlaying'
      ? 'Not playing'
      : 'Unconfirmed';
  return (
    <div className={v1.previewPlayer}>
      <strong>{player.playerName}</strong>
      <span className={v1.playerMeta}>{status}</span>
    </div>
  );
}
