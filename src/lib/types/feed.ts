export type FeedHero = {
  imageUrl: string;
  badge: string;
  title: string;
};

export type FeedStory = {
  id: string;
  thumbnailUrl: string;
  eyebrow: string;
  subtitle: string;
  readTime: string;
};

export type FeedVideo = {
  id: string;
  thumbnailUrl: string;
  label: string;
  source: string;
  duration: string;
};
