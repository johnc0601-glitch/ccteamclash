export type Round = {
  id: string;
  scheduleId: string;
  seasonId: string;
  number: number;
  name: string;
  date: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoundInput = Pick<Round, 'number' | 'name' | 'date'>;
