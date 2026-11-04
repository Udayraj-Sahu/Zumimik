export type ProfileData = {
  initials: string;
  name: string;
  badge: string;
  level: string;
  streak: string;
};

export type ProfileStat = {
  label: string;
  value: string;
};

export type Achievement = {
  icon: string;
  label: string;
  desc: string;
  unlocked: boolean;
};
