'use client';

import {useEffect, useMemo, useState} from 'react';
import {StatusBadge} from '@/components/imports/StatusBadge';
import {services} from '@/core/ServiceContainer';
import type {
  HistoricalImportPreview,
  HistoricalImportResult,
  HistoricalPlayerRecord,
} from '@/domain/history/HistoricalRecord';
import styles from './ImportManagement.module.css';

type Message = {type: 'success' | 'error'; text: string} | null;

type HistoricalOverview = {
  previews: HistoricalImportPreview[];
  appliedResult: HistoricalImportResult | undefined;
  totals: {
    seasons: number;
    teams: number;
    players: number;
  };
};

const EMPTY_OVERVIEW: HistoricalOverview = {
  previews: [],
  appliedResult: undefined,
  totals: {
    seasons: 0,
    teams: 0,
    players: 0,
  },
};

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

function getTopPlayers(players: HistoricalPlayerRecord[]): HistoricalPlayerRecord[] {
  return [...players]
    .filter((player) => player.overall.matchesPlayed > 0)
    .sort((left, right) =>
      right.overallWinPercentage - left.overallWinPercentage
      || right.overall.matchesPlayed - left.overall.matchesPlayed
      || left.playerName.localeCompare(right.playerName, undefined, {sensitivity: 'base'}),
    )
    .slice(0, 12);
}

export function ImportManagement() {
  const [overview, setOverview] = useState<HistoricalOverview>(EMPTY_OVERVIEW);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    services.historicalImports.getOverview()
      .then((nextOverview) => {
        if (cancelled) return;
        setOverview(nextOverview);
        setSelectedSeasonId((current) => current || nextOverview.previews[0]?.source.id || '');
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setMessage({type: 'error', text: 'Historical records could not be loaded.'});
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [revision]);

  const selectedPreview = useMemo(() => {
    return overview.previews.find((preview) => preview.source.id === selectedSeasonId)
      ?? overview.previews[0];
  }, [overview.previews, selectedSeasonId]);

  const filteredPlayers = useMemo(() => {
    if (!selectedPreview) return [];
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return getTopPlayers(selectedPreview.playerRecords);
    return selectedPreview.playerRecords
      .filter((player) => [
        player.playerName,
        player.teamName,
        player.pdgaNumber,
      ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch)))
      .sort((left, right) =>
        left.teamName.localeCompare(right.teamName, undefined, {sensitivity: 'base'})
        || left.playerName.localeCompare(right.playerName, undefined, {sensitivity: 'base'}),
      )
      .slice(0, 40);
  }, [search, selectedPreview]);

  async function handleApply() {
    setApplying(true);
    const result = await services.historicalImports.applyHistoricalRecords();
    setApplying(false);
    setMessage({
      type: 'success',
      text: `${result.seasonsApplied} seasons applied. ${result.teamsCreated} teams created, ${result.teamsUpdated} teams updated, ${result.playersCreated} players created, ${result.playersMatched} players matched.`,
    });
    setRevision((current) => current + 1);
  }

  return (
    <section className={styles.management}>
      {message ? (
        <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      <section className={styles.dashboard} aria-label="Historical import dashboard">
        <div><span>Seasons</span><strong>{overview.totals.seasons}</strong></div>
        <div><span>Teams</span><strong>{overview.totals.teams}</strong></div>
        <div><span>Players</span><strong>{overview.totals.players}</strong></div>
        <div><span>Status</span><strong>{overview.appliedResult ? 'Applied' : 'Ready'}</strong></div>
      </section>

      {overview.appliedResult ? (
        <section className={styles.applySummary} aria-label="Historical apply summary">
          <div><span>Teams created</span><strong>{overview.appliedResult.teamsCreated}</strong></div>
          <div><span>Teams updated</span><strong>{overview.appliedResult.teamsUpdated}</strong></div>
          <div><span>Players created</span><strong>{overview.appliedResult.playersCreated}</strong></div>
          <div><span>Players matched</span><strong>{overview.appliedResult.playersMatched}</strong></div>
        </section>
      ) : null}

      <div className={styles.listHeader}>
        <div>
          <span>Historical records</span>
          <h2>Workbook import</h2>
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={applying || Boolean(overview.appliedResult)}
          onClick={handleApply}
        >
          {overview.appliedResult ? 'Historical records applied' : applying ? 'Applying...' : 'Apply historical records'}
        </button>
      </div>

      {loading ? <div className={styles.loadingState}>Loading historical records...</div> : null}

      {!loading && overview.previews.length > 0 ? (
        <>
          <section className={styles.sourceGrid} aria-label="Historical sources">
            {overview.previews.map((preview) => (
              <button
                key={preview.source.id}
                type="button"
                className={preview.source.id === selectedPreview?.source.id ? styles.sourceCardActive : styles.sourceCard}
                onClick={() => setSelectedSeasonId(preview.source.id)}
              >
                <span>{preview.source.sourceFilename}</span>
                <strong>{preview.source.name}</strong>
                <small>{preview.teamCount} teams · {preview.playerCount} players</small>
                <StatusBadge status={preview.status} />
              </button>
            ))}
          </section>

          {selectedPreview ? (
            <section className={styles.previewPanel}>
              <header className={styles.previewHeader}>
                <div>
                  <span>Preview</span>
                  <h3>{selectedPreview.source.name}</h3>
                </div>
                <p>Actual match scores are ignored. Singles and doubles records are kept separate, then added for overall records.</p>
              </header>

              <section className={styles.validationSummary} aria-label="Historical validation summary">
                <div><span>Team records</span><strong>{selectedPreview.teamCount}</strong></div>
                <div><span>Player records</span><strong>{selectedPreview.playerCount}</strong></div>
                <div className={styles.validationMessages}>
                  <span>Warnings</span>
                  <ul>
                    {selectedPreview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              </section>

              <div className={styles.listHeader}>
                <div>
                  <span>Teams</span>
                  <h2>Team records</h2>
                </div>
                <p>Team percentage is calculated from points earned divided by points available.</p>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.historyImportTable}>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Record</th>
                      <th>Matches</th>
                      <th>Points</th>
                      <th>Points %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPreview.teamRecords.map((record) => (
                      <tr key={record.id}>
                        <td><strong>{record.teamName}</strong></td>
                        <td>{formatRecord(record)}</td>
                        <td>{record.matchesPlayed}</td>
                        <td>{record.pointsEarned} / {record.pointsAvailable}</td>
                        <td>{formatPercentage(record.pointsPercentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.playerPreviewHeader}>
                <div>
                  <span>Players</span>
                  <h2>{search ? 'Search results' : 'Top historical players'}</h2>
                </div>
                <label className={styles.searchControl}>
                  <span>Search players</span>
                  <input
                    type="search"
                    value={search}
                    placeholder="Search player or team"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.historyImportTable}>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Team</th>
                      <th>Singles</th>
                      <th>Doubles</th>
                      <th>Overall</th>
                      <th>Overall %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((record) => (
                      <tr key={record.id}>
                        <td><strong>{record.playerName}</strong></td>
                        <td>{record.teamName}</td>
                        <td>{formatRecord(record.singles)} · {record.singles.matchesPlayed}</td>
                        <td>{formatRecord(record.doubles)} · {record.doubles.matchesPlayed}</td>
                        <td>{formatRecord(record.overall)} · {record.overall.matchesPlayed}</td>
                        <td>{formatPercentage(record.overallWinPercentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
