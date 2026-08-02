export type OfficialRosterExportTeam = {
  name: string;
  playerNames: string[];
};

export type OfficialRosterExport = {
  matchId: string;
  matchDate: string;
  homeTeam: OfficialRosterExportTeam;
  awayTeam: OfficialRosterExportTeam;
  generatedAt: string;
};

export function formatOfficialTeamRoster(team: OfficialRosterExportTeam): string {
  return [team.name, ...team.playerNames].join('\n');
}

export function formatOfficialMatchRoster(exportData: OfficialRosterExport): string {
  return [
    formatOfficialTeamRoster(exportData.homeTeam),
    formatOfficialTeamRoster(exportData.awayTeam),
  ].join('\n\n');
}

export function officialRosterFilename(matchId: string): string {
  const stableFilenameId = matchId.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `match-${stableFilenameId}-roster.txt`;
}
