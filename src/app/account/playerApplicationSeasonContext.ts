import type {PlayerApplication} from '@/domain/player-application/PlayerApplication';
import type {Season} from '@/domain/season/Season';

export type PlayerApplicationSeasonContext = {
  newApplicationSeasonId?: string;
  teamOptionsSeasonId?: string;
};

export function resolvePlayerApplicationSeasonContext(input: {
  activeSeason?: Season;
  application?: PlayerApplication;
}): PlayerApplicationSeasonContext {
  const newApplicationSeasonId = isOpenApplicationSeason(input.activeSeason)
    ? input.activeSeason.id
    : undefined;

  if (input.application) {
    return {
      newApplicationSeasonId,
      teamOptionsSeasonId: input.application.status === 'Pending'
        ? input.application.seasonId
        : undefined,
    };
  }

  return {
    newApplicationSeasonId,
    teamOptionsSeasonId: newApplicationSeasonId,
  };
}

function isOpenApplicationSeason(season?: Season): season is Season {
  return Boolean(season?.active
    && season.published
    && season.registrationOpen
    && !season.archived);
}
