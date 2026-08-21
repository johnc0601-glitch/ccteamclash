'use client';

import {useState, type CSSProperties, type KeyboardEvent, type ReactNode} from 'react';
import {PublicPlayerProfileCard} from '@/components/players/PublicPlayerProfileCard';
import {DialogShell} from '@/components/teams/DialogShell';
import type {HistoricalPlayerSeasonSummary} from '@/data/historicalSeed';
import {createProfileFromHistoricalSummary} from '@/services/playerProfiles';
import styles from '@/app/rankings/Rankings.module.css';

export type HistoricalRankingEntry = {rank: number; summary: HistoricalPlayerSeasonSummary};
export type ClashRankingEntry = {rank: number; playerId: string; playerName: string; teamName: string; clashIndex: number; ratingChange: number | null; gender: 'Male' | 'Female' | 'Unknown'};
export type SeasonRankingGroup = {seasonId: string; seasonName: string; open: HistoricalRankingEntry[]; women: HistoricalRankingEntry[]; junior?: HistoricalRankingEntry[]};
type RankingsClientProps = {current?: SeasonRankingGroup; history: SeasonRankingGroup[]; clash: {open: ClashRankingEntry[]; women: ClashRankingEntry[]; junior: ClashRankingEntry[]}; teamColors: Record<string, string>};
type MainTab = 'season' | 'history' | 'clash';
type Division = 'open' | 'women' | 'junior';

export function RankingsClient({current, history, clash, teamColors}: RankingsClientProps) {
  const [tab, setTab] = useState<MainTab>('season');
  const [selectedEntry, setSelectedEntry] = useState<HistoricalRankingEntry | null>(null);
  return <>
    <nav className={styles.mainTabs} aria-label="Ranking views">
      <TabButton active={tab === 'season'} onClick={() => setTab('season')}>Season</TabButton>
      <TabButton active={tab === 'history'} onClick={() => setTab('history')}>History</TabButton>
      <TabButton active={tab === 'clash'} onClick={() => setTab('clash')}>Clash Index</TabButton>
    </nav>
    {tab === 'season' ? (current ? <SeasonSection group={current} includeJunior onOpen={setSelectedEntry} teamColors={teamColors} /> : <p className={styles.emptyState}>No current-season rankings are available yet.</p>) : null}
    {tab === 'history' ? <HistorySection groups={history} onOpen={setSelectedEntry} teamColors={teamColors} /> : null}
    {tab === 'clash' ? <ClashSection rankings={clash} teamColors={teamColors} /> : null}
    {selectedEntry ? <DialogShell title={selectedEntry.summary.playerName} eyebrow={`Rank #${selectedEntry.rank} player card`} size="large" onClose={() => setSelectedEntry(null)}>
      <div className={styles.playerCardDialog}><div className={styles.playerCardLead}><div className={styles.playerCardAvatar} aria-hidden="true">{selectedEntry.summary.playerName.slice(0, 2).toUpperCase()}</div><div><span>{selectedEntry.summary.seasonName}</span><h3>{selectedEntry.summary.teamName}</h3><p>{selectedEntry.summary.matchesPlayed} matches played</p></div></div><PublicPlayerProfileCard profile={createProfileFromHistoricalSummary(selectedEntry.summary)} compact /><div className={styles.dialogActions}><button type="button" onClick={() => setSelectedEntry(null)} data-initial-focus>Close</button></div></div>
    </DialogShell> : null}
  </>;
}

function TabButton({active, onClick, children}: {active: boolean; onClick: () => void; children: ReactNode}) {return <button type="button" className={active ? styles.activeTab : undefined} onClick={onClick}>{children}</button>;}

