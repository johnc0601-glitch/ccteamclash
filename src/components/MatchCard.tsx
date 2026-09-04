'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useState} from 'react';
import type {Team} from '@/models/Team';
import {createSlug} from '@/shared/utils';
import type {PublicScheduleEvent} from '@/domain/schedule/ScheduleService';
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
};

export function MatchCard({match, teams, feedPreview}: MatchCardProps) {
  const homeTeam = findTeam(teams, match.homeTeamId, match.home);
  const awayTeam = findTeam(teams, match.awayTeamId, match.away);

  return (
    <article className="dark-panel story-home-card home-match-card">
      <div className="story-matchup">
        <Link className="match-team-link" href={`/teams/${encodeURIComponent(match.homeTeamId)}`}>
          <TeamMatchLogo name={match.home} logo={homeTeam?.logo} />
          <strong>{match.home}</strong>
        </Link>
        <b>VS</b>
        <Link className="match-team-link" href={`/teams/${encodeURIComponent(match.awayTeamId)}`}>
          <TeamMatchLogo name={match.away} logo={awayTeam?.logo} />
          <strong>{match.away}</strong>
        </Link>
      </div>
      <div className="match-details">
        <p><span>DATE</span>{match.date}</p>
        <p><span>TIME</span>{match.time}</p>
        <p><span>COURSE</span>{match.course}</p>
      </div>
      {feedPreview ? (
        <Link href={`${match.href}#match-feed`} className={styles.activity}>
          <div className={styles.activityText}>
            <strong>{feedPreview.author} posted{feedPreview.imageUrl ? ' a photo' : ''}</strong>
            {feedPreview.excerpt ? <p>{feedPreview.excerpt}</p> : null}
            <span>{feedPreview.commentCount} comments · {feedPreview.reactionCount} reactions</span>
          </div>
          {feedPreview.imageUrl ? <img src={feedPreview.imageUrl} alt="Latest match post" className={styles.thumb} /> : null}
        </Link>
      ) : null}
      <div className="match-card-footer">
        <Link href={match.href} className="gold-link">View match -&gt;</Link>
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
