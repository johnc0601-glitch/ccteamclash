'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect, useMemo, useRef, useState} from 'react';
import {loadFullStatsGroup} from '@/app/stats/actions';
import type {StatsGroup, StatsGroupOption, StatsRow} from '@/app/stats/page';
import {
  toStatsViewSearchParams,
  type StatsDirection as Direction,
  type StatsDivision as Division,
  type StatsLimit as Limit,
  type StatsSortKey as SortKey,
  type StatsViewState,
} from '@/services/stats/StatsViewState';
import styles from '@/app/stats/Stats.module.css';

const HEADER_HELP: Record<SortKey, string> = {
  clashIndex: 'Clash Index — Match Play player rating based on match results and opponent strength',
  matchesPlayed: 'Matches — Total recorded matches played.',
  wins: 'Wins — Total recorded match wins.',
  winPercentage: 'Win % — Percentage of completed matches won.',
  singles: 'Singles — Player wins, losses and ties in singles matches.',
  doubles: 'Doubles — Player wins, losses and ties in doubles matches.',
  points: 'Points — Total match points earned for the player’s team.',
  ciGain: 'CI +/- — Clash Index movement earned from recorded match results.',
  singlesCiGain: 'S +/- — Clash Index movement earned from singles results.',
  doublesCiGain: 'D +/- — Clash Index movement earned from doubles results.',
};

type StatsTableProps = {
  group: StatsGroup;
  groupOptions: StatsGroupOption[];
  initialView: StatsViewState;
  fullRowCount: number;
  teamOptions: string[];
  isPartial: boolean;
};

