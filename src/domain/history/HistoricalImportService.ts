import type {HistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import type {
  HistoricalImportPreview,
  HistoricalImportResult,
  HistoricalPlayerRecord,
  HistoricalPlayerRecordInput,
  HistoricalRecordTotals,
  HistoricalTeamRecord,
  HistoricalTeamRecordInput,
} from '@/domain/history/HistoricalRecord';
import type {PlayerInput} from '@/types/player';
import type {TeamInput} from '@/types/team';

type HistoricalTeamService = {
  getAll(): Promise<Array<{id: string; name: string; shortName: string; active: boolean; captain: string}>>;
  create(input: TeamInput): Promise<{ok: true; data: {id: string}} | {ok: false; message: string}>;
  update(id: string, input: TeamInput): Promise<{ok: true; data: {id: string}} | {ok: false; message: string}>;
  activate(id: string): Promise<{ok: true; data: {id: string}} | {ok: false; message: string}>;
};

type HistoricalPlayerService = {
  getAll(): Promise<Array<{id: string; name: string}>>;
  create(input: PlayerInput): Promise<{ok: true; data: {id: string}} | {ok: false; message: string}>;
};

type HistoricalImportOverview = {
  previews: HistoricalImportPreview[];
  appliedResult: HistoricalImportResult | undefined;
  totals: {
    seasons: number;
    teams: number;
    players: number;
  };
};

export class HistoricalImportService {
  private readonly repository: HistoricalImportRepository;
  private readonly teams: HistoricalTeamService;
  private readonly players: HistoricalPlayerService;

  constructor(
    repository: HistoricalImportRepository,
    teams: HistoricalTeamService,
    players: HistoricalPlayerService,
  ) {
    this.repository = repository;
    this.teams = teams;
    this.players = players;
  }

  async getOverview(): Promise<HistoricalImportOverview> {
    const [sources, appliedResult] = await Promise.all([
      this.repository.getSources(),
      this.repository.getAppliedResult(),
    ]);
    const previews = sources.map((source) => ({
      source,
      status: appliedResult ? 'Applied' as const : 'Ready' as const,
      teamCount: source.teamRecords.length,
      playerCount: source.playerRecords.length,
      warnings: this.getWarnings(source.playerRecords),
      teamRecords: source.teamRecords.map((record) => this.toTeamRecord(record)),
      playerRecords: source.playerRecords.map((record) => this.toPlayerRecord(record)),
    }));

    return {
      previews,
      appliedResult,
      totals: {
        seasons: previews.length,
        teams: previews.reduce((total, preview) => total + preview.teamCount, 0),
        players: previews.reduce((total, preview) => total + preview.playerCount, 0),
      },
    };
  }

  async applyHistoricalRecords(): Promise<HistoricalImportResult> {
    const sources = await this.repository.getSources();
    const teamImportResult = await this.ensureHistoricalTeams(sources);
    const playerImportResult = await this.ensureHistoricalPlayers(sources);
    const result: HistoricalImportResult = {
      status: 'Applied',
      appliedAt: new Date().toISOString(),
      seasonsApplied: sources.length,
      teamRecordsApplied: sources.reduce((total, source) => total + source.teamRecords.length, 0),
      playerRecordsApplied: sources.reduce((total, source) => total + source.playerRecords.length, 0),
      teamsCreated: teamImportResult.created,
      teamsUpdated: teamImportResult.updated,
      playersCreated: playerImportResult.created,
      playersMatched: playerImportResult.matched,
    };
    return this.repository.saveAppliedResult(result);
  }

  calculateRecord(record: HistoricalRecordTotals): HistoricalRecordTotals {
    return {
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      matchesPlayed: record.wins + record.losses + record.ties,
    };
  }

  calculateWinPercentage(record: HistoricalRecordTotals): number {
    if (record.matchesPlayed === 0) return 0;
    return (record.wins + record.ties * 0.5) / record.matchesPlayed;
  }

  private toTeamRecord(record: HistoricalTeamRecordInput): HistoricalTeamRecord {
    return {
      ...record,
      pointsPercentage: record.pointsAvailable ? record.pointsEarned / record.pointsAvailable : 0,
    };
  }

  private toPlayerRecord(record: HistoricalPlayerRecordInput): HistoricalPlayerRecord {
    const singles = this.calculateRecord(record.singles);
    const doubles = this.calculateRecord(record.doubles);
    const overall = this.calculateRecord({
      wins: singles.wins + doubles.wins,
      losses: singles.losses + doubles.losses,
      ties: singles.ties + doubles.ties,
      matchesPlayed: 0,
    });

    return {
      ...record,
      singles,
      doubles,
      overall,
      singlesWinPercentage: this.calculateWinPercentage(singles),
      doublesWinPercentage: this.calculateWinPercentage(doubles),
      overallWinPercentage: this.calculateWinPercentage(overall),
    };
  }

  private getWarnings(records: HistoricalPlayerRecordInput[]): string[] {
    const missingPdgaCount = records.filter((record) => !record.pdgaNumber).length;
    const warnings = [
      'Actual match scores are ignored for this import.',
      'Player win percentages are calculated from singles and doubles records.',
    ];
    if (missingPdgaCount > 0) {
      warnings.push(`${missingPdgaCount} players do not have PDGA numbers in the historical record sheets.`);
    }
    return warnings;
  }

  private async ensureHistoricalTeams(sources: Array<{playerRecords: HistoricalPlayerRecordInput[]}>): Promise<{
    created: number;
    updated: number;
  }> {
    let created = 0;
    let updated = 0;
    const existingTeams = await this.teams.getAll();
    const teamsByName = new Map(existingTeams.map((team) => [this.normalize(team.name), team]));
    const usedShortNames = new Set(existingTeams.map((team) => this.normalize(team.shortName)));
    const captainByTeam = this.getCaptainByTeam(sources);

    for (const [teamName, captain] of captainByTeam) {
      const existingTeam = teamsByName.get(this.normalize(teamName));
      if (existingTeam) {
        const updateResult = await this.teams.update(existingTeam.id, {
          name: existingTeam.name,
          shortName: existingTeam.shortName,
          city: 'Wilmington',
          state: 'NC',
          captain,
          homeCourse: '',
          logo: '',
          primaryColor: '#121814',
          secondaryColor: '#f4f6f2',
          website: '',
          facebook: '',
          description: 'Imported from historical Coastal Clash records.',
        });
        if (updateResult.ok) updated += 1;
        if (!existingTeam.active) await this.teams.activate(existingTeam.id);
        continue;
      }

      const shortName = this.createShortName(teamName, usedShortNames);
      usedShortNames.add(this.normalize(shortName));
      const createResult = await this.teams.create({
        name: teamName,
        shortName,
        city: 'Wilmington',
        state: 'NC',
        captain,
        homeCourse: '',
        logo: '',
        primaryColor: '#121814',
        secondaryColor: '#f4f6f2',
        website: '',
        facebook: '',
        description: 'Imported from historical Coastal Clash records.',
      });
      if (createResult.ok) {
        created += 1;
        teamsByName.set(this.normalize(teamName), {
          id: createResult.data.id,
          name: teamName,
          shortName,
          active: true,
          captain,
        });
      }
    }

    return {created, updated};
  }

  private async ensureHistoricalPlayers(sources: Array<{playerRecords: HistoricalPlayerRecordInput[]}>): Promise<{
    created: number;
    matched: number;
  }> {
    let created = 0;
    let matched = 0;
    const existingPlayers = await this.players.getAll();
    const playersByName = new Set(existingPlayers.map((player) => this.normalize(player.name)));

    for (const source of sources) {
      for (const record of source.playerRecords) {
        const normalizedPlayerName = this.normalize(record.playerName);
        if (playersByName.has(normalizedPlayerName)) {
          matched += 1;
          continue;
        }

        const createResult = await this.players.create({
          name: record.playerName,
          teamId: '',
          pdgaNumber: record.pdgaNumber,
          pdgaRating: record.pdgaRating,
          gender: 'Unknown',
        });
        if (createResult.ok) {
          created += 1;
          playersByName.add(normalizedPlayerName);
        }
      }
    }

    return {created, matched};
  }

  private getCaptainByTeam(sources: Array<{playerRecords: HistoricalPlayerRecordInput[]}>): Map<string, string> {
    const captainByTeam = new Map<string, string>();
    for (const source of sources) {
      for (const record of source.playerRecords) {
        if (!captainByTeam.has(record.teamName)) {
          captainByTeam.set(record.teamName, record.playerName);
        }
      }
    }
    return captainByTeam;
  }

  private createShortName(teamName: string, usedShortNames: Set<string>): string {
    const words = teamName.match(/[a-z0-9]+/gi) ?? [teamName];
    const base = words.length === 1
      ? words[0].slice(0, 3)
      : words.map((word) => word[0]).join('').slice(0, 4);
    let candidate = base.toLocaleUpperCase() || 'TM';
    let suffix = 2;
    while (usedShortNames.has(this.normalize(candidate))) {
      candidate = `${base.toLocaleUpperCase().slice(0, 3)}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }
}
