export type Player = {
  id: string;
  name: string;
  teamId: string;
  pdgaNumber: string;
  pdgaRating: number | null;
  gender: 'Male' | 'Female';
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
