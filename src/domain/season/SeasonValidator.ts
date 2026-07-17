import type {Season, SeasonFieldErrors, SeasonInput} from '@/domain/season/Season';

function normalizeForComparison(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateRangesOverlap(left: Season, right: Season): boolean {
  if (!isValidDate(left.startDate) || !isValidDate(left.endDate)) return false;
  if (!isValidDate(right.startDate) || !isValidDate(right.endDate)) return false;
  return left.startDate <= right.endDate && right.startDate <= left.endDate;
}

export class SeasonValidator {
  validate(input: SeasonInput, seasons: Season[], currentId?: string): SeasonFieldErrors {
    const fieldErrors: SeasonFieldErrors = {};

    if (!input.name) fieldErrors.name = 'Season name is required.';
    if (!Number.isInteger(input.year) || input.year <= 0) {
      fieldErrors.year = 'Enter a valid season year.';
    }

    const duplicateName = seasons.some((season) =>
      season.id !== currentId
      && normalizeForComparison(season.name) === normalizeForComparison(input.name),
    );
    if (input.name && duplicateName) {
      fieldErrors.name = 'A season with this name already exists.';
    }

    const startDateIsValid = !input.startDate || isValidDate(input.startDate);
    const endDateIsValid = !input.endDate || isValidDate(input.endDate);

    if (!startDateIsValid) fieldErrors.startDate = 'Enter a valid start date.';
    if (!endDateIsValid) fieldErrors.endDate = 'Enter a valid end date.';

    if (startDateIsValid && endDateIsValid && input.startDate && input.endDate
      && input.startDate > input.endDate) {
      fieldErrors.endDate = 'End date must be on or after the start date.';
    }

    if (input.published && !input.startDate) {
      fieldErrors.startDate = 'Published seasons require a start date.';
    }
    if (input.published && !input.endDate) {
      fieldErrors.endDate = 'Published seasons require an end date.';
    }

    return fieldErrors;
  }

  validateActiveSeason(candidate: Season, seasons: Season[]): string | undefined {
    if (!candidate.active || candidate.archived) return undefined;

    const otherActiveSeason = seasons.find((season) =>
      season.id !== candidate.id && season.active && !season.archived,
    );
    if (!otherActiveSeason) return undefined;

    return dateRangesOverlap(candidate, otherActiveSeason)
      ? `Active season dates overlap ${otherActiveSeason.name}.`
      : 'Only one season may be active.';
  }
}
