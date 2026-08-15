import {addSeasonRosterMember, dropSeasonRosterMember} from '@/app/season-rosters/actions';
import {PendingSubmitButton} from '@/components/forms/PendingSubmitButton';
import type {Season} from '@/domain/season/Season';
import {SEASON_ROSTER_CATEGORIES} from '@/domain/season-roster/SeasonRosterMembership';
import type {SeasonRosterTeamView} from '@/domain/season-roster/SeasonRosterPresentation';
import styles from './SeasonRosterManagement.module.css';

export function SeasonRosterManagement({
  season,
  teamViews,
  returnPath,
  notice,
  error,
}: {
  season: Season;
  teamViews: SeasonRosterTeamView[];
  returnPath: '/captain' | '/office/rosters';
  notice?: string;
  error?: string;
}) {
  return (
    <section className={styles.workspace} aria-labelledby="season-roster-heading">
      <header className={styles.header}>
        <div>
          <span>Season roster</span>
          <h2 id="season-roster-heading">{season.name}</h2>
        </div>
        {season.rosterRulesLocked ? <strong className={styles.locked}>Season started</strong> : null}
      </header>
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!teamViews.length ? (
        <p className={styles.empty}>No enrolled season team is available for this account.</p>
      ) : teamViews.map((team) => (
        <article className={styles.teamCard} key={team.seasonTeam.id}>
          <header className={styles.teamHeader}>
            <div><span>Enrolled team</span><h3>{team.teamName}</h3></div>
            <div className={styles.counts}>
              {SEASON_ROSTER_CATEGORIES.map((category) => (
                <span key={category}><b>{category}</b> {team.countLabels[category]}</span>
              ))}
            </div>
          </header>

          {team.canAdd ? (
            <form className={styles.addForm} action={addSeasonRosterMember.bind(null, returnPath)}>
              <input name="seasonId" type="hidden" value={season.id} />
              <input name="teamId" type="hidden" value={team.seasonTeam.teamId} />
              <label>
                <span>Eligible player</span>
                <select name="playerId" required defaultValue="">
                  <option disabled value="">Choose player</option>
                  {team.candidates.map((player) => (
                    <option value={player.id} key={player.id}>{player.name} ({player.gender})</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Roster category</span>
                <select name="rosterCategory" required defaultValue="">
                  <option disabled value="">Choose category</option>
                  {SEASON_ROSTER_CATEGORIES.map((category) => (
                    <option value={category} key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <PendingSubmitButton disabled={!team.candidates.length} pendingLabel="Adding player...">
                Add player
              </PendingSubmitButton>
            </form>
          ) : <p className={styles.guidance}>{team.addUnavailableMessage}</p>}

          <div className={styles.sections}>
            <RosterSection title="Active" empty="No active season members.">
              {team.activeMembers.map((member) => (
                <div className={styles.member} key={member.id}>
                  <div><strong>{member.playerName}</strong><span>{member.rosterCategory} · {member.playerGender}</span></div>
                  <form action={dropSeasonRosterMember.bind(null, returnPath)}>
                    <input name="seasonId" type="hidden" value={season.id} />
                    <input name="playerId" type="hidden" value={member.playerId} />
                    <PendingSubmitButton pendingLabel="Dropping...">Drop</PendingSubmitButton>
                  </form>
                </div>
              ))}
            </RosterSection>
            <RosterSection title="Dropped" empty="No dropped season members.">
              {team.droppedMembers.map((member) => (
                <div className={styles.member} key={member.id}>
                  <div><strong>{member.playerName}</strong><span>{member.rosterCategory} · Dropped permanently</span></div>
                </div>
              ))}
            </RosterSection>
          </div>
        </article>
      ))}
    </section>
  );
}

function RosterSection({title, empty, children}: {title: string; empty: string; children: React.ReactNode}) {
  const rows = Array.isArray(children) ? children : [children];
  return (
    <section className={styles.rosterSection}>
      <h4>{title}</h4>
      {rows.length && rows.some(Boolean) ? children : <p className={styles.empty}>{empty}</p>}
    </section>
  );
}