function SeasonSection({group, includeJunior, onOpen, teamColors}: {group: SeasonRankingGroup; includeJunior: boolean; onOpen: (entry: HistoricalRankingEntry) => void; teamColors: Record<string, string>}) {
  const [division, setDivision] = useState<Division>('open'); const [showAll, setShowAll] = useState(false);
  const entries = division === 'women' ? group.women : division === 'junior' ? group.junior ?? [] : group.open; const visible = showAll ? entries : entries.slice(0, 5);
  return <section className={styles.tabPanel}><header className={styles.sectionHeading}><div><span className="eyebrow">Current season</span><h2>{group.seasonName}</h2></div></header><DivisionTabs division={division} onChange={(next) => {setDivision(next); setShowAll(false);}} includeJunior={includeJunior} /><SeasonTable entries={visible} onOpen={onOpen} teamColors={teamColors} />{entries.length > 5 ? <button type="button" className={styles.viewAll} onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show Top 5' : `View All ${entries.length}`}</button> : null}</section>;
}

function HistorySection({groups, onOpen, teamColors}: {groups: SeasonRankingGroup[]; onOpen: (entry: HistoricalRankingEntry) => void; teamColors: Record<string, string>}) {
  if (!groups.length) return <p className={styles.emptyState}>No previous seasons are available yet.</p>;
  return <section className={styles.tabPanel}><div className={styles.historyList}>{groups.map((group, index) => <HistoricalSeason key={group.seasonId} group={group} defaultOpen={index === 0} onOpen={onOpen} teamColors={teamColors} />)}</div></section>;
}

function HistoricalSeason({group, defaultOpen, onOpen, teamColors}: {group: SeasonRankingGroup; defaultOpen: boolean; onOpen: (entry: HistoricalRankingEntry) => void; teamColors: Record<string, string>}) {
  const [division, setDivision] = useState<Division>('open'); const [showAll, setShowAll] = useState(false); const entries = division === 'women' ? group.women : group.open;
  return <details className={styles.historySeason} open={defaultOpen}><summary><span>{group.seasonName}</span><small>Open season rankings</small></summary><div className={styles.historyBody}><DivisionTabs division={division} onChange={(next) => {setDivision(next); setShowAll(false);}} includeJunior={false} /><SeasonTable entries={showAll ? entries : entries.slice(0, 5)} onOpen={onOpen} teamColors={teamColors} />{entries.length > 5 ? <button type="button" className={styles.viewAll} onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show Top 5' : `View All ${entries.length}`}</button> : null}</div></details>;
}

function ClashSection({rankings, teamColors}: {rankings: RankingsClientProps['clash']; teamColors: Record<string, string>}) {
  const [division, setDivision] = useState<Division>('open'); const [showAll, setShowAll] = useState(false); const entries = rankings[division]; const defaultCount = division === 'open' ? 25 : 5; const visible = showAll ? entries : entries.slice(0, defaultCount);
  return <section className={styles.tabPanel}><header className={styles.sectionHeading}><div><span className="eyebrow">Current ratings</span><h2>Clash Index</h2></div><p>Clash Index is a match-play rating and is separate from season standings.</p></header><DivisionTabs division={division} onChange={(next) => {setDivision(next); setShowAll(false);}} includeJunior /><ClashTable entries={visible} teamColors={teamColors} />{entries.length > defaultCount ? <button type="button" className={styles.viewAll} onClick={() => setShowAll((value) => !value)}>{showAll ? `Show Top ${defaultCount}` : `View All ${entries.length}`}</button> : null}</section>;
}

function DivisionTabs({division, onChange, includeJunior}: {division: Division; onChange: (division: Division) => void; includeJunior: boolean}) {return <div className={styles.divisionTabs} role="tablist" aria-label="Ranking division"><TabButton active={division === 'open'} onClick={() => onChange('open')}>Open</TabButton><TabButton active={division === 'women'} onClick={() => onChange('women')}>Women</TabButton>{includeJunior ? <TabButton active={division === 'junior'} onClick={() => onChange('junior')}>Junior</TabButton> : null}</div>;}

function SeasonTable({entries, onOpen, teamColors}: {entries: HistoricalRankingEntry[]; onOpen: (entry: HistoricalRankingEntry) => void; teamColors: Record<string, string>}) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, entry: HistoricalRankingEntry) {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); onOpen(entry);}}
  if (!entries.length) return <p className={styles.emptyState}>No ranked players are available in this division yet.</p>;
  return <div className={styles.tableWrap}><table className={styles.rankingTable}><thead><tr><th>Rank</th><th>Player</th><th>Team</th><th>Record</th><th>Points</th></tr></thead><tbody>{entries.map((entry) => <tr key={`${entry.summary.seasonId}-${entry.summary.playerId}`} className={styles.clickableRow} data-team={entry.summary.teamName} style={teamAccentStyle(teamColors[entry.summary.teamName])} tabIndex={0} role="button" onClick={() => onOpen(entry)} onKeyDown={(event) => handleRowKeyDown(event, entry)} aria-label={`Open ${entry.summary.playerName} player card`}><td><strong>{entry.rank}</strong></td><td>{entry.summary.playerName}</td><td>{entry.summary.teamName}</td><td>{formatRecord(entry.summary)}</td><td>{formatPoints(entry.summary)}</td></tr>)}</tbody></table></div>;
}

function ClashTable({entries, teamColors}: {entries: ClashRankingEntry[]; teamColors: Record<string, string>}) {
  if (!entries.length) return <p className={styles.emptyState}>No Clash Index ratings are available in this division yet.</p>;
  return <div className={styles.tableWrap}><table className={styles.rankingTable}><thead><tr><th>Rank</th><th>Player</th><th>Team</th><th>Clash Index</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.playerId} data-team={entry.teamName} style={teamAccentStyle(teamColors[entry.teamName])}><td><strong>{entry.rank}</strong></td><td>{entry.playerName}</td><td>{entry.teamName}</td><td className={styles.clashValue}><span>{entry.clashIndex}</span>{entry.ratingChange !== null ? <span style={{marginLeft: 8, fontSize: 12, fontWeight: 950, color: entry.ratingChange > 0 ? '#16834d' : entry.ratingChange < 0 ? '#c33b35' : '#78807d'}} aria-label={`${entry.ratingChange >= 0 ? 'plus ' : 'minus '}${Math.abs(entry.ratingChange)} from the latest event`}>{formatRatingChange(entry.ratingChange)}</span> : null}</td></tr>)}</tbody></table></div>;
}

function teamAccentStyle(color?: string): CSSProperties {return color ? ({'--team-accent': color} as CSSProperties) : {};}
function formatRatingChange(change: number): string {return change > 0 ? `+${change}` : `${change}`;}
function formatRecord(summary: HistoricalPlayerSeasonSummary): string {const {wins, losses, ties} = summary.overallRecord; return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;}
function formatPoints(summary: HistoricalPlayerSeasonSummary): string {const points = summary.overallRecord.wins + summary.overallRecord.ties * .5; return Number.isInteger(points) ? points.toFixed(0) : points.toFixed(1);}