export function StatsTable({group, groupOptions, initialView, fullRowCount, teamOptions, isPartial}: StatsTableProps) {
  const router = useRouter();
  const [activeGroup, setActiveGroup] = useState(group);
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullLoadFailed, setFullLoadFailed] = useState(false);
  const fullLoadRef = useRef<Promise<void> | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(initialView.sortKey);
  const [direction, setDirection] = useState<Direction>(initialView.direction);
  const [limit, setLimit] = useState<Limit>(initialView.limit);
  const [division, setDivision] = useState<Division>(initialView.division);
  const [team, setTeam] = useState(() => initialView.team === 'all' || teamOptions.includes(initialView.team)
    ? initialView.team
    : 'all');
  const [search, setSearch] = useState(initialView.search);
  const dataIsPartial = isPartial && activeGroup.rows.length < fullRowCount;

  useEffect(() => {
    const params = toStatsViewSearchParams(group.id, {division, team, search: search.trim(), sortKey, direction, limit});
    const nextUrl = params.size ? `/stats?${params}` : '/stats';
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [group.id, division, team, search, sortKey, direction, limit]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeGroup.rows.filter((row) => {
      const divisionMatch = division === 'Women' ? row.gender === 'Women' : true;
      const teamMatch = team === 'all' || row.teamNames.includes(team);
      const searchMatch = !query || row.playerName.toLowerCase().includes(query) || row.teamNames.some((name) => name.toLowerCase().includes(query));
      return divisionMatch && teamMatch && searchMatch;
    });
  }, [activeGroup, division, team, search]);

  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => compareRows(a, b, sortKey, direction)), [filteredRows, sortKey, direction]);
  const rows = limit === 'all' ? sortedRows : sortedRows.slice(0, limit);
  const rankedRows = useMemo(() => rows.map((row, index) => ({row, rank: index + 1})), [rows]);
  const hasCustomView = division !== 'Open' || team !== 'all' || search.trim() !== '' || limit !== 25 || sortKey !== 'clashIndex' || direction !== 'desc';
  const playerCount = dataIsPartial ? fullRowCount : filteredRows.length;

  function requestFullGroup() {
    if (!dataIsPartial || fullLoadRef.current) return;
    setLoadingFull(true);
    setFullLoadFailed(false);
    const request = loadFullStatsGroup(group.id)
      .then((fullGroup) => {
        setActiveGroup(fullGroup);
      })
      .catch((error) => {
        fullLoadRef.current = null;
        setFullLoadFailed(true);
        console.error('[stats] Failed to lazy-load full stats group', error);
      })
      .finally(() => {
        setLoadingFull(false);
      });
    fullLoadRef.current = request;
  }

  function selectGroup(nextGroupId: string) {
    if (nextGroupId === group.id) return;
    router.replace(nextGroupId === 'overall' ? '/stats' : `/stats?season=${encodeURIComponent(nextGroupId)}`, {scroll: false});
  }

  function resetControls() {
    setDivision('Open');
    setTeam('all');
    setSearch('');
    setLimit(25);
    setSortKey('clashIndex');
    setDirection('desc');
  }

  function toggleSort(next: SortKey) {
    requestFullGroup();
    if (sortKey === next) {
      setDirection((value) => value === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortKey(next);
    setDirection('desc');
  }

  return (
    <section className={styles.statsShell}>
      <div className={styles.controls}>
        <div className={styles.seasonTabs} aria-label="Stats season">
          {groupOptions.map((entry) => (
            <button key={entry.id} type="button" aria-pressed={entry.id === group.id} className={entry.id === group.id ? styles.activeSeason : undefined} onClick={() => selectGroup(entry.id)}>
              {entry.label}
            </button>
          ))}
        </div>

        <div className={styles.secondaryControls}>
          <div className={styles.divisionTabs} aria-label="Stats division">
            <button type="button" aria-pressed={division === 'Open'} className={division === 'Open' ? styles.activeDivision : undefined} onClick={() => {requestFullGroup(); setDivision('Open'); setLimit(25);}}>Open</button>
            <button type="button" aria-pressed={division === 'Women'} className={division === 'Women' ? styles.activeDivision : undefined} onClick={() => {requestFullGroup(); setDivision('Women'); setLimit(25);}}>Women</button>
          </div>

          <select aria-label="Filter by team" value={team} onChange={(event) => {requestFullGroup(); setTeam(event.target.value); setLimit(25);}}>
            <option value="all">All teams</option>
            {teamOptions.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
          </select>

          <input aria-label="Search players" value={search} onChange={(event) => {requestFullGroup(); setSearch(event.target.value);}} placeholder="Search player" />
        </div>

        <div className={styles.mobileSortControl}>
          <select aria-label="Sort stats" value={sortKey} onChange={(event) => {requestFullGroup(); setSortKey(event.target.value as SortKey); setDirection('desc');}}>
            <option value="clashIndex">CI</option>
            <option value="points">Points</option>
            <option value="ciGain">CI +/-</option>
            <option value="singlesCiGain">Singles CI +/-</option>
            <option value="doublesCiGain">Doubles CI +/-</option>
            <option value="wins">Wins</option>
            <option value="winPercentage">Win %</option>
            <option value="matchesPlayed">Matches</option>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
          </select>
          <button type="button" onClick={() => {requestFullGroup(); setDirection((value) => value === 'desc' ? 'asc' : 'desc');}}>
            {direction === 'desc' ? 'High → Low' : 'Low → High'}
          </button>
        </div>
      </div>

      <div className={styles.tableMeta}>
        <div>
          <strong>{group.label} · {division}{team !== 'all' ? ` · ${team}` : ''}</strong>
          <span>{loadingFull ? 'Loading full stats…' : fullLoadFailed ? 'Full stats could not load — try the control again.' : `${playerCount} players · ranked by ${sortLabel(sortKey)} ${direction === 'desc' ? '↓' : '↑'}`}</span>
        </div>
        <div className={styles.tableActions}>
          <label className={styles.showControl}>
            <span>Show</span>
            <select value={limit} onChange={(event) => {const nextLimit = event.target.value === 'all' ? 'all' : 25; if (nextLimit === 'all') requestFullGroup(); setLimit(nextLimit);}}>
              <option value={25}>Top 25</option>
              <option value="all">All</option>
            </select>
          </label>
          {hasCustomView ? <button type="button" className={styles.resetButton} onClick={resetControls}>Reset view</button> : null}
        </div>
      </div>

      <div className={`${styles.tableWrap} ${styles.desktopTableWrap}`}>
        <table className={styles.statsTable}>
          <thead><tr>
            <th aria-label="Player" />
            <SortableHeader label="CI" sort="clashIndex" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="M" sort="matchesPlayed" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="W" sort="wins" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="Win %" sort="winPercentage" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="Singles" sort="singles" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="Doubles" sort="doubles" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="Pts" sort="points" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="CI +/-" sort="ciGain" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="S +/-" sort="singlesCiGain" active={sortKey} direction={direction} onSort={toggleSort} />
            <SortableHeader label="D +/-" sort="doublesCiGain" active={sortKey} direction={direction} onSort={toggleSort} />
          </tr></thead>
          <tbody>
            {rankedRows.map(({row, rank}) => (
              <tr key={`${group.id}-${row.playerId}`}>
                <td><span className={styles.rank}>{rank}</span><Link className={styles.playerLink} href={`/players?player=${encodeURIComponent(row.playerId)}`}>{row.playerName}</Link></td>
                <td><strong>{formatCi(row.clashIndex)}</strong></td>
                <td>{row.matchesPlayed}</td>
                <td>{row.wins}</td>
                <td>{row.winPercentage.toFixed(1)}%{row.matchesPlayed < 5 ? <span className={styles.smallSample}>*</span> : null}</td>
                <td>{formatRecord(row.singlesWins, row.singlesLosses, row.singlesTies)}</td>
                <td>{formatRecord(row.doublesWins, row.doublesLosses, row.doublesTies)}</td>
                <td><strong>{formatPoints(row.points)}</strong></td>
                <td><strong>{formatCiGain(row.ciGain)}</strong></td>
                <td>{formatCiGain(row.singlesCiGain)}</td>
                <td>{formatCiGain(row.doublesCiGain)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className={styles.emptyState}>No players match these filters.</p> : null}
      </div>

      <p className={styles.qualifierNote}>* Fewer than 5 recorded results. CI is current for Overall/live views and season-ending for historical views. CI +/-, S +/- and D +/- count earned match movement only; season reseeds are excluded.</p>
    </section>
  );
}

function SortableHeader({label, sort, active, direction, onSort}: {label: string; sort: SortKey; active: SortKey; direction: Direction; onSort: (sort: SortKey) => void}) {
  return (
    <th aria-sort={active === sort ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <span className={styles.headerCell}>
        <button type="button" onClick={() => onSort(sort)}>{label}<span aria-hidden="true">{active === sort ? (direction === 'desc' ? ' ↓' : ' ↑') : ''}</span></button>
        <span
          className={styles.headerInfo}
          title={HEADER_HELP[sort]}
          aria-label={`About ${label}: ${HEADER_HELP[sort]}`}
          tabIndex={0}
          style={{
            width: 13,
            height: 13,
            display: 'inline-grid',
            placeItems: 'center',
            border: '1px solid #8d9496',
            borderRadius: '50%',
            color: '#697174',
            fontFamily: 'Arial, sans-serif',
            fontSize: 8,
            fontStyle: 'normal',
            fontWeight: 900,
            lineHeight: 1,
            cursor: 'help',
          }}
        >i</span>
      </span>
    </th>
  );
}

function compareRows(a: StatsRow, b: StatsRow, key: SortKey, direction: Direction): number {
  const factor = direction === 'asc' ? 1 : -1;
  if (key === 'singles') return (recordPoints(a.singlesWins, a.singlesTies) - recordPoints(b.singlesWins, b.singlesTies)) * factor || a.playerName.localeCompare(b.playerName);
  if (key === 'doubles') return (recordPoints(a.doublesWins, a.doublesTies) - recordPoints(b.doublesWins, b.doublesTies)) * factor || a.playerName.localeCompare(b.playerName);
  if (key === 'clashIndex' || key === 'ciGain' || key === 'singlesCiGain' || key === 'doublesCiGain') {
    const aValue = a[key];
    const bValue = b[key];
    if (aValue === undefined && bValue === undefined) return a.playerName.localeCompare(b.playerName);
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    return (aValue - bValue) * factor || a.playerName.localeCompare(b.playerName);
  }
  return (a[key] - b[key]) * factor || a.playerName.localeCompare(b.playerName);
}

function sortLabel(key: SortKey): string {
  return ({
    clashIndex: 'CI', matchesPlayed: 'matches', wins: 'wins', winPercentage: 'win %', points: 'points',
    singles: 'singles', doubles: 'doubles', ciGain: 'CI +/-',
    singlesCiGain: 'Singles CI +/-', doublesCiGain: 'Doubles CI +/-',
  } as const)[key];
}

function recordPoints(wins: number, ties: number): number {
  return wins + ties * .5;
}

function formatRecord(wins: number, losses: number, ties: number): string {
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

function formatCi(value: number | undefined): string {
  return value === undefined ? '—' : String(Math.round(value));
}

function formatCiGain(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}
