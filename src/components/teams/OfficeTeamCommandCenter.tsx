'use client';

import {useMemo, useState} from 'react';
import {TeamManagement} from '@/components/teams/TeamManagement';
import {calculateRosterBasedMatchPrediction} from '@/services/teamStrength/MatchPrediction';
import {TEAM_HOME_CI_BONUS, type TeamVenue} from '@/services/teamStrength/TeamStrength';
import {
  sortOfficeRosterPlayers,
  type OfficeRosterPlayer,
  type OfficeScheduledMatch,
  type OfficeTeamCommandCenterData,
  type OfficeTeamDashboard,
} from './officeTeamDashboard';
import styles from './OfficeTeamCommandCenter.module.css';

type TabId = 'rosters' | 'predictor' | 'setup';
type TeamSort = 'strength' | 'name' | 'roster';
type VenueSelection = 'teamA' | 'neutral' | 'teamB';
type PredictionPool = 'active' | 'attendance';

type TeamRosterProps = {
  team: OfficeTeamDashboard;
  search: string;
};

export function OfficeTeamCommandCenter({data}: {data: OfficeTeamCommandCenterData}) {
  const [tab, setTab] = useState<TabId>('rosters');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<TeamSort>('strength');
  const [openTeamId, setOpenTeamId] = useState<string | null>(data.teams[0]?.id ?? null);

  const visibleTeams = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    const filtered = normalized
      ? data.teams.filter((team) =>
          team.name.toLocaleLowerCase().includes(normalized)
          || team.shortName.toLocaleLowerCase().includes(normalized)
          || team.players.some((player) => player.name.toLocaleLowerCase().includes(normalized)))
      : [...data.teams];

    return filtered.sort((left, right) => {
      if (sort === 'roster') {
        return right.rosterCount - left.rosterCount || left.name.localeCompare(right.name);
      }
      if (sort === 'strength') {
        const leftStrength = left.activeStrength?.baseStrength ?? Number.NEGATIVE_INFINITY;
        const rightStrength = right.activeStrength?.baseStrength ?? Number.NEGATIVE_INFINITY;
        return rightStrength - leftStrength || left.name.localeCompare(right.name);
      }
      return left.name.localeCompare(right.name, undefined, {sensitivity: 'base'});
    });
  }, [data.teams, search, sort]);

  return (
    <section className={styles.commandCenter}>
      <div className={styles.tabs} role="tablist" aria-label="Team office views">
        <TabButton active={tab === 'rosters'} onClick={() => setTab('rosters')}>Rosters</TabButton>
        <TabButton active={tab === 'predictor'} onClick={() => setTab('predictor')}>Matchup Predictor</TabButton>
        <TabButton active={tab === 'setup'} onClick={() => setTab('setup')}>Team Setup</TabButton>
      </div>

      {tab === 'rosters' ? (
        <div role="tabpanel">
          <div className={styles.summaryStrip}>
            <span><strong>{data.teams.length}</strong> teams</span>
            <span><strong>{data.rosteredPlayerCount}</strong> rostered</span>
            <span><strong>{data.seasonName}</strong></span>
          </div>

          {data.rosterError ? <div className={styles.errorMessage} role="alert">{data.rosterError}</div> : null}

          <div className={styles.rosterToolbar}>
            <label className={styles.searchField}>
              <span>Search player or team</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search rosters"
              />
            </label>
            <label className={styles.sortField}>
              <span>Team order</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as TeamSort)}>
                <option value="strength">Strength</option>
                <option value="name">Name</option>
                <option value="roster">Roster size</option>
              </select>
            </label>
          </div>

          {visibleTeams.length ? (
            <>
              <div className={styles.desktopBoard} aria-label="Team roster comparison board">
                {visibleTeams.map((team) => (
                  <article className={styles.teamColumn} key={team.id}>
                    <TeamHeader team={team} />
                    <TeamRoster team={team} search={search} />
                  </article>
                ))}
              </div>

              <div className={styles.mobileTeams}>
                {visibleTeams.map((team) => {
                  const open = openTeamId === team.id;
                  return (
                    <article className={styles.mobileTeam} key={team.id}>
                      <button
                        type="button"
                        className={styles.mobileTeamToggle}
                        aria-expanded={open}
                        onClick={() => setOpenTeamId(open ? null : team.id)}
                      >
                        <span>
                          <strong>{team.name}</strong>
                          <small>{team.rosterCount} players · {strengthLabel(team)}</small>
                        </span>
                        <span aria-hidden="true">{open ? '−' : '+'}</span>
                      </button>
                      {open ? (
                        <div className={styles.mobileTeamBody}>
                          <TeamHeader team={team} compact />
                          <TeamRoster team={team} search={search} />
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>No roster matches that search.</div>
          )}
        </div>
      ) : null}

      {tab === 'predictor' ? <MatchupPredictor data={data} /> : null}
      {tab === 'setup' ? <div role="tabpanel"><TeamManagement /></div> : null}
    </section>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? `${styles.tabButton} ${styles.activeTab}` : styles.tabButton}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function TeamHeader({team, compact = false}: {team: OfficeTeamDashboard; compact?: boolean}) {
  const strength = team.activeStrength;
  return (
    <header className={compact ? styles.compactHeader : styles.teamHeader}>
      {!compact ? (
        <div className={styles.teamTitleRow}>
          <div>
            <span className={styles.teamEyebrow}>{team.shortName}</span>
            <h2>{team.name}</h2>
          </div>
          {team.strengthRank ? <span className={styles.rankBadge}>#{team.strengthRank}</span> : null}
        </div>
      ) : null}

      <div className={styles.teamMeta}>
        <span>Captain: {team.captain || 'Not assigned'}</span>
        <span>{team.rosterCount} players · {team.womenCount} women</span>
      </div>

      <div className={styles.strengthSummary}>
        <div>
          <span>Roster Strength</span>
          <strong>{strength ? Math.round(strength.baseStrength) : '—'}</strong>
        </div>
        <div>
          <span>Coming Strength</span>
          <strong>{team.currentAttendanceStrength ? Math.round(team.currentAttendanceStrength.baseStrength) : '—'}</strong>
        </div>
      </div>

      {team.nextMatch ? (
        <div className={styles.nextMatch}>
          <strong>Next: {team.nextMatch.isHome ? 'vs' : '@'} {team.nextMatch.opponentName}</strong>
          <span>{team.nextMatch.date} · {team.nextMatch.time} · {team.nextMatch.course}</span>
          {team.attendanceCounts ? (
            <span>{team.attendanceCounts.playing} coming · {team.attendanceCounts.unconfirmed} waiting · {team.attendanceCounts.notPlaying} out</span>
          ) : team.attendanceAvailable ? null : <span>Attendance unavailable</span>}
        </div>
      ) : (
        <div className={styles.nextMatch}><span>No upcoming match</span></div>
      )}

      {strength ? (
        <details className={styles.strengthDetails}>
          <summary>Strength details</summary>
          <div className={styles.strengthGrid}>
            <span><small>Top 6</small><strong>{Math.round(strength.topSixCi)}</strong></span>
            <span><small>Next 6</small><strong>{Math.round(strength.nextSixCi)}</strong></span>
            <span><small>Depth</small><strong>{Math.round(strength.depthCi)}</strong></span>
            <span><small>Confidence</small><strong>{strength.confidence}</strong></span>
          </div>
        </details>
      ) : null}
    </header>
  );
}

function TeamRoster({team, search}: TeamRosterProps) {
  const normalized = search.trim().toLocaleLowerCase();
  const teamNameMatches = normalized && (
    team.name.toLocaleLowerCase().includes(normalized)
    || team.shortName.toLocaleLowerCase().includes(normalized)
  );
  const players = sortOfficeRosterPlayers(
    team.players,
    Boolean(team.nextMatch && team.attendanceAvailable),
  ).filter((player) => !normalized || teamNameMatches || player.name.toLocaleLowerCase().includes(normalized));

  return (
    <div className={styles.rosterBody}>
      <div className={styles.rosterHeading}><span>Player</span><span>CI</span></div>
      {players.length ? (
        <ol className={styles.rosterList}>
          {players.map((player) => <PlayerRow key={player.id} player={player} />)}
        </ol>
      ) : (
        <div className={styles.noPlayers}>No matching player.</div>
      )}
    </div>
  );
}

function PlayerRow({player}: {player: OfficeRosterPlayer}) {
  const dotClass = player.attendanceStatus === 'Playing'
    ? styles.playingDot
    : player.attendanceStatus === 'NotPlaying'
      ? styles.notPlayingDot
      : '';
  const dotLabel = player.attendanceStatus === 'Playing'
    ? 'Playing'
    : player.attendanceStatus === 'NotPlaying'
      ? 'Not playing'
      : undefined;
  const ci = player.strengthCi ? Math.round(player.strengthCi) : null;
  const ciLabel = ci == null ? '—' : `${player.strengthCiProvisional ? '~' : ''}${ci}`;
  const detail = [
    player.pdgaNumber ? `PDGA #${player.pdgaNumber}` : '',
    player.pdgaRating ? `PDGA ${player.pdgaRating}` : '',
    player.strengthCiProvisional ? 'provisional strength input' : '',
  ].filter(Boolean).join(' · ');

  return (
    <li className={player.gender === 'Female' ? `${styles.playerRow} ${styles.femaleRow}` : styles.playerRow}>
      <span className={styles.playerIdentity} title={detail || undefined}>
        <span className={styles.dotSlot}>
          {dotClass ? <span className={`${styles.attendanceDot} ${dotClass}`} aria-label={dotLabel} /> : null}
        </span>
        <span className={styles.playerName}>{player.name}</span>
      </span>
      <span className={styles.playerCi}>{ciLabel}</span>
    </li>
  );
}

function MatchupPredictor({data}: {data: OfficeTeamCommandCenterData}) {
  const [teamAId, setTeamAId] = useState(data.teams[0]?.id ?? '');
  const [teamBId, setTeamBId] = useState(data.teams.find((team) => team.id !== data.teams[0]?.id)?.id ?? '');
  const [venue, setVenue] = useState<VenueSelection>('neutral');
  const [pool, setPool] = useState<PredictionPool>('active');
  const [scheduledMatchId, setScheduledMatchId] = useState('');

  const teamA = data.teams.find((team) => team.id === teamAId);
  const teamB = data.teams.find((team) => team.id === teamBId);
  const sharedNextMatch = teamA?.nextMatch?.id && teamA.nextMatch.id === teamB?.nextMatch?.id
    ? teamA.nextMatch.id
    : null;
  const attendancePoolAvailable = Boolean(
    sharedNextMatch
    && teamA?.currentAttendanceStrength
    && teamB?.currentAttendanceStrength,
  );
  const effectivePool: PredictionPool = pool === 'attendance' && attendancePoolAvailable ? 'attendance' : 'active';
  const teamAStrength = effectivePool === 'attendance' ? teamA?.currentAttendanceStrength : teamA?.activeStrength;
  const teamBStrength = effectivePool === 'attendance' ? teamB?.currentAttendanceStrength : teamB?.activeStrength;

  const venueA = venueForSelection(venue, 'A');
  const venueB = venueForSelection(venue, 'B');
  const predictionA = teamAStrength && teamBStrength
    ? calculateRosterBasedMatchPrediction({team: teamAStrength, opponent: teamBStrength, venue: venueA})
    : undefined;
  const predictionB = teamAStrength && teamBStrength
    ? calculateRosterBasedMatchPrediction({team: teamBStrength, opponent: teamAStrength, venue: venueB})
    : undefined;
  const chanceA = predictionA?.displayChanceOfVictory;
  const chanceB = predictionB?.displayChanceOfVictory;

  function setManualTeam(side: 'A' | 'B', teamId: string) {
    setScheduledMatchId('');
    setPool('active');
    if (side === 'A') setTeamAId(teamId);
    else setTeamBId(teamId);
  }

  function loadScheduledMatch(matchId: string) {
    setScheduledMatchId(matchId);
    setPool('active');
    const match = data.scheduledMatches.find((candidate) => candidate.id === matchId);
    if (!match) return;
    setTeamAId(match.awayTeamId);
    setTeamBId(match.homeTeamId);
    setVenue(match.homeAdvantageApplies ? 'teamB' : 'neutral');
  }

  if (data.teams.length < 2) {
    return <div className={styles.emptyState}>At least two active teams are required for a matchup prediction.</div>;
  }

  return (
    <div className={styles.predictor} role="tabpanel">
      <div className={styles.predictorIntro}>
        <span>Commissioner tool</span>
        <h2>Matchup Predictor</h2>
        <p>Compare any two active rosters, or load a scheduled matchup with its actual venue classification.</p>
      </div>

      <label className={styles.fullField}>
        <span>Scheduled matchup</span>
        <select value={scheduledMatchId} onChange={(event) => loadScheduledMatch(event.target.value)}>
          <option value="">Manual matchup</option>
          {data.scheduledMatches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.date} — {match.awayTeamName} at {match.homeTeamName}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.predictorTeams}>
        <label>
          <span>Team A</span>
          <select value={teamAId} onChange={(event) => setManualTeam('A', event.target.value)}>
            {data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <span className={styles.versus}>vs</span>
        <label>
          <span>Team B</span>
          <select value={teamBId} onChange={(event) => setManualTeam('B', event.target.value)}>
            {data.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.predictorControlGroup}>
        <span>Venue</span>
        <div className={styles.segmentedControls}>
          <button type="button" className={venue === 'teamA' ? styles.selectedSegment : ''} onClick={() => { setScheduledMatchId(''); setVenue('teamA'); }}>Team A Home</button>
          <button type="button" className={venue === 'neutral' ? styles.selectedSegment : ''} onClick={() => { setScheduledMatchId(''); setVenue('neutral'); }}>Neutral</button>
          <button type="button" className={venue === 'teamB' ? styles.selectedSegment : ''} onClick={() => { setScheduledMatchId(''); setVenue('teamB'); }}>Team B Home</button>
        </div>
      </div>

      <div className={styles.predictorControlGroup}>
        <span>Players used</span>
        <div className={styles.segmentedControls}>
          <button type="button" className={effectivePool === 'active' ? styles.selectedSegment : ''} onClick={() => setPool('active')}>Full roster</button>
          <button
            type="button"
            disabled={!attendancePoolAvailable}
            title={attendancePoolAvailable ? 'Use current Playing responses' : 'Available when both teams share the same upcoming match and have Playing responses'}
            className={effectivePool === 'attendance' ? styles.selectedSegment : ''}
            onClick={() => setPool('attendance')}
          >
            Current yes
          </button>
        </div>
        {!attendancePoolAvailable ? <small>Current yes activates only for the same upcoming matchup after both teams have Playing responses.</small> : null}
      </div>

      {teamAId === teamBId ? (
        <div className={styles.errorMessage}>Choose two different teams.</div>
      ) : teamA && teamB && teamAStrength && teamBStrength && chanceA != null && chanceB != null ? (
        <div className={styles.predictionResult}>
          <div className={styles.predictionScoreRow}>
            <div><span>{teamA.name}</span><strong>{Math.round(chanceA * 100)}%</strong></div>
            <span className={styles.predictionLabel}>{predictionA?.displayLabel}</span>
            <div><span>{teamB.name}</span><strong>{Math.round(chanceB * 100)}%</strong></div>
          </div>
          <div className={styles.probabilityBar} aria-label={`${teamA.name} ${Math.round(chanceA * 100)} percent, ${teamB.name} ${Math.round(chanceB * 100)} percent`}>
            <span style={{width: `${chanceA * 100}%`}} />
            <span style={{width: `${chanceB * 100}%`}} />
          </div>
          <div className={styles.comparisonGrid}>
            <Comparison label="Strength" left={teamAStrength.baseStrength} right={teamBStrength.baseStrength} />
            <Comparison label="Top 6" left={teamAStrength.topSixCi} right={teamBStrength.topSixCi} />
            <Comparison label="Next 6" left={teamAStrength.nextSixCi} right={teamBStrength.nextSixCi} />
            <Comparison label="Depth" left={teamAStrength.depthCi} right={teamBStrength.depthCi} />
          </div>
          <p className={styles.venueNote}>{venueNote(venue, teamA.name, teamB.name)}</p>
        </div>
      ) : (
        <div className={styles.emptyState}>Prediction unavailable until both selected player pools have usable Clash Index data.</div>
      )}
    </div>
  );
}

function Comparison({label, left, right}: {label: string; left: number; right: number}) {
  return (
    <div className={styles.comparisonRow}>
      <strong>{Math.round(left)}</strong>
      <span>{label}</span>
      <strong>{Math.round(right)}</strong>
    </div>
  );
}

function venueForSelection(selection: VenueSelection, side: 'A' | 'B'): TeamVenue {
  if (selection === 'neutral') return 'Neutral';
  if (selection === 'teamA') return side === 'A' ? 'Home' : 'Away';
  return side === 'B' ? 'Home' : 'Away';
}

function venueNote(selection: VenueSelection, teamA: string, teamB: string): string {
  if (selection === 'neutral') return 'Neutral venue — no home adjustment.';
  const homeTeam = selection === 'teamA' ? teamA : teamB;
  return `${homeTeam} home-course adjustment included (+${TEAM_HOME_CI_BONUS} CI).`;
}

function strengthLabel(team: OfficeTeamDashboard): string {
  if (!team.activeStrength) return 'Strength —';
  const rank = team.strengthRank ? ` · #${team.strengthRank}` : '';
  return `Strength ${Math.round(team.activeStrength.baseStrength)}${rank}`;
}
