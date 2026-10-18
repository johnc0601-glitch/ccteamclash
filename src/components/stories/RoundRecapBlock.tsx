import type {ReactNode} from 'react';

type RecapBlockKind = 'match' | 'pulse' | 'discovery' | 'mover' | 'upcoming';

function cleanParts(paragraph: string): string[] {
  return paragraph.split('|').map((item) => item.trim());
}

function score(value: string): ReactNode {
  return <strong className="round-recap-score">{value}</strong>;
}

/**
 * A small editable block grammar for commissioner Round Recap stories.
 *
 * :::match|Home Team|23|Away Team|13|October 3|Burnt Mill Creek
 * :::pulse|Singles upset|Richie Absher over Derek Hynds|22%|Pre-match win chance
 * :::discovery|Underdogs Had Their Day|21 upsets|Underdogs won 21 of 106 contests.
 * :::mover|1|Hastin McGill|Beast Mode|+25|918 to 943
 * :::upcoming|Beast Mode|Dark Knights|Two strong teams meet in Round 2.
 *
 * All blocks are ordinary editable paragraph text in the existing Story Manager.
 * Non-recap stories and ordinary paragraphs keep their existing rendering.
 */
export function RoundRecapBlock({paragraph}: {paragraph: string}) {
  if (!paragraph.startsWith(':::')) return null;
  const [tag, ...parts] = cleanParts(paragraph.slice(3));
  const kind = tag as RecapBlockKind;

  if (kind === 'match' && parts.length >= 6) {
    const [home, homeScore, away, awayScore, date, course] = parts;
    return (
      <section className="round-recap-match" aria-label={`${home} vs ${away}`}>
        <div className="round-recap-match-head">
          <div className="round-recap-match-date">{date} · {course}</div>
          <span className="round-recap-final">FINAL</span>
        </div>
        <div className="round-recap-match-scoreline">
          <span className="round-recap-side">{home}{score(homeScore)}</span>
          <span className="round-recap-dash">–</span>
          <span className="round-recap-side">{away}{score(awayScore)}</span>
        </div>
      </section>
    );
  }

  if (kind === 'pulse' && parts.length >= 3) {
    const [category, subject, probability, explanation = 'Pre-match win chance'] = parts;
    return (
      <article className="round-recap-pulse" aria-label={category}>
        <div className="round-recap-pulse-text">
          <div className="round-recap-pulse-type">Clash Pulse · {category}</div>
          <strong>{subject}</strong>
        </div>
        <div className="round-recap-pulse-value">
          <strong>{probability}</strong>
          <span>{explanation}</span>
        </div>
      </article>
    );
  }

  if (kind === 'discovery' && parts.length >= 3) {
    const [heading, value, description] = parts;
    return (
      <article className="round-recap-discovery">
        <div className="round-recap-discovery-top">
          <h3>{heading}</h3>
          <strong>{value}</strong>
        </div>
        <p>{description}</p>
      </article>
    );
  }

  if (kind === 'mover' && parts.length >= 5) {
    const [position, player, team, change, movement] = parts;
    return (
      <div className="round-recap-mover">
        <span className="round-recap-mover-rank">{position}</span>
        <span className="round-recap-mover-player"><strong>{player}</strong><small>{team}</small></span>
        <span className="round-recap-mover-change"><strong>{change}</strong><small>{movement}</small></span>
      </div>
    );
  }

  if (kind === 'upcoming' && parts.length >= 3) {
    const [away, home, detail] = parts;
    return (
      <article className="round-recap-upcoming">
        <strong>{away} <span>at</span> {home}</strong>
        <p>{detail}</p>
      </article>
    );
  }

  // Malformed custom blocks are shown as plain text rather than silently lost.
  return <p className="article-paragraph">{paragraph}</p>;
}

export function isRoundRecapBlock(paragraph: string): boolean {
  return paragraph.trim().startsWith(':::');
}
