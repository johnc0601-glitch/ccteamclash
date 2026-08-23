export type Player = {
  id: string;
  name: string;
  teamId: string;
  pdgaNumber: string;
  pdgaRating: number | null;
  clashIndex?: number | null;
  /** True when the current CI is the averaged/ghost starting value shown with *. */
  clashIndexProvisional?: boolean;
  gender: 'Male' | 'Female' | 'Unknown';
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
