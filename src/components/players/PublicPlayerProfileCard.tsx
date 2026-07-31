'use client';

import {useState} from 'react';
import {loadPlayerMatchHistory} from '@/app/players/actions';
import {
  formatHistoryVenue,
  formatSinglesHistoryScore,
  groupHistoryBySeason,
} from '@/components/players/playerHistoryDisplay';
import type {PlayerProfile, PlayerProfileMatchHistoryItem} from '@/services/playerProfiles';
import styles from '@/app/players/Players.module.css';

type PublicPlayerProfileCardProps = {
  profile: PlayerProfile;
  compact?: boolean;
};

export function PublicPlayerProfileCard({profile, compact = false}: PublicPlayerProfileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullHistory, setFullHistory] = useState<PlayerProfileMatchHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const history = expanded && fullHistory ? fullHistory : profile.history;

  async function toggleHistory() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!fullHistory) {
      setLoading(true);
      setError('');
      try {
        setFullHistory(await loadPlayerMatchHistory(profile.player.id));
      } catch {
        setError('Match history could not be loaded.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setExpanded(true);
  }

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
          <div className={styles.historyHeading}>
            <h3>Current Season Matches</h3>
            {profile.matchesPlayed ? (
              <button type="button" onClick={toggleHistory} disabled={loading}>
                {loading ? 'Loading...' : expanded ? 'Show current season' : 'Complete History'}
              </button>
            ) : null}
          </div>
          {error ? <p role="alert">{error}</p> : null}
          {history.length ? <HistoryList history={history} />
            : <p>Individual match history will appear here once official match rows are imported.</p>}
        </section>
      ) : null}
    </div>
  );
}

function HistoryList({history}: {history: PlayerProfileMatchHistoryItem[]}) {
  const seasonGroups = groupHistoryBySeason(history);
  const grouped = seasonGroups.length > 1;
  return <div className={styles.historyGroups}>{seasonGroups.map(({seasonName, entries}) => {
    return <section key={seasonName} className={styles.historySeason}>
      {grouped ? <h4>{seasonName}</h4> : null}
      <ol className={styles.matchHistoryList}>
        {entries.map((entry) => <HistoryRow entry={entry} key={entry.id} />)}
      </ol>
    </section>;
  })}</div>;
}

function HistoryRow({entry}: {entry: PlayerProfileMatchHistoryItem}) {
  const opponentTeam = entry.opponentTeamName ?? 'Opponent';
  return <li>
    <div className={styles.historyResult}>
      <span>{entry.opponentPlayerNames.join(' / ') || opponentTeam}</span>
      <strong>{entry.format === 'Singles'
        ? formatSinglesHistoryScore(entry)
        : entry.result}</strong>
    </div>
    {entry.format === 'Doubles' && entry.partnerPlayerNames.length
      ? <small className={styles.partner}>with {entry.partnerPlayerNames.join(' / ')}</small>
      : null}
    <small>{formatHistoryVenue(entry)}</small>
  </li>;
}

function formatRecordSummary(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
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
