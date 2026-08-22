import type {RatedResultRepository} from './RatedResultRepository';
import {buildStatsDeskView, type StatsDeskView} from './StatsDeskView';
import type {StoryScope} from './StoryScope';

export class StatsDeskService {
  constructor(private readonly repository: RatedResultRepository) {}

  async getDesk(scope: StoryScope): Promise<StatsDeskView> {
    const results = await this.repository.getRatedResults();
    return buildStatsDeskView(results, scope);
  }
}
