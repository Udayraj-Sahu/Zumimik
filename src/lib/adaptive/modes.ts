import { CYAN, EMERALD, LIME, ROSE, VIOLET_PURPLE, YELLOW } from "@/lib/theme";
export type JourneyModeId =
  | "exam_ready"
  | "gap_closer"
  | "discovery"
  | "guided_learning"
  | "speed"
  | "performance"
  | "brain_gym";

export type TimeBlock = {
  label: string;
  minutes: number;
};

export type JourneyProfile = {
  mode: JourneyModeId;
  title: string;
  subtitle: string;
  accent: string;
  headlinePrefix: string;
};

export function resolveJourneyProfile(params: {
  domain: string;
  temporalWindow: "this_year" | "whenever" | "not_sure" | null;
  vedicUseCase: string | null;
  focusMode: "sleep" | "sprint";
  dailyMinutes: number;
}): JourneyProfile {
  const { domain, temporalWindow, vedicUseCase, dailyMinutes } = params;

  if (domain === "vedic-math") {
    switch (vedicUseCase) {
      case "kid":
        return {
          mode: "guided_learning",
          title: "Teaching My Kid",
          subtitle: "Guided learning journey",
          accent: ROSE,
          headlinePrefix: "Kid mode",
        };
      case "speed":
        return {
          mode: "speed",
          title: "Speed Training",
          subtitle: "Mental calculation drills",
          accent: YELLOW,
          headlinePrefix: "Speed mode",
        };
      case "exam":
        return {
          mode: "performance",
          title: "Competition Ready",
          subtitle: "Speed + accuracy under pressure",
          accent: EMERALD,
          headlinePrefix: "Exam mode",
        };
      case "brain-gym":
        return {
          mode: "brain_gym",
          title: "Brain Gym",
          subtitle: "Daily mental workout",
          accent: CYAN,
          headlinePrefix: "Brain gym",
        };
      default:
        return {
          mode: "speed",
          title: "Speed Math",
          subtitle: "Daily calculation practice",
          accent: YELLOW,
          headlinePrefix: "Speed math",
        };
    }
  }

  switch (temporalWindow) {
    case "this_year":
      return {
        mode: "exam_ready",
        title: "Exam Readiness",
        subtitle: "Get ready with a deadline",
        accent: EMERALD,
        headlinePrefix: "Exam ready",
      };
    case "whenever":
      return {
        mode: "gap_closer",
        title: "Preparation Gap",
        subtitle: "Close what you're missing",
        accent: CYAN,
        headlinePrefix: "Gap closer",
      };
    case "not_sure":
      return {
        mode: "discovery",
        title: "Discover Your Readiness",
        subtitle: "Build skills, figure it out",
        accent: VIOLET_PURPLE,
        headlinePrefix: "Discovery",
      };
    default:
      return {
        mode: "discovery",
        title: "Your Learning Path",
        subtitle: "Adaptive to your progress",
        accent: LIME,
        headlinePrefix: "Path",
      };
  }
}

export function allocateTimeBudget(dailyMinutes: number, focusMode: "sleep" | "sprint"): TimeBlock[] {
  const blocks: { label: string; ratio: number }[] =
    focusMode === "sleep"
      ? [
          { label: "Foundation", ratio: 0.3 },
          { label: "Weak area practice", ratio: 0.45 },
          { label: "Review", ratio: 0.25 },
        ]
      : [
          { label: "Concept", ratio: 0.2 },
          { label: "Tactical practice", ratio: 0.4 },
          { label: "Timed questions", ratio: 0.25 },
          { label: "Review", ratio: 0.15 },
        ];

  return blocks.map((b) => ({
    label: b.label,
    minutes: Math.round(dailyMinutes * b.ratio),
  }));
}