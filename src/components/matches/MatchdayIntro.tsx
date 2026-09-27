'use client';

import {useEffect, useState, type CSSProperties} from 'react';
import styles from './MatchdayIntro.module.css';

type MatchdayIntroTeam = {
  name: string;
  shortName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
};

type MatchdayIntroProps = {
  matchId: string;
  play: boolean;
  awayTeam: MatchdayIntroTeam;
  homeTeam: MatchdayIntroTeam;
};

type MatchdayIntroPhase = 'start' | 'away' | 'vs' | 'home' | 'hold' | 'exit';

type MatchdayIntroStyle = CSSProperties & {
  '--intro-away': string;
  '--intro-away-secondary': string;
  '--intro-home': string;
  '--intro-home-secondary': string;
};

const TIMING = {
  awayAtMs: 180,
  vsAtMs: 820,
  homeAtMs: 1370,
  holdAtMs: 1920,
  exitAtMs: 2820,
  finishAtMs: 3380,
  reducedExitAtMs: 850,
  reducedFinishAtMs: 1050,
} as const;

export function MatchdayIntro({
  matchId,
  play,
  awayTeam,
  homeTeam,
}: MatchdayIntroProps) {
  const [isMounted, setIsMounted] = useState(play);
  const [phase, setPhase] = useState<MatchdayIntroPhase>('start');

  useEffect(() => {
    if (!play) {
      setIsMounted(false);
      return;
    }

    setIsMounted(true);
    setPhase('start');

    const timers: number[] = [];
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    let restored = false;
    const restoreScroll = () => {
      if (restored) return;
      restored = true;
      root.style.overflow = previousOverflow;
    };
    const finish = () => {
      restoreScroll();
      setIsMounted(false);
    };

    root.style.overflow = 'hidden';

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setPhase('hold');
      timers.push(
        window.setTimeout(() => setPhase('exit'), TIMING.reducedExitAtMs),
        window.setTimeout(finish, TIMING.reducedFinishAtMs),
      );
    } else {
      timers.push(
        window.setTimeout(() => setPhase('away'), TIMING.awayAtMs),
        window.setTimeout(() => setPhase('vs'), TIMING.vsAtMs),
        window.setTimeout(() => setPhase('home'), TIMING.homeAtMs),
        window.setTimeout(() => setPhase('hold'), TIMING.holdAtMs),
        window.setTimeout(() => setPhase('exit'), TIMING.exitAtMs),
        window.setTimeout(finish, TIMING.finishAtMs),
      );
    }

    return () => {
      timers.forEach(window.clearTimeout);
      restoreScroll();
    };
  }, [matchId, play]);

  if (!isMounted) return null;

  const style: MatchdayIntroStyle = {
    '--intro-away': awayTeam.primaryColor,
    '--intro-away-secondary': awayTeam.secondaryColor,
    '--intro-home': homeTeam.primaryColor,
    '--intro-home-secondary': homeTeam.secondaryColor,
  };

  return (
    <div
      className={styles.overlay}
      data-phase={phase}
      data-match-id={matchId}
      style={style}
      aria-hidden="true"
    >
      <div className={styles.atmosphere} />
      <div className={styles.grain} />

      <div className={styles.brand}>
        <img src="/branding/team-clash-logo.svg" alt="" className={styles.brandLogo} />
        <span>Matchday</span>
      </div>

      <div className={styles.matchup}>
        <TeamMark team={awayTeam} side="away" />
        <div className={styles.impact}>
          <span>VS</span>
        </div>
        <TeamMark team={homeTeam} side="home" />
      </div>
    </div>
  );
}

function TeamMark({team, side}: {team: MatchdayIntroTeam; side: 'away' | 'home'}) {
  const className = side === 'away'
    ? `${styles.team} ${styles.away}`
    : `${styles.team} ${styles.home}`;

  return (
    <div className={className}>
      <div className={styles.logoStage}>
        {team.logo ? (
          <CutoutLogo src={team.logo} className={styles.teamLogo} />
        ) : (
          <div className={styles.logoFallback}>{team.shortName || initials(team.name)}</div>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}


function CutoutLogo({src, className}: {src: string; className: string}) {
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    let cancelled = false;
    setDisplaySrc(src);

    const image = new window.Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const cutout = removeEdgeConnectedBackground(image);
        if (!cancelled && cutout) setDisplaySrc(cutout);
      } catch {
        // Some third-party images may not allow canvas pixel reads. In that
        // case the original logo remains visible instead of blocking Matchday.
      }
    };

    image.src = src;

    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, [src]);

  return <img src={displaySrc} alt="" className={className} />;
}

