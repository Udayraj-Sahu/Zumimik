export type DuelTopic = {
  id: string;
  label: string;
};

export type DuelOpponent = {
  name: string;
  initials: string;
  level: string;
};

export type DuelResult = {
  yourScore: number;
  opponentScore: number;
  yourAccuracy: number;
  opponentAccuracy: number;
  yourTime: number;
  opponentTime: number;
  won: boolean;
  xpEarned: number;
};
