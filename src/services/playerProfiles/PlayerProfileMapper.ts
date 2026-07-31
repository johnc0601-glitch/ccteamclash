import {isHistoricalFemalePlayer, type HistoricalPlayerSeasonSummary} from '@/data/historicalSeed';
import type {PublicPlayerHistory, PublicPlayerView} from '@/services/public/PublicPlayerService';
import type {PlayerProfile, PlayerProfileMatchHistoryItem} from './PlayerProfileTypes';

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
    history: createHistoryItems(view.history),
  };
}

export function createHistoryItems(history: PublicPlayerHistory[]): PlayerProfileMatchHistoryItem[] {
  return history.map((entry): PlayerProfileMatchHistoryItem => ({
      id: entry.id,
      seasonName: entry.seasonName,
      date: entry.date,
      format: entry.format,
      result: entry.outcome === 'Win' ? 'W' : entry.outcome === 'Loss' ? 'L' : 'T',
      isHome: entry.isHome,
      teamId: entry.teamId,
      opponentTeamName: entry.opponentTeamName,
      opponentPlayerNames: entry.opponentPlayerNames,
      partnerPlayerNames: entry.partnerPlayerNames,
      playerScore: entry.playerScore,
      opponentScore: entry.opponentScore,
  }));
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
