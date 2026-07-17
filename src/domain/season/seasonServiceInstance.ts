import {MockSeasonRepository} from '@/domain/season/SeasonRepository';
import {SeasonService} from '@/domain/season/SeasonService';

const repository = new MockSeasonRepository();

export const seasonService = new SeasonService(repository);
