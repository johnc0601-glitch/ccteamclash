import {isHistoricalFemalePlayer, type HistoricalPlayerSeasonSummary} from '@/data/historicalSeed';
import type {PublicPlayerView} from '@/services/public/PublicPlayerService';
import type {PlayerProfile, PlayerProfileMatchHistoryItem, PlayerProfileMatchResult} from './PlayerProfileTypes';

export function createProfileFromPublicPlayerView(view: PublicPlayerView): PlayerProfile {
  const statistics = view.currentStatistics ?? view.careerStatistics;

  return {
    player: {
      id: view.player.id,
      name: view.player.name,
      gender: view.player.gender,
      pdgaNumber: view.player.pdgaNumber,
      pdgaRating: view.player.pdgaRating,
    },
    teamName: view.teamName,
    seasonName: view.currentStatistics ? view.currentSeasonName : 'Career',
    matchesPlayed: statistics.matchesPlayed,
    overallRecord: statistics.overallRecord,
    singlesRecord: statistics.singlesRecord,
    doublesRecord: statistics.doublesRecord,
    winPercentage: statistics.winPercentage,
    pointsEarned: statistics.pointsEarned,
    history: view.history.map((entry): PlayerProfileMatchHistoryItem => ({
      id: `${entry.challengeId}-${view.player.id}`,
      seasonName: entry.seasonName,
      date: entry.date,
      format: entry.formats.length === 1 ? entry.formats[0] : 'Team',
      result: getResultFromRecord(entry.record),
      opponentTeamName: entry.opponentTeamName,
      opponentPlayerNames: [],
      partnerPlayerNames: [],
    })),
  };
}

export function createProfileFromHistoricalSummary(summary: HistoricalPlayerSeasonSummary): PlayerProfile {
  return {
    player: {
      id: summary.playerId,
      name: summary.playerName,
      gender: isHistoricalFemalePlayer(summary.playerName) ? 'Female' : 'Male',
      pdgaNumber: '',
      pdgaRating: null,
    },
    teamName: summary.teamName,
    seasonName: summary.seasonName,
    matchesPlayed: summary.matchesPlayed,
    overallRecord: summary.overallRecord,
    singlesRecord: summary.singlesRecord,
    doublesRecord: summary.doublesRecord,
    winPercentage: summary.winPercentage,
    pointsEarned: summary.overallRecord.wins + summary.overallRecord.ties * 0.5,
    history: [],
  };
}

function getResultFromRecord(record: {wins: number; losses: number; ties: number}): PlayerProfileMatchResult | '-' {
  if (record.wins > record.losses && record.wins > record.ties) return 'W';
  if (record.losses > record.wins && record.losses > record.ties) return 'L';
  if (record.ties) return 'T';
  return '-';
}
