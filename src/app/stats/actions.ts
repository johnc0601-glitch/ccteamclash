'use server';

import {loadServerStatsPageData} from '@/core/loadServerStatsPageData';
import type {StatsGroup} from '@/services/stats/StatsPageModel';

export async function loadFullStatsGroup(groupId: string): Promise<StatsGroup> {
  const requestedSeason = groupId === 'overall' ? undefined : groupId;
  const {selectedGroup} = await loadServerStatsPageData(requestedSeason);
  if (selectedGroup.id !== groupId) throw new Error('Invalid stats group');
  return selectedGroup;
}
