export type Player = {
  id: string;
  name: string;
  teamId: string;
  pdgaNumber: string;
  pdgaRating: number | null;
  eligibleForWomensRanking: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
