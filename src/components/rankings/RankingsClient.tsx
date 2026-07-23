'use client';

import {useState, type KeyboardEvent} from 'react';
import {PublicPlayerProfileCard} from '@/components/players/PublicPlayerProfileCard';
import {DialogShell} from '@/components/teams/DialogShell';
import type {HistoricalPlayerSeasonSummary} from '@/data/historicalSeed';
import {createProfileFromHistoricalSummary} from '@/services/playerProfiles';
import styles from '@/app/rankings/Rankings.module.css';

export type HistoricalRankingEntry = {
  rank: number;
  summary: HistoricalPlayerSeasonSummary;
};

type RankingTableProps = {
  id: string;
  title: string;
  entries: HistoricalRankingEntry[];
  interactive?: boolean;
  fullWidth?: boolean;
  onOpen: (entry: HistoricalRankingEntry) => void;
};

type RankingsClientProps = {
  overall: HistoricalRankingEntry[];
  women: HistoricalRankingEntry[];
  total: HistoricalRankingEntry[];
};

function formatRecordSummary(record: HistoricalPlayerSeasonSummary['overallRecord']): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

function formatRecord(summary: HistoricalPlayerSeasonSummary): string {
  return formatRecordSummary(summary.overallRecord);
}

function formatPoints(summary: HistoricalPlayerSeasonSummary): string {
  return (summary.overallRecord.wins + summary.overallRecord.ties * 0.5).toFixed(1);
}

function RankingTable({id, title, entries, interactive = false, fullWidth = false, onOpen}: RankingTableProps) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, entry: HistoricalRankingEntry) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(entry);
    }
  }

  return (
    <section id={id} className={`${styles.rankingPanel} ${fullWidth ? styles.rankingPanelFull : ''}`}>
      <header>
        <span>Imported last season</span>
        <h2>{title}</h2>
      </header>
      {entries.length ? (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th>Record</th>
                <th>Win %</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const {rank, summary} = entry;
                return (
                  <tr
                    key={summary.playerId}
                    className={interactive ? styles.clickableRow : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    role={interactive ? 'button' : undefined}
                    onClick={interactive ? () => onOpen(entry) : undefined}
                    onKeyDown={interactive ? (event) => handleRowKeyDown(event, entry) : undefined}
                    aria-label={interactive ? `Open ${summary.playerName} player card` : undefined}
                  >
                    <td><strong>{rank}</strong></td>
                    <td>{summary.playerName}</td>
                    <td>{summary.teamName}</td>
                    <td>{formatRecord(summary)}</td>
                    <td>{summary.winPercentage.toFixed(1)}%</td>
                    <td>{formatPoints(summary)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className={styles.emptyState}>No published player results yet.</p>}
    </section>
  );
}

export function RankingsClient({overall, women, total}: RankingsClientProps) {
  const [selectedEntry, setSelectedEntry] = useState<HistoricalRankingEntry | null>(null);

  function openEntry(entry: HistoricalRankingEntry) {
    setSelectedEntry(entry);
  }

  return (
    <>
      <div className={styles.rankingsGrid}>
        <RankingTable id="top-25" title="Overall Top 25" entries={overall} interactive onOpen={openEntry} />
        <RankingTable id="women" title="Women's Top 10" entries={women} interactive onOpen={openEntry} />
        <RankingTable id="all" title="Total Rankings" entries={total} fullWidth onOpen={openEntry} />
      </div>

      {selectedEntry ? (
        <DialogShell
          title={selectedEntry.summary.playerName}
          eyebrow={`Rank #${selectedEntry.rank} player card`}
          size="large"
          onClose={() => setSelectedEntry(null)}
        >
          <div className={styles.playerCardDialog}>
            <div className={styles.playerCardLead}>
              <div className={styles.playerCardAvatar} aria-hidden="true">
                {selectedEntry.summary.playerName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span>{selectedEntry.summary.seasonName}</span>
                <h3>{selectedEntry.summary.teamName}</h3>
                <p>{selectedEntry.summary.matchesPlayed} matches played</p>
              </div>
            </div>

            <PublicPlayerProfileCard profile={createProfileFromHistoricalSummary(selectedEntry.summary)} compact />

            <div className={styles.dialogActions}>
              <button type="button" onClick={() => setSelectedEntry(null)} data-initial-focus>Close</button>
            </div>
          </div>
        </DialogShell>
      ) : null}
    </>
  );
}
