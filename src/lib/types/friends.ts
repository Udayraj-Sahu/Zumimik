export type Friend = {
  id: string;
  name: string;
  initials: string;
  level?: string;
  streak?: number;
  lastActive?: string;
  xp?: number;
};

export type FriendActivity = {
  id: string;
  friendId: string;
  type: "sprint" | "achievement" | "duel";
  label: string;
  time: string;
};
