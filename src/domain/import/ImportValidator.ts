import type {Season} from '@/domain/season/Season';
import type {ImportChallenge, ImportFieldErrors, ImportJobInput} from '@/domain/import/ImportJob';
import type {Team} from '@/models/Team';

export const SUPPORTED_IMPORT_FILE_EXTENSIONS = ['.json', '.csv'] as const;

type ImportValidationContext = {
  seasons: Season[];
  teams: Team[];
  challenges: ImportChallenge[];
};

type ImportValidationResult = {
  fieldErrors: ImportFieldErrors;
  errors: string[];
  warnings: string[];
};

function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index === -1 ? '' : filename.slice(index).toLocaleLowerCase();
}

export class ImportValidator {
  validateInput(
    input: ImportJobInput,
    context: ImportValidationContext,
  ): ImportValidationResult {
    const fieldErrors: ImportFieldErrors = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input.filename) {
      fieldErrors.filename = 'Filename is required.';
      errors.push('Filename is required.');
    } else if (!SUPPORTED_IMPORT_FILE_EXTENSIONS.includes(
      getFileExtension(input.filename) as (typeof SUPPORTED_IMPORT_FILE_EXTENSIONS)[number],
    )) {
      fieldErrors.filename = 'Only JSON and CSV imports are currently supported.';
      errors.push('Unsupported file type.');
    }

    if (!input.source) {
      fieldErrors.source = 'Import source is required.';
      errors.push('Import source is required.');
    }
    if (!input.importedBy) {
      fieldErrors.importedBy = 'Importer name is required.';
      errors.push('Importer name is required.');
    }

    const season = context.seasons.find((candidate) => candidate.id === input.seasonId);
    if (!input.seasonId) {
      fieldErrors.seasonId = 'Season is required.';
      errors.push('Season is required.');
    } else if (!season) {
      fieldErrors.seasonId = 'Select a valid season.';
      errors.push('Season does not exist.');
    }

    const challenge = context.challenges.find((candidate) => candidate.id === input.challengeId);
    if (!input.challengeId) {
      fieldErrors.challengeId = 'Challenge is required.';
      errors.push('Challenge is required.');
    } else if (!challenge) {
      fieldErrors.challengeId = 'Select a valid challenge.';
      errors.push('Challenge does not exist.');
    }

    const homeTeam = context.teams.find((candidate) => candidate.id === input.homeTeamId);
    if (!input.homeTeamId) {
      fieldErrors.homeTeamId = 'Home team is required.';
      errors.push('Home team is required.');
    } else if (!homeTeam) {
      fieldErrors.homeTeamId = 'Select a valid home team.';
      errors.push('Home team does not exist.');
    }

    const awayTeam = context.teams.find((candidate) => candidate.id === input.awayTeamId);
    if (!input.awayTeamId) {
      fieldErrors.awayTeamId = 'Away team is required.';
      errors.push('Away team is required.');
    } else if (!awayTeam) {
      fieldErrors.awayTeamId = 'Select a valid away team.';
      errors.push('Away team does not exist.');
    }

    if (challenge && season && challenge.seasonId !== season.id) {
      fieldErrors.challengeId = 'Challenge must belong to the selected season.';
      errors.push('Challenge does not belong to the selected season.');
    }

    if (challenge && homeTeam && challenge.homeTeamId !== homeTeam.id) {
      warnings.push('Imported home team differs from the scheduled challenge home team.');
    }
    if (challenge && awayTeam && challenge.awayTeamId !== awayTeam.id) {
      warnings.push('Imported away team differs from the scheduled challenge away team.');
    }

    return {fieldErrors, errors: [...new Set(errors)], warnings: [...new Set(warnings)]};
  }
}

