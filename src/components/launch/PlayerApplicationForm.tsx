'use client';

import {useState} from 'react';
import {PlayerRecordSelect} from '@/components/launch/PlayerRecordSelect';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {SubmitButton} from '@/app/account/AuthFormControls';
import styles from '@/app/account/Account.module.css';

type ApplicationTeamOption = {id: string; name: string};

export function PlayerApplicationForm({
  action,
  defaultName,
  players,
  seasonId,
  teams,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultName: string;
  players: LaunchPlayer[];
  seasonId: string;
  teams: ApplicationTeamOption[];
}) {
  const [playedBefore, setPlayedBefore] = useState(false);

  return (
    <form className={styles.form} action={action}>
      <input name="seasonId" type="hidden" value={seasonId} />
      <label htmlFor="applicationDisplayName">First Name Last Name</label>
      <input
        autoComplete="name"
        defaultValue={defaultName}
        id="applicationDisplayName"
        name="displayName"
        placeholder="John Smith"
        required
      />

      <fieldset className={styles.choiceGroup}>
        <legend>Player Type</legend>
        <label><input defaultChecked name="playerType" type="radio" value="Adult" /> Adult</label>
        <label><input name="playerType" type="radio" value="Junior" /> Junior</label>
      </fieldset>

      <fieldset className={styles.choiceGroup}>
        <legend>Gender</legend>
        <label><input defaultChecked name="gender" type="radio" value="Male" /> Male</label>
        <label><input name="gender" type="radio" value="Female" /> Female</label>
      </fieldset>

      <label htmlFor="applicationRequestedTeam">Requested Team</label>
      <select id="applicationRequestedTeam" name="requestedTeamId" defaultValue="" required>
        <option value="" disabled>Choose a team</option>
        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
      <p className={styles.fieldHint}>This is a request. League approval does not automatically add you to a roster.</p>

      <fieldset className={styles.choiceGroup}>
        <legend>Have you played Team Clash before?</legend>
        <label>
          <input
            checked={!playedBefore}
            name="playedBefore"
            onChange={() => setPlayedBefore(false)}
            type="radio"
            value="No"
          /> No
        </label>
        <label>
          <input
            checked={playedBefore}
            name="playedBefore"
            onChange={() => setPlayedBefore(true)}
            type="radio"
            value="Yes"
          /> Yes
        </label>
      </fieldset>

      {playedBefore ? (
        <div className={styles.returningPlayerFields}>
          <label htmlFor="applicationRequestedPlayer">Previous Team Clash Player</label>
          <PlayerRecordSelect
            emptyLabel="Choose your previous player record"
            id="applicationRequestedPlayer"
            name="requestedPlayerId"
            players={players}
            searchLabel="Search previous player records"
            searchPlaceholder="Search previous player..."
            required
          />
          <label htmlFor="applicationPdgaNumber">PDGA Number (optional)</label>
          <input id="applicationPdgaNumber" inputMode="numeric" name="submittedPdgaNumber" />
        </div>
      ) : null}

      <SubmitButton pendingLabel="Submitting application...">Submit Application</SubmitButton>
    </form>
  );
}
