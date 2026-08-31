export type StoryLink = {
  label: string;
  url: string;
};

export type StoryStatus = 'draft' | 'published' | 'archived';

export type Story = {
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: string | null;
  image: string;
  heroAssetId?: string | null;
  body: string[];
  links?: StoryLink[];
  featured?: boolean;
  status: StoryStatus;
  revision: number;
  updatedAt?: string;
  seasonId?: string | null;
  roundId?: string | null;
  matchId?: string | null;
  teamId?: string | null;
};

export type StandingEntry = {
  name: string;
  record: string;
  diff: string;
};

export type Match = {
  date: string;
  time: string;
  course: string;
  home: string;
  away: string;
};
