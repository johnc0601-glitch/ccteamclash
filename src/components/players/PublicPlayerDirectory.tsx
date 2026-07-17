'use client';

import {useState} from 'react';
import type {PublicPlayerView} from '@/services/public/PublicPlayerService';
import type {PlayerMatchHistoryEntry, PlayerStatistics} from '@/services/statistics';
import styles from '@/app/players/Players.module.css';

type PublicPlayerDirectoryProps = {
  players: PublicPlayerView[];
  teams: Array<{id: string; name: string}>;
  showFilters?: boolean;
};

function formatRecord(statistics: PlayerStatistics): string {
  return formatRecordSummary(statistics.overallRecord);
}

function formatRecordSummary(record: PlayerMatchHistoryEntry['record']): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function PublicPlayerDirectory({
  players,
  teams,
  showFilters = true,
}: PublicPlayerDirectoryProps) {
  const [search, setSearch] = useState('');
  const [teamId, setTeamId] = useState('all');
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visiblePlayers = players.filter(({player}) =>
    (teamId === 'all' || player.teamId === teamId)
    && (!normalizedSearch || player.name.toLocaleLowerCase().includes(normalizedSearch)));

  return (
    <>
      {showFilters ? <div className={styles.filters}>
        <label>
          <span>Find player</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" />
        </label>
        <label>
          <span>Team</span>
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="all">All teams</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
      </div> : null}

      <div className={styles.directory}>
        {visiblePlayers.map(({player, teamName, currentSeasonName, currentStatistics, careerStatistics, history}) => (
          <details className={styles.player} key={player.id}>
            <summary>
              <span><strong>{player.name}</strong><small>{teamName}</small></span>
              <span className={styles.summaryStats}>
                <b>{formatRecord(currentStatistics ?? careerStatistics)}</b>
                <small>{currentStatistics ? currentSeasonName : 'Career'}</small>
              </span>
              <span className={styles.expandLabel}>View stats</span>
            </summary>
            <div className={styles.details}>
              <div className={styles.identity}>
                <span>{player.gender}</span>
                {player.pdgaNumber ? <span>PDGA #{player.pdgaNumber}</span> : null}
                {player.pdgaRating ? <span>Rating {player.pdgaRating}</span> : null}
              </div>

              <div className={styles.statSections}>
                {currentStatistics ? (
                  <section>
                    <span>{currentSeasonName}</span>
                    <h3>Current season</h3>
                    <dl>
                      <div><dt>Matches</dt><dd>{currentStatistics.matchesPlayed}</dd></div>
                      <div><dt>Record</dt><dd>{formatRecord(currentStatistics)}</dd></div>
                      <div><dt>Win %</dt><dd>{currentStatistics.winPercentage.toFixed(1)}%</dd></div>
                      <div><dt>Points</dt><dd>{currentStatistics.pointsEarned}</dd></div>
                    </dl>
                    <p>Singles {formatRecordSummary(currentStatistics.singlesRecord)} &middot; Doubles {formatRecordSummary(currentStatistics.doublesRecord)}</p>
                  </section>
                ) : null}
                <section>
                  <span>All seasons</span>
                  <h3>Career</h3>
                  <dl>
                    <div><dt>Matches</dt><dd>{careerStatistics.matchesPlayed}</dd></div>
                    <div><dt>Record</dt><dd>{formatRecord(careerStatistics)}</dd></div>
                    <div><dt>Win %</dt><dd>{careerStatistics.winPercentage.toFixed(1)}%</dd></div>
                    <div><dt>Points</dt><dd>{careerStatistics.pointsEarned}</dd></div>
                  </dl>
                  <p>Singles {formatRecordSummary(careerStatistics.singlesRecord)} &middot; Doubles {formatRecordSummary(careerStatistics.doublesRecord)}</p>
                </section>
              </div>

              <section className={styles.history}>
                <h3>Match history</h3>
                {history.length ? (
                  <div className={styles.historyTableWrap}>
                    <table>
                      <thead><tr><th>Date</th><th>Opponent</th><th>Season</th><th>Record</th><th>Points</th></tr></thead>
                      <tbody>{history.map((entry) => (
                        <tr key={`${entry.challengeId}-${player.id}`}>
                          <td>{formatDate(entry.date)}</td>
                          <td>{entry.opponentTeamName}</td>
                          <td>{entry.seasonName}</td>
                          <td>{formatRecordSummary(entry.record)}</td>
                          <td>{entry.pointsEarned}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p>No published match history yet.</p>}
              </section>
            </div>
          </details>
        ))}
        {!visiblePlayers.length ? <p className={styles.empty}>No players found.</p> : null}
      </div>
    </>
  );
}
