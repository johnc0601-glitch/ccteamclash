import type {PublicPlayerView} from '@/services/public/PublicPlayerService';

export type PublicRosterPlayerSummary = {
  id: string;
  name: string;
  gender?: string;
  record: string;
  recordLabel: string;
};

export function buildPublicRosterSummaries(
  players: PublicPlayerView[],
): PublicRosterPlayerSummary[] {
  return players.map((view) => {
    const statistics = view.currentStatistics ?? view.careerStatistics;
    return {
      id: view.player.id,
      name: view.player.name,
      gender: view.player.gender,
      record: formatRecord(statistics.overallRecord),
      recordLabel: view.currentStatistics ? view.currentSeasonName : 'Career',
    };
  });
}

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}
