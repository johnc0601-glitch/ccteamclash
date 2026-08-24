'use client';

import {useMemo, useState} from 'react';
import type {StatsGroup, StatsRow} from '@/app/stats/page';
import styles from '@/app/stats/Stats.module.css';

type SortKey = keyof Pick<StatsRow,
  'playerName' | 'teamName' | 'matchesPlayed' | 'wins' | 'losses' | 'ties' | 'winPercentage' | 'points'
> | 'singles' | 'doubles';
type Direction = 'asc' | 'desc';
type Limit = 5 | 10 | 25 | 'all';
type Division = 'Open' | 'Women';

export function StatsTable({groups, initialGroupId = 'overall'}: {groups: StatsGroup[]; initialGroupId?: string}) {
  const validInitialGroupId = groups.some((group) => group.id === initialGroupId) ? initialGroupId : groups[0]?.id ?? 'overall';
  const [groupId, setGroupId] = useState(validInitialGroupId);
  const [sortKey, setSortKey] = useState<SortKey>('points');
  const [direction, setDirection] = useState<Direction>('desc');
  const [limit, setLimit] = useState<Limit>(5);
  const [division, setDivision] = useState<Division>('Open');
  const [search, setSearch] = useState('');

  const group = groups.find((entry) => entry.id === groupId) ?? groups[0];
  const filteredRows = useMemo(() => {
    if (!group) return [];
    const query = search.trim().toLowerCase();
    return group.rows.filter((row) => {
      const divisionMatch = division === 'Women' ? row.gender === 'Women' : true;
      const searchMatch = !query || row.playerName.toLowerCase().includes(query) || row.teamName.toLowerCase().includes(query);
      return divisionMatch && searchMatch;
    });
  }, [group, division, search]);

  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => compareRows(a, b, sortKey, direction)), [filteredRows, sortKey, direction]);
  const rows = limit === 'all' ? sortedRows : sortedRows.slice(0, limit);

  function toggleSort(next: SortKey) {
    if (sortKey === next) {
      setDirection((value) => value === 'desc' ? 'asc' : 'desc');
      return;
    }
    setSortKey(next);
    setDirection(next === 'playerName' || next === 'teamName' ? 'asc' : 'desc');
  }

  if (!group) return null;

  return (
    <section className={styles.statsShell}>
      <div className={styles.controls}>
        <div className={styles.seasonTabs} aria-label="Stats season">
          {groups.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === group.id ? styles.activeSeason : undefined}
              onClick={() => {setGroupId(entry.id); setLimit(5); setSearch('');}}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className={styles.secondaryControls}>
          <div className={styles.divisionTabs} aria-label="Stats division">
            <button type="button" className={division === 'Open' ? styles.activeDivision : undefined} onClick={() => {setDivision('Open'); setLimit(5);}}>Open</button>
            <button type="button" className={division === 'Women' ? styles.activeDivision : undefined} onClick={() => {setDivision('Women'); setLimit(5);}}>Women</button>
          </div>

          <label className={styles.searchControl}>
            <span className="sr-only">Search players or teams</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player or team" />
          </label>

          <label className={styles.limitControl}>
            <span>Show</span>
            <select value={limit} onChange={(event) => setLimit(event.target.value === 'all' ? 'all' : Number(event.target.value) as 5 | 10 | 25)}>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.tableMeta}>
        <strong>{group.label} · {division}</strong>
        <span>{filteredRows.length} players</span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.statsTable}>
          <thead>
            <tr>
              <SortableHeader label="Player" sort="playerName" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Team" sort="teamName" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Matches" sort="matchesPlayed" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Wins" sort="wins" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Losses" sort="losses" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Ties" sort="ties" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Win %" sort="winPercentage" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Singles" sort="singles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Doubles" sort="doubles" active={sortKey} direction={direction} onSort={toggleSort} />
              <SortableHeader label="Points" sort="points" active={sortKey} direction={direction} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${group.id}-${row.playerId}`}>
                <td data-label="Player"><span className={styles.rank}>{index + 1}</span><strong>{row.playerName}</strong></td>
                <td data-label="Team">{row.teamName}</td>
                <td data-label="Matches">{row.matchesPlayed}</td>
                <td data-label="Wins">{row.wins}</td>
                <td data-label="Losses">{row.losses}</td>
                <td data-label="Ties">{row.ties}</td>
                <td data-label="Win %">{row.winPercentage.toFixed(1)}%</td>
                <td data-label="Singles">{formatRecord(row.singlesWins, row.singlesLosses, row.singlesTies)}</td>
                <td data-label="Doubles">{formatRecord(row.doublesWins, row.doublesLosses, row.doublesTies)}</td>
                <td data-label="Points"><strong>{formatPoints(row.points)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <p className={styles.emptyState}>No players match these filters.</p> : null}
      </div>
    </section>
  );
}

function SortableHeader({label, sort, active, direction, onSort}: {
  label: string;
  sort: SortKey;
  active: SortKey;
  direction: Direction;
  onSort: (sort: SortKey) => void;
}) {
  return (
    <th>
      <button type="button" onClick={() => onSort(sort)}>
        {label}
        <span aria-hidden="true">{active === sort ? (direction === 'desc' ? ' ↓' : ' ↑') : ' ↕'}</span>
      </button>
    </th>
  );
}

function compareRows(a: StatsRow, b: StatsRow, key: SortKey, direction: Direction): number {
  const factor = direction === 'asc' ? 1 : -1;
  if (key === 'playerName' || key === 'teamName') return a[key].localeCompare(b[key], undefined, {sensitivity: 'base'}) * factor;
  if (key === 'singles') return (recordPoints(a.singlesWins, a.singlesTies) - recordPoints(b.singlesWins, b.singlesTies)) * factor || a.playerName.localeCompare(b.playerName);
  if (key === 'doubles') return (recordPoints(a.doublesWins, a.doublesTies) - recordPoints(b.doublesWins, b.doublesTies)) * factor || a.playerName.localeCompare(b.playerName);
  return (a[key] - b[key]) * factor || a.playerName.localeCompare(b.playerName);
}

function recordPoints(wins: number, ties: number): number {return wins + ties * .5;}
function formatRecord(wins: number, losses: number, ties: number): string {return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;}
function formatPoints(points: number): string {return Number.isInteger(points) ? points.toFixed(0) : points.toFixed(1);}
