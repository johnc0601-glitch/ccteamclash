import type {HistoricalSeasonArchive} from '@/data/historicalSeed';
import type {Player} from '@/models/Player';
import type {HistoricalCiLedgerSummary} from '@/services/statistics/HistoricalCiLedgerSummary';
import {
  buildOverallRows,
  qualifiesStatsRow,
  toLiveStatsRow,
  type StatsGroup,
} from '@/services/stats/StatsPageModel';
import type {StatsQuerySnapshot} from '@/services/stats/StatsQueryService';

export type StatsGroupOption = Pick<StatsGroup, 'id' | 'label'>;

type StatsPageDependencies = {
  getSnapshot(): Promise<StatsQuerySnapshot>;
  getHistoricalArchives(): HistoricalSeasonArchive[];
  loadHistoricalCiGains(seasonId?: string): Promise<Map<string, HistoricalCiLedgerSummary>>;
  loadHistoricalGenderMap(): Promise<Map<string, Player['gender']>>;
  loadHistoricalStatsGroups(
    ciByPlayerSeason: ReadonlyMap<string, HistoricalCiLedgerSummary>,
    genderByPlayerId: ReadonlyMap<string, Player['gender']>,
    seasonId?: string,
  ): Promise<StatsGroup[]>;
};

export type StatsPageData = {
  selectedGroup: StatsGroup;
  groupOptions: StatsGroupOption[];
};

export class InvalidStatsSeasonError extends Error {}

export class StatsPageService {
  constructor(private readonly dependencies: StatsPageDependencies) {}

  async getPageData(requestedSeason?: string): Promise<StatsPageData> {
    if (requestedSeason === 'overall') throw new InvalidStatsSeasonError();
    const statsSnapshot = await this.dependencies.getSnapshot();
    const {playerViews} = statsSnapshot;
    const activeSeasonId = playerViews.find((view) => view.currentSeasonId)?.currentSeasonId;
    const activeSeasonName = playerViews.find((view) => view.currentSeasonId)?.currentSeasonName;
    const historicalOptions: StatsGroupOption[] = this.dependencies.getHistoricalArchives().map((archive) => ({
      id: archive.seasonId,
      label: compactSeasonName(archive.seasonName),
    }));
    const historicalSeasonIds = new Set(historicalOptions.map((option) => option.id));
    if (requestedSeason && requestedSeason !== activeSeasonId && !historicalSeasonIds.has(requestedSeason)) {
      throw new InvalidStatsSeasonError();
    }

    const liveRows = playerViews.flatMap((view) => {
      const row = toLiveStatsRow(view);
      return row ? [row] : [];
    });
    const liveGroup: StatsGroup | undefined = activeSeasonId && activeSeasonName && !historicalSeasonIds.has(activeSeasonId)
      ? {id: activeSeasonId, label: compactSeasonName(activeSeasonName), rows: liveRows}
      : undefined;
    const requestedHistoricalSeason = requestedSeason && historicalSeasonIds.has(requestedSeason)
      ? requestedSeason
      : undefined;
    const needsHistoricalData = !requestedSeason || Boolean(requestedHistoricalSeason);
    let historicalGroups: StatsGroup[] = [];
    if (needsHistoricalData) {
      const genderByPlayerId = new Map(statsSnapshot.genderByPlayerId);
      const [historicalCiGains, historicalGenderOverrides] = await Promise.all([
        this.dependencies.loadHistoricalCiGains(requestedHistoricalSeason),
        this.dependencies.loadHistoricalGenderMap(),
      ]);
      for (const [playerId, gender] of historicalGenderOverrides) {
        genderByPlayerId.set(playerId, gender);
      }
      historicalGroups = (await this.dependencies.loadHistoricalStatsGroups(
        historicalCiGains,
        genderByPlayerId,
        requestedHistoricalSeason,
      )).map((group) => ({...group, label: compactSeasonName(group.label)}));
    }

    let selectedGroup: StatsGroup | undefined;
    if (!requestedSeason) {
      const sourceSeasonGroups = [...(liveGroup ? [liveGroup] : []), ...historicalGroups];
      const overallClashIndexByPlayer = new Map<string, number>();
      for (const group of historicalGroups) {
        for (const row of group.rows) {
          if (row.clashIndex != null) overallClashIndexByPlayer.set(row.playerId, row.clashIndex);
        }
      }
      for (const view of playerViews) {
        if (view.player.clashIndex != null) overallClashIndexByPlayer.set(view.player.id, view.player.clashIndex);
      }
      selectedGroup = {
        id: 'overall',
        label: 'Overall',
        rows: buildOverallRows(sourceSeasonGroups, overallClashIndexByPlayer)
          .filter((row) => qualifiesStatsRow(row)),
      };
    } else if (requestedSeason === liveGroup?.id) {
      selectedGroup = {...liveGroup, rows: liveGroup.rows.filter((row) => qualifiesStatsRow(row))};
    } else {
      const historicalGroup = historicalGroups.find((group) => group.id === requestedSeason);
      if (historicalGroup) {
        selectedGroup = {...historicalGroup, rows: historicalGroup.rows.filter((row) => qualifiesStatsRow(row))};
      }
    }
    if (!selectedGroup) throw new InvalidStatsSeasonError();

    return {
      selectedGroup,
      groupOptions: [
        {id: 'overall', label: 'Overall'},
        ...(liveGroup ? [{id: liveGroup.id, label: liveGroup.label}] : []),
        ...historicalOptions,
      ],
    };
  }
}

export function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash(?: Match Play)?\s*/i, '');
  return withoutLeagueName.replace(/(\d{4})-(\d{4})/, (_match, firstYear: string, secondYear: string) => `${firstYear}–${secondYear.slice(2)}`);
}
