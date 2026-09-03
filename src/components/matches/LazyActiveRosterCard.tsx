'use client';

import {useState} from 'react';
import type {LazyRosterPlayer} from '@/app/matches/[id]/publicRosterActions';
import {loadActiveRosterRemainder} from '@/app/matches/[id]/publicRosterActions';
import v1 from '@/app/matches/[id]/MatchdayV1.module.css';

export function LazyActiveRosterCard({
  teamName,
  label,
  teamId,
  seasonId,
  previewPlayers,
  remainingCount,
}: {
  teamName: string;
  label: string;
  teamId: string;
  seasonId: string;
  previewPlayers: LazyRosterPlayer[];
  remainingCount: number;
}) {
  const [remainingPlayers, setRemainingPlayers] = useState<LazyRosterPlayer[] | null>(remainingCount > 0 ? null : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleToggle(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || remainingPlayers !== null || loading || remainingCount <= 0) return;

    setLoading(true);
    setError('');
    const result = await loadActiveRosterRemainder(seasonId, teamId);
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
        {previewPlayers.length ? previewPlayers.map((player) => <ActivePlayerRow key={player.id} player={player} />) : (
          <div className={v1.previewPlayer}><span className={v1.previewMore}>No players listed yet</span></div>
        )}
        {remainingCount > 0 ? (
          <>
            <div className={`${v1.previewPlayer} ${v1.moreCount}`}>
              <span className={v1.previewMore}>+ {remainingCount} more</span>
            </div>
            <div className={v1.expandedRoster}>
              {loading ? <div className={v1.previewPlayer}><span className={v1.previewMore}>Loading roster…</span></div> : null}
              {error ? <div className={v1.previewPlayer}><span className={v1.previewMore}>{error}</span></div> : null}
              {remainingPlayers?.map((player) => <ActivePlayerRow key={player.id} player={player} />)}
            </div>
          </>
        ) : null}
      </div>
    </details>
  );
}

function ActivePlayerRow({player}: {player: LazyRosterPlayer}) {
  return (
    <div className={v1.previewPlayer}>
      <strong>{player.name}</strong>
      <span className={v1.playerMeta}>CI: {formatClashIndex(player)}</span>
    </div>
  );
}

function formatClashIndex(player: LazyRosterPlayer): string {
  if (player.clashIndex == null) return '—';
  const ghost = player.clashIndexProvisional === true || (
    player.pdgaRating == null
    && ((player.gender === 'Female' && player.clashIndex === 725)
      || (player.gender === 'Male' && player.clashIndex === 850))
  );
  return `${player.clashIndex}${ghost ? '*' : ''}`;
}
