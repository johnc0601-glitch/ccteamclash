'use client';

import {useActionState} from 'react';
import {saveOfficeRoster} from './rosterActions';

const labels = {
  Playing: 'Coming',
  NotPlaying: 'Not coming',
  Unconfirmed: 'Unconfirmed',
};

export function OfficeRosterForm({matchId, teamId, players}: {
  matchId: string;
  teamId: string;
  players: {id: string; name: string; status: keyof typeof labels}[];
}) {
  const [message, action, pending] = useActionState(saveOfficeRoster.bind(null, matchId, teamId), '');

  if (!players.length) return <p>No eligible players were found for this match.</p>;
  return (
    <form action={action}>
      <fieldset disabled={pending}>
        <legend>Player availability</legend>
        {players.map((player) => (
          <div key={player.id}>
            <label>
              {player.name}{' '}
              <select name={`player:${player.id}`} defaultValue="">
                <option value="">Keep {labels[player.status].toLowerCase()}</option>
                {Object.entries(labels).filter(([status]) => status !== player.status)
                  .map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </select>
            </label>
          </div>
        ))}
        <button type="submit">{pending ? 'Saving…' : 'Save and lock roster'}</button>
      </fieldset>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
