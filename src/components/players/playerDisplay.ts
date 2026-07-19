import type {Player} from '@/models/Player';

export function formatPlayerRating(player: Player): string {
  return player.pdgaRating ? player.pdgaRating.toString() : 'Not rated';
}

export function formatPlayerPdgaNumber(player: Player): string {
  return player.pdgaNumber || 'Not assigned';
}
