'use client';

import {useActionState, useState} from 'react';
import {saveOfficeRoster} from './rosterActions';
import styles from './OfficeRosterForm.module.css';

const labels = {
  Playing: 'Coming',
  NotPlaying: 'Not coming',
  Unconfirmed: 'Unconfirmed',
};
type Availability = keyof typeof labels;
const options: Availability[] = ['Playing', 'NotPlaying', 'Unconfirmed'];

export function OfficeRosterForm({matchId, teamId, players}: {
  matchId: string;
  teamId: string;
  players: {id: string; name: string; status: Availability}[];
}) {
  const [message, action, pending] = useActionState(saveOfficeRoster.bind(null, matchId, teamId), '');
  const [selections, setSelections] = useState<Partial<Record<string, Availability>>>({});
  const hasChanges = players.some(({id, status}) => selections[id] && selections[id] !== status);

  if (!players.length) return <p>No eligible players were found for this match.</p>;
  return (
    <form action={action}>
      <fieldset className={styles.form} disabled={pending}>
        <legend>Player availability</legend>
        {players.map((player) => {
          const selected = selections[player.id] ?? player.status;
          return (
            <fieldset className={styles.player} key={player.id}>
              <legend>{player.name}</legend>
              <div className={styles.options}>
                {options.map((status) => (
                  <label className={styles.option} data-status={status} key={status}>
                    <input
                      type="radio"
                      name={`player:${player.id}`}
                      value={status === player.status ? '' : status}
                      checked={selected === status}
                      onChange={() => setSelections((current) => ({...current, [player.id]: status}))}
                    />
                    <span>{labels[status]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        <button className={styles.save} type="submit" disabled={!hasChanges}>
          {pending ? 'Saving…' : 'Save and lock roster'}
        </button>
      </fieldset>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
