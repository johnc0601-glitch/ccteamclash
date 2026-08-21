'use client';

import {useMemo, useState} from 'react';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {ResultContest} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {Team} from '@/models/Team';
import styles from './ResultsExplorer.module.css';

type MatchWithContests = Match & {contests: ResultContest[]};

type Props = {
  schedules: Schedule[];
  rounds: Round[];
  matches: MatchWithContests[];
  teams: Team[];
  players: LaunchPlayer[];
};

export function ResultsExplorer({schedules, rounds, matches, teams, players}: Props) {
  const [query, setQuery] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [roundId, setRoundId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [format, setFormat] = useState('');
  const [outcome, setOutcome] = useState('');

  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const playerNames = useMemo(() => new Map(players.map((player) => [player.id, player.name])), [players]);
  const roundNames = useMemo(() => new Map(rounds.map((round) => [round.id, round.name || `Round ${round.number}`])), [rounds]);
  const scheduleNames = useMemo(() => new Map(schedules.map((schedule) => [schedule.id, schedule.name])), [schedules]);

  const rows = useMemo(() => matches.flatMap((match) => match.contests.flatMap((contest) =>
    contest.players.map((participant) => {
      const opponentPlayers = contest.players.filter((candidate) => candidate.side !== participant.side);
      const round = rounds.find((candidate) => candidate.id === match.roundId);
      const participantOutcome = participant.side === 'Home' ? contest.homeOutcome : contest.awayOutcome;
      return {
        id: `${contest.id}:${participant.playerId}`,
        match,
        contest,
        participant,
        opponentPlayers,
        round,
        participantOutcome,
      };
    }),
  )), [matches, rounds]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (seasonId && row.match.seasonId !== seasonId) return false;
      if (roundId && row.match.roundId !== roundId) return false;
      if (teamId && row.participant.teamId !== teamId && !row.opponentPlayers.some((player) => player.teamId === teamId)) return false;
      if (format && row.contest.format !== format) return false;
      if (outcome && row.participantOutcome !== outcome) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        playerNames.get(row.participant.playerId),
        ...row.opponentPlayers.map((player) => playerNames.get(player.playerId)),
        teamNames.get(row.match.homeTeamId ?? ''),
        teamNames.get(row.match.awayTeamId ?? ''),
        row.round?.name,
        row.match.date,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [rows, query, seasonId, roundId, teamId, format, outcome, playerNames, teamNames]);

  const visibleRounds = seasonId
    ? rounds.filter((round) => round.seasonId === seasonId)
    : rounds;

  return (
    <section className={styles.explorer} aria-labelledby="results-explorer-title">
      <header className={styles.header}>
        <div>
          <span>Commissioner audit</span>
          <h2 id="results-explorer-title">Search player results</h2>
          <p>Find any recorded singles or doubles result without opening each matchup.</p>
        </div>
        <strong>{filteredRows.length} player results</strong>
      </header>

      <div className={styles.filters}>
        <label className={styles.search}>
          <span>Player, opponent, or team</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search results…" />
        </label>
        <label>
          <span>Season</span>
          <select value={seasonId} onChange={(event) => { setSeasonId(event.target.value); setRoundId(''); }}>
            <option value="">All seasons</option>
            {schedules.map((schedule) => <option key={schedule.seasonId} value={schedule.seasonId}>{schedule.name}</option>)}
          </select>
        </label>
        <label>
          <span>Event</span>
          <select value={roundId} onChange={(event) => setRoundId(event.target.value)}>
            <option value="">All events</option>
            {visibleRounds.map((round) => (
              <option key={round.id} value={round.id}>{round.date ?? ''} · {round.name || `Round ${round.number}`}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Team</span>
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value="">All teams</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label>
          <span>Format</span>
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="">Singles + doubles</option>
            <option value="Singles">Singles</option>
            <option value="Doubles">Doubles</option>
          </select>
        </label>
        <label>
          <span>Outcome</span>
          <select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
            <option value="">W / L / T</option>
            <option value="W">Win</option>
            <option value="L">Loss</option>
            <option value="T">Tie</option>
          </select>
        </label>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Event</th><th>Matchup</th><th>Format</th><th>Player</th><th>Opponent</th><th>Side</th><th>Result</th></tr></thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td><small>{row.match.date ?? row.round?.date ?? '—'}</small><br />{row.round ? roundNames.get(row.round.id) : '—'}</td>
                <td>{teamNames.get(row.match.awayTeamId ?? '') ?? 'TBD'} <span>@</span> {teamNames.get(row.match.homeTeamId ?? '') ?? 'TBD'}</td>
                <td>{row.contest.format} {row.contest.position}</td>
                <td><strong>{playerNames.get(row.participant.playerId) ?? row.participant.playerName ?? row.participant.playerId}</strong></td>
                <td>{row.opponentPlayers.map((player) => playerNames.get(player.playerId) ?? player.playerName ?? player.playerId).join(' + ')}</td>
                <td>{row.participant.side}</td>
                <td><b className={styles[`result${row.participantOutcome}`]}>{row.participantOutcome}</b></td>
              </tr>
            ))}
            {!filteredRows.length ? <tr><td colSpan={7} className={styles.empty}>No player results match these filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>Rating before/after and expected-result columns will use the rating ledger once that persistence layer is connected.</p>
    </section>
  );
}
