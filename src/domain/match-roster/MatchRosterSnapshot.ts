export type MatchRosterSnapshotPlayer = {
  id: string;
  matchId: string;
  teamId: string;
  teamNameSnapshot: string;
  playerId: string;
  playerNameSnapshot: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};

export type MatchRosterSnapshotManifest = {
  id: string;
  matchId: string;
  teamId: string;
  teamNameSnapshot: string;
  needsCommissionerReview: boolean;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
};

export type OfficialMatchRoster = MatchRosterSnapshotManifest & {
  players: MatchRosterSnapshotPlayer[];
};

export type OfficialSnapshotState =
  | {status: 'before-lock'; rosters: []}
  | {status: 'complete'; rosters: OfficialMatchRoster[]}
  | {status: 'unavailable'; rosters: []};

export type SnapshotCronSummary = {
  processed: number;
  succeeded: number;
  alreadyComplete: number;
  failed: number;
};
