import type {Season, SeasonInput} from '@/domain/season/Season';

export const EMPTY_SEASON_INPUT: SeasonInput = {
  name: '',
  year: new Date().getFullYear(),
  description: '',
  startDate: '',
  endDate: '',
  registrationOpen: false,
  published: false,
};

export function seasonToFormValues(season: Season): SeasonInput {
  return {
    name: season.name,
    year: season.year,
    description: season.description,
    startDate: season.startDate,
    endDate: season.endDate,
    registrationOpen: season.registrationOpen,
    published: season.published,
  };
}
