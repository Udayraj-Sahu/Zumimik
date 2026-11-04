import type { LinkedDevice } from "@/lib/types/linked-devices";

export const LINKED_DEVICES: LinkedDevice[] = [
  {
    id: "dev-android-01",
    name: "Pixel 7",
    model: "Android 14",
    platform: "android",
    lastActive: "now",
    addedAt: "Aug 28, 2026",
    current: true,
  },
  {
    id: "dev-web-01",
    name: "Chrome on Windows",
    model: "Google Chrome 126",
    platform: "web",
    lastActive: "2 hrs ago",
    addedAt: "Aug 24, 2026",
  },
  {
    id: "dev-ios-01",
    name: "iPhone 15",
    model: "iOS 17.5",
    platform: "ios",
    lastActive: "2 days ago",
    addedAt: "Jul 30, 2026",
  },
];