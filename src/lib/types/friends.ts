export type Friend = {
  id: string;
  /** Backend friendship id: what POST /social/friends/respond and /remove take (distinct from the user id). */
  friendshipId?: string;
  name: string;
  initials: string;
  level?: string;
  streak?: number;
  lastActive?: string;
  xp?: number;
  /** ISO time the friendship began (GET /social/friends `since`). */
  since?: string;
};

/** A request this learner sent that has not been answered. The server gives an id, a status and a time, and no name. */
export type SentRequest = { friendshipId: string; requestedAt?: string };

export type FriendActivity = {
  id: string;
  friendId: string;
  type: "sprint" | "achievement" | "duel";
  label: string;
  time: string;
};
