export type FamilySeat = {
  seatNumber: number;
  /** "active" | "suspended" (the backend's override vocabulary). */
  status: string;
  /** Seat discount percentage (100 / 80 / 60 by seat rank). */
  discountPct: number;
  childUserId: string | null;
  email: string | null;
  displayName: string | null;
  age: number | null;
  effectiveTier: string | null;
  /** Under 13: the backend runs the account in kids mode. */
  kidsMode: boolean;
  parentalConsentAt: string | null;
};

export type FamilyOverview = {
  /** null until the first seat is created. */
  familyId: string | null;
  parentUserId: string;
  parentTier: string;
  maxSeats: number;
  seats: FamilySeat[];
};

export type ChildFriend = {
  friendshipId: string;
  userId: string | null;
  name: string;
  source: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  /** Whether the parent has consented to this friendship. */
  parentApproved: boolean | null;
  expiresAt: string | null;
};

export type ChildFriends = {
  childUserId: string;
  friends: ChildFriend[];
  /** Requests held for the parent to approve. */
  awaitingYourApproval: ChildFriend[];
  /** Requests the other side still has to answer. */
  awaitingOtherSide: ChildFriend[];
};

export type NewSeatInput = { email: string; password: string; displayName?: string; age: number };
export type ChildFriendAction = "approve" | "decline" | "block";
