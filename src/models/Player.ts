export type Player = {
  id: string;
  name: string;
  teamId: string;
  pdgaNumber: string;
  pdgaRating: number | null;
  gender: 'Male' | 'Female' | 'Unknown';
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
