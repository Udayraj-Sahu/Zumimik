import type { FeedHero, FeedStory, FeedVideo } from "@/lib/types/feed";

export const FEED_HERO: FeedHero = {
  imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=300&fit=crop",
  badge: "Daily Challenge",
  title: "Can you beat yesterday's accuracy?",
};

export const FEED_CATEGORIES = ["Explore", "Quant", "Verbal", "DI", "LR", "GK"] as const;

export const FEED_STORIES: FeedStory[] = [
  {
    id: "rc-strategy",
    thumbnailUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=120&h=120&fit=crop",
    eyebrow: "RC passage strategy",
    subtitle: "Speed reading techniques for verbal sections",
    readTime: "3 min read",
  },
  {
    id: "di-hacks",
    thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&h=120&fit=crop",
    eyebrow: "Data Interpretation hacks",
    subtitle: "Read charts and tables 2x faster with pattern recognition",
    readTime: "4 min read",
  },
  {
    id: "percent-tricks",
    thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=120&h=120&fit=crop",
    eyebrow: "Percent tricks for CAT",
    subtitle: "Quick percentage calculations without a calculator",
    readTime: "6 min read",
  },
];

export const FEED_VIDEOS: FeedVideo[] = [
  {
    id: "quant-speed",
    thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200&h=250&fit=crop",
    label: "Quant Speed Techniques",
    source: "Zuzumik",
    duration: "12 min",
  },
  {
    id: "lr-pattern",
    thumbnailUrl: "https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=200&h=250&fit=crop",
    label: "LR Pattern Recognition",
    source: "Strategy Lab",
    duration: "8 min",
  },
  {
    id: "error-log",
    thumbnailUrl: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&h=250&fit=crop",
    label: "Error Log Analysis",
    source: "Sensei Tips",
    duration: "15 min",
  },
  {
    id: "mock-walkthrough",
    thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200&h=250&fit=crop",
    label: "Mock Test Walkthrough",
    source: "Zuzumik",
    duration: "20 min",
  },
];
