import type {PlayerProfile, PlayerProfileMatchHistoryItem} from '@/services/playerProfiles';
import styles from '@/app/players/Players.module.css';

type PublicPlayerProfileCardProps = {
  profile: PlayerProfile;
  compact?: boolean;
};

export function PublicPlayerProfileCard({profile, compact = false}: PublicPlayerProfileCardProps) {
  return (
    <div className={styles.profileCard}>
      <div className={styles.identity}>
        <span>{formatGender(profile.player.gender)}</span>
        {profile.player.pdgaNumber ? <span>PDGA #{profile.player.pdgaNumber}</span> : null}
        {profile.player.pdgaRating ? <span>Rating {profile.player.pdgaRating}</span> : null}
      </div>

      <section className={styles.profileStats}>
        <span>{profile.seasonName}</span>
        <h3>{compact ? profile.teamName : 'Player card'}</h3>
        <dl>
          <div><dt>Matches</dt><dd>{profile.matchesPlayed}</dd></div>
          <div><dt>Record</dt><dd>{formatRecordSummary(profile.overallRecord)}</dd></div>
          <div><dt>Win %</dt><dd>{profile.winPercentage.toFixed(1)}%</dd></div>
          <div><dt>Points</dt><dd>{formatPoints(profile.pointsEarned)}</dd></div>
        </dl>
        <dl className={styles.splitStats}>
          <div><dt>Singles %</dt><dd>{formatWinPercentage(profile.singlesRecord)}</dd><small>{formatRecordSummary(profile.singlesRecord)}</small></div>
          <div><dt>Doubles %</dt><dd>{formatWinPercentage(profile.doublesRecord)}</dd><small>{formatRecordSummary(profile.doublesRecord)}</small></div>
        </dl>
      </section>

      {!compact ? (
        <section className={styles.history}>
          <h3>Match history</h3>
          {profile.history.length ? (
            <ol className={styles.matchHistoryList}>
              {profile.history.map((entry) => (
                <li key={entry.id}>
                  <span>{formatHistoryLead(entry)}</span>
                  <small>{formatHistoryMeta(entry)}</small>
                </li>
              ))}
            </ol>
          ) : <p>Individual match history will appear here once official match rows are imported.</p>}
        </section>
      ) : null}
    </div>
  );
}

function formatRecordSummary(record: {wins: number; losses: number; ties: number}): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

function formatWinPercentage(record: {wins: number; losses: number; ties: number}): string {
  const matchesPlayed = record.wins + record.losses + record.ties;
  if (!matchesPlayed) return '0.0%';
  return (((record.wins + record.ties * 0.5) / matchesPlayed) * 100).toFixed(1) + '%';
}

function formatGender(gender: string): string {
  if (gender === 'Female') return 'F';
  if (gender === 'Male') return 'M';
  return '-';
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? points.toFixed(0) : points.toFixed(1);
}

function formatHistoryLead(entry: PlayerProfileMatchHistoryItem): string {
  const score = entry.playerScore !== undefined && entry.opponentScore !== undefined
    ? `, ${entry.playerScore}-${entry.opponentScore}`
    : '';

  if (entry.format === 'Singles' && entry.opponentPlayerNames.length) {
    return `${entry.result} vs ${entry.opponentPlayerNames[0]}${score}`;
  }

  if (entry.format === 'Doubles' && entry.partnerPlayerNames.length && entry.opponentPlayerNames.length) {
    return `${entry.result} with ${entry.partnerPlayerNames.join(' / ')} vs ${entry.opponentPlayerNames.join(' / ')}${score}`;
  }

  return `${entry.result} vs ${entry.opponentTeamName ?? 'Opponent'}${score}`;
}

function formatHistoryMeta(entry: PlayerProfileMatchHistoryItem): string {
  const parts = [
    entry.format,
    entry.seasonName,
    entry.date ? formatDate(entry.date) : '',
  ].filter(Boolean);
  return parts.join(' - ');
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
