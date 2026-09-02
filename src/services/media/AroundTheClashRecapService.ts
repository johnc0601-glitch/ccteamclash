import {randomUUID} from 'node:crypto';
import type {Story, StorySourceFactSnapshot} from '@/shared/types';
import {createStory, StoryValidationError} from '@/services/stories/StoryService';
import {getAroundTheClashData, type AroundFact} from '@/services/media/AroundTheClashService';
import {normalizeAroundFactIds} from '@/services/media/AroundTheClashFacts';
import {createSlug} from '@/shared/utils';

const MAX_RECAP_FACTS = 20;

export async function createAroundTheClashRecapDraft(
  factIds: unknown,
  actorProfileId: string,
): Promise<Story> {
  const requestedIds = normalizeAroundFactIds(factIds);
  if (requestedIds.length === 0) {
    throw new StoryValidationError('Select at least one Around the Clash fact first.');
  }
  if (requestedIds.length > MAX_RECAP_FACTS) {
    throw new StoryValidationError(`Select no more than ${MAX_RECAP_FACTS} facts for one recap draft.`);
  }

  // Re-read the canonical immutable facts at draft creation time. The client
  // provides only opaque ids; no client-provided CI values or wording is trusted.
  const data = await getAroundTheClashData();
  const factById = new Map(data.facts.map((fact) => [fact.id, fact]));
  const facts = requestedIds.map((id) => factById.get(id)).filter((fact): fact is AroundFact => Boolean(fact));

  if (facts.length !== requestedIds.length) {
    throw new StoryValidationError('One or more selected CI facts changed or are no longer available. Refresh Around the Clash and try again.');
  }

  const capturedAt = new Date().toISOString();
  const snapshot = facts.map((fact) => snapshotFact(fact, capturedAt));
  const eventLabels = unique(facts.map((fact) => fact.eventLabel).filter(Boolean));
  const title = eventLabels.length === 1 ? `${eventLabels[0]} Recap` : 'Around the Clash Recap';
  const slug = `${createSlug(title) || 'around-the-clash-recap'}-${randomUUID().slice(0, 8)}`;
  const seasonIds = unique(facts.map((fact) => fact.seasonId));
  const matchIds = unique(facts.map((fact) => fact.matchId).filter(Boolean));
  const seasonId = seasonIds.length === 1 && data.seasonNames[seasonIds[0]] ? seasonIds[0] : null;
  const matchId = matchIds.length === 1 ? matchIds[0] : null;

  const story = {
    slug,
    title,
    category: 'Match Recap',
    publishedAt: null,
    image: 'hero',
    heroAssetId: null,
    body: buildSourceNotes(facts),
    links: matchId ? [{label: 'View match', url: `/matches/${encodeURIComponent(matchId)}`}] : undefined,
    featured: false,
    status: 'draft' as const,
    seasonId,
    matchId,
    roundId: null,
    teamId: null,
  };

  try {
    return await createStory(story, actorProfileId, snapshot);
  } catch (error) {
    // Historical match keys are not launch_schedule_matches foreign keys. The
    // immutable source snapshot still keeps that match identifier, so retry the
    // optional relationship without discarding any verified fact.
    if (matchId && isForeignKeyFailure(error)) {
      return createStory({...story, matchId: null, links: undefined}, actorProfileId, snapshot);
    }
    throw error;
  }
}

function snapshotFact(fact: AroundFact, capturedAt: string): StorySourceFactSnapshot {
  return {
    ledgerId: fact.id,
    seasonId: fact.seasonId,
    eventKey: fact.eventKey,
    eventOrder: fact.eventOrder,
    eventLabel: fact.eventLabel,
    matchId: fact.matchId,
    contestId: fact.contestId,
    playerId: fact.playerId,
    playerName: fact.playerName,
    format: fact.format,
    side: fact.side,
    outcome: fact.outcome,
    ratingBefore: fact.ratingBefore,
    partnerPlayerId: fact.partnerPlayerId,
    partnerName: fact.partnerName,
    partnerRating: fact.partnerRating,
    opponentOnePlayerId: fact.opponentOnePlayerId,
    opponentOneName: fact.opponentOneName,
    opponentOneRating: fact.opponentOneRating,
    opponentTwoPlayerId: fact.opponentTwoPlayerId,
    opponentTwoName: fact.opponentTwoName,
    opponentTwoRating: fact.opponentTwoRating,
    ownPairRating: fact.ownPairRating,
    opponentPairRating: fact.opponentPairRating,
    homeAdjustment: fact.homeAdjustment,
    expectedScore: fact.expectedScore,
    actualScore: fact.actualScore,
    totalDelta: fact.totalDelta,
    calculatedAt: fact.calculatedAt,
    capturedAt,
  };
}

function buildSourceNotes(facts: AroundFact[]): string[] {
  return [
    'Around the Clash source notes — use these immutable CI facts to write the recap, then replace or edit these notes before publishing.',
    ...facts.map((fact) => {
      const player = displaySide(fact);
      const opponent = displayOpponent(fact);
      const expected = `${Math.round(fact.expectedScore * 100)}% expected score`;
      const result = outcomeLabel(fact.outcome);
      const movement = `${fact.totalDelta >= 0 ? '+' : ''}${fact.totalDelta.toFixed(1)} CI`;
      const context = [fact.eventLabel, formatLabel(fact.format), sideLabel(fact.side)].filter(Boolean).join(' · ');
      return `[Source fact ${fact.id}] ${player}${opponent ? ` vs ${opponent}` : ''}: ${result}, ${expected}, ${movement}. ${context}`;
    }),
  ];
}

function displaySide(fact: AroundFact): string {
  if (!fact.partnerName) return fact.playerName;
  return [fact.playerName, fact.partnerName].sort().join(' + ');
}

function displayOpponent(fact: AroundFact): string {
  return [fact.opponentOneName, fact.opponentTwoName]
    .filter((value): value is string => Boolean(value))
    .sort()
    .join(' + ');
}

function outcomeLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'w' || normalized === 'win') return 'win';
  if (normalized === 'l' || normalized === 'loss') return 'loss';
  if (normalized === 't' || normalized === 'tie') return 'tie';
  return value || 'result';
}

function formatLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('double')) return 'Doubles';
  if (normalized.includes('single')) return 'Singles';
  return value;
}

function sideLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'away') return 'Road';
  if (normalized === 'home') return 'Home';
  return value;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isForeignKeyFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('foreign key') || message.includes('violates foreign key constraint');
}
