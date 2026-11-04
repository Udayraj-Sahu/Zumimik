export type UserPreferences = {
  pushNotifications: boolean;
  sessionReminders: boolean;
  restDuration: string;
  email: string;
};

export type Subscription = {
  plan: "free" | "pro";
  price: string;
};
