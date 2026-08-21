import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import {resolveStartingRating, type ClashRatingState} from '@/domain/ratings/ClashRatingEngine';

export type PriorSeasonRatingSnapshot = {
  playerId: string;
  rating: number;
  ratedResults: number;
};

export type PriorEventRatingSnapshot = {
  playerId: string;
  ratingAfter: number;
  ratedResultsAfter: number;
  provisionalEventsAfter: number;
  provisionalAfter: boolean;
};

export function resolveEventStartStates(input: {
  players: LaunchPlayer[];
  priorSeason: PriorSeasonRatingSnapshot[];
  priorEvent?: PriorEventRatingSnapshot[];
}): ClashRatingState[] {
  if (input.priorEvent?.length) {
    const priorByPlayer = new Map(input.priorEvent.map((row) => [row.playerId, row]));
    return input.players.map((player) => {
      const prior = priorByPlayer.get(player.id);
      if (prior) {
        return {
          playerId: player.id,
          rating: Math.round(prior.ratingAfter),
          ratedResults: prior.ratedResultsAfter,
          provisionalEventsPlayed: prior.provisionalEventsAfter,
          provisional: prior.provisionalAfter,
        };
      }
      return firstEventState(player, input.priorSeason);
    });
  }

  return input.players.map((player) => firstEventState(player, input.priorSeason));
}

function firstEventState(player: LaunchPlayer, priorSeason: PriorSeasonRatingSnapshot[]): ClashRatingState {
  const prior = priorSeason.find((snapshot) => snapshot.playerId === player.id);
  const start = resolveStartingRating({
    playerId: player.id,
    division: player.gender === 'Female' ? 'Women' : 'Open',
    pdgaRating: player.pdgaRating,
    priorClashRating: prior?.rating,
    priorRatedResults: prior?.ratedResults ?? 0,
  });

  return {
    playerId: start.playerId,
    rating: start.rating,
    ratedResults: start.ratedResults,
    provisionalEventsPlayed: start.provisionalEventsPlayed,
    provisional: start.provisional,
  };
}
