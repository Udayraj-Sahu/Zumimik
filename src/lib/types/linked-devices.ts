export type LinkedDevicePlatform = "web" | "android" | "ios";

export type LinkedDevice = {
  id: string;
  name: string;
  model: string;
  platform: LinkedDevicePlatform;
  lastActive: string;
  addedAt: string;
  current?: boolean;
};