export type StoryLink = {
  label: string;
  url: string;
};

export type Story = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  image: string;
  body: string[];
  links?: StoryLink[];
};

export type Team = {
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
