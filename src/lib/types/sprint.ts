import type { LucideIcon } from "lucide-react";

export type SprintTopic = {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

export type SprintConfig = {
  lengths: number[];
  difficulties: string[];
};
