import type { Friend, FriendActivity } from "@/lib/types/friends";

export const FRIENDS: Friend[] = [
  { id: "f1", name: "Priya S.", initials: "PS", level: "Gold", streak: 12, lastActive: "2m ago", xp: 4820 },
  { id: "f2", name: "Arjun M.", initials: "AM", level: "Silver", streak: 8, lastActive: "1h ago", xp: 4310 },
  { id: "f3", name: "Rohan K.", initials: "RK", level: "Gold", streak: 15, lastActive: "30m ago", xp: 3990 },
  { id: "f4", name: "Neha V.", initials: "NV", level: "Bronze", streak: 5, lastActive: "3h ago", xp: 3750 },
  { id: "f5", name: "Vikram P.", initials: "VP", level: "Silver", streak: 10, lastActive: "1d ago", xp: 3410 },
  { id: "f6", name: "Ananya R.", initials: "AR", level: "Bronze", streak: 3, lastActive: "2d ago", xp: 3280 },
];

export const FRIEND_ACTIVITY: FriendActivity[] = [
  { id: "a1", friendId: "f1", type: "sprint", label: "Completed Mixed Challenge at 93%", time: "10m ago" },
  { id: "a2", friendId: "f3", type: "duel", label: "Won a duel against Vikram P.", time: "25m ago" },
  { id: "a3", friendId: "f2", type: "achievement", label: "Unlocked Speed Demon badge", time: "1h ago" },
  { id: "a4", friendId: "f4", type: "sprint", label: "Completed Advanced Squares at 80%", time: "2h ago" },
  { id: "a5", friendId: "f5", type: "sprint", label: "Completed Beginner Addition at 100%", time: "3h ago" },
  { id: "a6", friendId: "f1", type: "achievement", label: "Unlocked 7-day Streak badge", time: "4h ago" },
];

export const PENDING_REQUESTS: Friend[] = [
  { id: "f7", name: "Karan J.", initials: "KJ", level: "Silver", streak: 6, lastActive: "5h ago", xp: 3150 },
  { id: "f8", name: "Divya T.", initials: "DT", level: "Gold", streak: 20, lastActive: "1d ago", xp: 3020 },
];