function removeEdgeConnectedBackground(image: HTMLImageElement): string | null {
  const maxDimension = 900;
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) return null;

  const scale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) return null;

  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const background = sampleCornerBackground(pixels, width, height);
  if (!background) return null;

  const threshold = background.threshold;
  const thresholdSquared = threshold * threshold;
  const visited = new Uint8Array(width * height);
  const removed = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBackground = (pixelIndex: number) => {
    const offset = pixelIndex * 4;
    if (pixels[offset + 3] < 16) return true;
    const red = pixels[offset] - background.red;
    const green = pixels[offset + 1] - background.green;
    const blue = pixels[offset + 2] - background.blue;
    return red * red + green * green + blue * blue <= thresholdSquared;
  };

  const enqueue = (pixelIndex: number) => {
    if (visited[pixelIndex] || !isBackground(pixelIndex)) return;
    visited[pixelIndex] = 1;
    removed[pixelIndex] = 1;
    queue[tail++] = pixelIndex;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixelIndex = queue[head++];
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueue(pixelIndex - 1);
    if (x + 1 < width) enqueue(pixelIndex + 1);
    if (y > 0) enqueue(pixelIndex - width);
    if (y + 1 < height) enqueue(pixelIndex + width);
  }

  if (tail < Math.max(20, width * height * 0.01)) return null;

  for (let pixelIndex = 0; pixelIndex < removed.length; pixelIndex += 1) {
    if (removed[pixelIndex]) pixels[pixelIndex * 4 + 3] = 0;
  }

  featherCutoutEdge(pixels, removed, width, height, background, threshold);
  context.putImageData(imageData, 0, 0);

  const bounds = alphaBounds(pixels, width, height);
  if (!bounds) return null;

  const padding = Math.max(4, Math.round(Math.max(bounds.width, bounds.height) * 0.035));
  const sourceX = Math.max(0, bounds.x - padding);
  const sourceY = Math.max(0, bounds.y - padding);
  const sourceWidth = Math.min(width - sourceX, bounds.width + padding * 2);
  const sourceHeight = Math.min(height - sourceY, bounds.height + padding * 2);

  const cropped = document.createElement('canvas');
  cropped.width = sourceWidth;
  cropped.height = sourceHeight;
  const croppedContext = cropped.getContext('2d');
  if (!croppedContext) return canvas.toDataURL('image/png');
  croppedContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );

  return cropped.toDataURL('image/png');
}

function sampleCornerBackground(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): {red: number; green: number; blue: number; threshold: number} | null {
  const patch = Math.max(3, Math.min(24, Math.round(Math.min(width, height) * 0.035)));
  const samples: Array<[number, number, number]> = [];

  const samplePatch = (startX: number, startY: number) => {
    for (let y = startY; y < startY + patch; y += 1) {
      for (let x = startX; x < startX + patch; x += 1) {
        const offset = (y * width + x) * 4;
        if (pixels[offset + 3] < 180) continue;
        samples.push([pixels[offset], pixels[offset + 1], pixels[offset + 2]]);
      }
    }
  };

  samplePatch(0, 0);
  samplePatch(width - patch, 0);
  samplePatch(0, height - patch);
  samplePatch(width - patch, height - patch);
  if (!samples.length) return null;

  const red = median(samples.map((sample) => sample[0]));
  const green = median(samples.map((sample) => sample[1]));
  const blue = median(samples.map((sample) => sample[2]));

  const distances = samples.map(([sampleRed, sampleGreen, sampleBlue]) => {
    const redDistance = sampleRed - red;
    const greenDistance = sampleGreen - green;
    const blueDistance = sampleBlue - blue;
    return Math.sqrt(
      redDistance * redDistance
      + greenDistance * greenDistance
      + blueDistance * blueDistance,
    );
  });

  const cornerNoise = median(distances);
  const threshold = Math.max(34, Math.min(74, Math.round(38 + cornerNoise * 2.2)));
  return {red, green, blue, threshold};
}

function featherCutoutEdge(
  pixels: Uint8ClampedArray,
  removed: Uint8Array,
  width: number,
  height: number,
  background: {red: number; green: number; blue: number},
  threshold: number,
) {
  const softRange = 34;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = y * width + x;
      if (removed[pixelIndex]) continue;

      const touchesRemoved = removed[pixelIndex - 1]
        || removed[pixelIndex + 1]
        || removed[pixelIndex - width]
        || removed[pixelIndex + width];
      if (!touchesRemoved) continue;

      const offset = pixelIndex * 4;
      const red = pixels[offset] - background.red;
      const green = pixels[offset + 1] - background.green;
      const blue = pixels[offset + 2] - background.blue;
      const distance = Math.sqrt(red * red + green * green + blue * blue);
      if (distance >= threshold + softRange) continue;

      const opacity = Math.max(0, Math.min(1, (distance - threshold) / softRange));
      pixels[offset + 3] = Math.round(pixels[offset + 3] * opacity);
    }
  }
}

function alphaBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): {x: number; y: number; width: number; height: number} | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < 18) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
}
