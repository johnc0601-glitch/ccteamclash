'use client';

import Image from 'next/image';
import Link from 'next/link';
import {MatchdayLink} from '@/components/matchday-intro/MatchdayLink';
import {LiveScoringLink} from '@/components/matches/LiveScoringLink';
import {getLiveScoringHref} from '@/services/matches/LiveScoringLink';
import {useState} from 'react';
import type {Team} from '@/models/Team';
import {createSlug} from '@/shared/utils';
import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';
import type {HomepagePublishedScore} from '@/services/home/HomepageDataService';
import styles from './MatchCard.module.css';

export type MatchFeedPreview = {
  author: string;
  excerpt: string;
  imageUrl: string | null;
  commentCount: number;
  reactionCount: number;
};

type MatchCardProps = {
  match: PublicScheduleEvent;
  teams: Team[];
  feedPreview?: MatchFeedPreview;
  today: string;
  result?: HomepagePublishedScore;
};

export function MatchCard({match, teams, today, result}: MatchCardProps) {
  const homeTeam = findTeam(teams, match.homeTeamId, match.home);
  const awayTeam = findTeam(teams, match.awayTeamId, match.away);
  const isMatchday = match.scheduledDate === today;
  const isPast = Boolean(match.scheduledDate && match.scheduledDate < today);
  const showScore = Boolean(result) || isMatchday;
  const scoreLabel = result ? 'FINAL' : 'MATCHDAY';
  const awayWins = Boolean(result && result.awayScore > result.homeScore);
  const homeWins = Boolean(result && result.homeScore > result.awayScore);
  const liveScoringHref = getLiveScoringHref(match, {today, hasPublishedResult: Boolean(result)});

  return (
    <article className={`dark-panel story-home-card home-match-card ${styles.card}${result ? ` ${styles.finalCard}` : ''}`}>
      <div className="story-matchup">
        <Link className="match-team-link" href={`/teams/${encodeURIComponent(match.awayTeamId)}`}>
          <TeamMatchLogo name={match.away} logo={awayTeam?.logo} />
          <strong>{match.away}</strong>
        </Link>
        {showScore ? (
          <div className={styles.scoreCenter} aria-label={result ? 'Final result posted' : 'Matchday'}>
            <span className={styles.scoreLabel}>{scoreLabel}</span>
            {!result ? <strong className={styles.scoreValue}>0–0</strong> : null}
          </div>
        ) : isPast ? (
          <span className={styles.pending}>PENDING</span>
        ) : (
          <b>VS</b>
        )}
        <Link className="match-team-link" href={`/teams/${encodeURIComponent(match.homeTeamId)}`}>
          <TeamMatchLogo name={match.home} logo={homeTeam?.logo} />
          <strong>{match.home}</strong>
        </Link>
      </div>
      {result ? (
        <div
          className={styles.finalScoreBoard}
          aria-label={`Final score: ${match.away} ${result.awayScore}, ${match.home} ${result.homeScore}`}
        >
          <strong className={`${styles.finalScoreNumber} ${awayWins ? styles.finalScoreWinner : homeWins ? styles.finalScoreLoser : ''}`}>
            {result.awayScore}
          </strong>
          <span className={styles.finalScoreDivider} aria-hidden="true">–</span>
          <strong className={`${styles.finalScoreNumber} ${homeWins ? styles.finalScoreWinner : awayWins ? styles.finalScoreLoser : ''}`}>
            {result.homeScore}
          </strong>
        </div>
      ) : null}
      <div className="match-details">
        <p><span>DATE</span>{match.date}</p>
        <p><span>TIME</span>{match.time}</p>
        <p><span>COURSE</span>{match.course}</p>
      </div>
      <div className={`match-card-footer${liveScoringHref ? ` ${styles.liveFooter}` : ''}`}>
        <MatchdayLink
          href={match.href}
          matchDate={match.scheduledDate}
          className={liveScoringHref ? `gold-link ${styles.matchdayAction}` : 'gold-link'}
        >
          {liveScoringHref ? 'View match' : 'View match ->'}
        </MatchdayLink>
        {liveScoringHref ? <LiveScoringLink href={liveScoringHref} matchup={`${match.away} at ${match.home}`} /> : null}
      </div>
    </article>
  );
}

function TeamMatchLogo({name, logo}: {name: string; logo?: string}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="team-shield match-logo-frame">
      {logo && !imageFailed ? (
        <Image
          src={logo}
          alt={`${name} logo`}
          width={88}
          height={88}
          className="match-team-logo"
          onError={() => setImageFailed(true)}
        />
      ) : initials(name)}
    </span>
  );
}

function findTeam(teams: Team[], teamId: string, name: string): Team | undefined {
  const byId = teams.find((team) => team.id === teamId);
  if (byId) return byId;
  const slug = createSlug(name);
  return teams.find((team) => createSlug(team.name) === slug);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
