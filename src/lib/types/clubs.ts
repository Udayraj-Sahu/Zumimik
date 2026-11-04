export type ClubMember = {
  name: string;
  initials: string;
  avatarUrl?: string;
  xp: number;
  streak: number;
};

export type Club = {
  id: string;
  name: string;
  moderator: ClubMember;
  coverUrl: string;
  memberCount: number;
  lastActivity: string;
  tags: string[];
  description: string;
  isPremium: boolean;
  isJoined: boolean;
};
