import type { AchievementCategory, AchievementItem, AchievementTier } from "@/lib/types/achievements";
import type { Friend } from "@/lib/types/friends";
import type { MockPaper } from "@/lib/types/mock-exam";
import type { RecentActivityItem } from "@/lib/types/analytics";
import type { TopicEdge, TopicNode } from "@/lib/types/technique";
import type { HistoryEntry } from "@/lib/types/history";
import type { SprintTopic } from "@/lib/types/sprint";
import type { SprintResult, SprintSession, TrustStatus } from "@/lib/types/sprint-session";
import type { AdaptiveDomainState, AdaptiveTopicState } from "@/lib/types/adaptive";
import type { ContentFeedbackRequest } from "@/lib/types/content-feedback";
import type { NotificationItem } from "@/lib/types/notifications";
import { Zap } from "lucide-react";
import { CYAN, EMERALD, LIME_BRIGHT, VIOLET_PURPLE } from "@/lib/theme";

type BackendAchievement = {
  key: string;
  name: string;
  tier: number;
  category: string;
  phase?: string;
  desc?: string;
  unlocked_at?: string | null;
};

export type BackendAchievementsResponse = {
  achievements: BackendAchievement[];
};

const ACHIEVEMENT_CATEGORIES = new Set<AchievementCategory>([
  "streak",
  "accuracy",
  "speed",
  "social",
  "competitive",
  "collaborative",
  "milestone",
  "special",
]);

function achievementTier(tier: number): AchievementTier {
  if (tier <= 1) return "bronze";
  if (tier === 2) return "silver";
  if (tier === 3) return "gold";
  return "platinum";
}

function achievementIcon(key: string, category: string): string {
  if (key.includes("speed")) return "Zap";
  if (category === "streak") return "Flame";
  if (category === "social" || category === "collaborative") return "Users";
  if (category === "competitive") return "Swords";
  if (category === "milestone") return "Medal";
  return "Trophy";
}

export function mapBackendAchievements(response: BackendAchievementsResponse): AchievementItem[] {
  return response.achievements.map((achievement) => ({
    id: achievement.key,
    icon: achievementIcon(achievement.key, achievement.category),
    label: achievement.name,
    description: achievement.desc ?? achievement.name,
    unlocked: Boolean(achievement.unlocked_at),
    tier: achievementTier(achievement.tier),
    category: ACHIEVEMENT_CATEGORIES.has(achievement.category as AchievementCategory)
      ? (achievement.category as AchievementCategory)
      : "special",
    ...(achievement.unlocked_at ? { unlockedAt: achievement.unlocked_at } : {}),
  }));
}

type BackendFriend = {
  friendship_id?: string;
  user_id: string;
  name: string;
  source?: string;
  since?: string | null;
};

export type BackendFriendsResponse = {
  friends: BackendFriend[];
  incoming: BackendFriend[];
  outgoing: Array<{ friendship_id: string; status: string }>;
};

function initialsFor(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function mapFriend(friend: BackendFriend): Friend {
  return {
    id: friend.user_id,
    ...(friend.friendship_id ? { friendshipId: friend.friendship_id } : {}),
    name: friend.name,
    initials: initialsFor(friend.name),
  };
}

export function mapBackendFriends(response: BackendFriendsResponse): {
  friends: Friend[];
  requests: Friend[];
} {
  return {
    friends: response.friends.map(mapFriend),
    requests: response.incoming.map(mapFriend),
  };
}

export function mapBackendRecentActivity(
  response: Array<{ label: string; score: string; time: string }>,
): RecentActivityItem[] {
  return response.map(({ label, score, time }) => ({ title: label, sub: score, time }));
}

export function mapDashboardEventsToNotifications(
  events: Array<{ title: string; time: string; tag: string }>,
): NotificationItem[] {
  return events.map((event, index) => ({
    id: `dashboard-event-${index}-${event.tag.toLowerCase()}`,
    type: event.tag === "LIVE" ? "challenge" : "system",
    title: event.title,
    message: event.title,
    time: event.time,
    read: false,
  }));
}

export type BackendTopicCatalogResponse = {
  /** subtopic_list: the sub-topic NAMES behind the `subtopics` count (GET /api/topics, with or without ?domain=). */
  topics: Array<{ topic: string; problems: number; subtopics: number; subtopic_list?: string[] }>;
};

export function mapBackendTopicCatalog(response: BackendTopicCatalogResponse): TopicNode[] {
  return response.topics.map(({ topic, problems, subtopics }) => ({
    id: topic,
    type: "topic",
    title: topic.replace(/[_-]+/g, " "),
    slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: `${problems} problems · ${subtopics} subtopics`,
  }));
}

export type BackendTechniqueSummaryResponse = {
  techniques: Array<{
    name: string;
    topic?: string | null;
    sub_topic?: string | null;
    is_root?: boolean | null;
    problem_count: number;
  }>;
};

export function mapBackendTechniqueSummaries(response: BackendTechniqueSummaryResponse): TopicNode[] {
  return response.techniques.map((technique) => ({
    id: technique.name,
    type: "technique",
    title: technique.name.replace(/[_-]+/g, " "),
    slug: technique.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: [technique.topic, technique.sub_topic, `${technique.problem_count} problems`]
      .filter(Boolean)
      .join(" · "),
    techniqueId: technique.name,
  }));
}

export type BackendPracticeCatalogResponse = {
  skills: Array<{
    skill: string;
    parents: string[];
    servable?: number;
    unseen?: number;
    generated?: number;
  }>;
};

export function mapBackendPracticeEdges(response: BackendPracticeCatalogResponse): TopicEdge[] {
  return response.skills.flatMap(({ skill, parents }) =>
    parents.map((parent) => ({ sourceId: skill, targetId: parent, type: "REQUIRES" as const })),
  );
}

export type BackendMasteryResponse = {
  technique_states: Record<string, Record<string, unknown>>;
  selection?: Record<string, { decayed_p_learned?: number; effective_state?: string }>;
};

export function mapBackendMastery(response: BackendMasteryResponse, domain: string): AdaptiveDomainState {
  const topics: AdaptiveTopicState[] = Object.entries(response.technique_states ?? {}).map(([skill, state]) => {
    const selection = response.selection?.[skill];
    const rawMastery = selection?.decayed_p_learned ?? Number(state.pLearned ?? state.masteryScore ?? 0);
    const mastery = Math.max(0, Math.min(100, Math.round(rawMastery <= 1 ? rawMastery * 100 : rawMastery)));
    const attempts = Number(state.totalAttempts ?? state.total_attempts ?? 0);
    const currentStreak = Number(state.consecutiveCorrect ?? state.consecutive_correct ?? 0);

    return {
      id: skill,
      name: skill.replace(/[_-]+/g, " "),
      color: LIME_BRIGHT,
      mastery,
      attempts,
      currentStreak,
      bestStreak: Number(state.bestStreak ?? state.best_streak ?? currentStreak),
      status: mastery >= 80 ? "MASTERED" : attempts > 0 ? "ACTIVE" : "NEW",
    };
  });

  return { domain, topics, lastSession: null };
}

export type BackendContentFeedbackRequest = {
  templateId: string;
  trustStatus?: string;
  reason: "wrong_answer" | "other";
  comment?: string;
  reportedAt: number;
  domain?: string;
};

export function mapContentFeedback(data: ContentFeedbackRequest): BackendContentFeedbackRequest {
  return {
    templateId: data.questionId,
    reason: data.wrongAnswer ? "wrong_answer" : "other",
    comment: data.comment ?? "Learner marked this content as not helpful.",
    reportedAt: Date.now(),
  };
}

export type SignedPairingPayload = { code: string; sig: string };

export function parseSignedPairingPayload(value: string): SignedPairingPayload | null {
  let payload: unknown;
  try {
    payload = JSON.parse(value);
  } catch {
    const [code, sig, extra] = value.split(".");
    payload = extra === undefined ? { code, sig } : null;
  }
  if (!payload || typeof payload !== "object") return null;
  const { code, sig } = payload as Record<string, unknown>;
  if (typeof code !== "string" || typeof sig !== "string") return null;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(code) || !/^[a-fA-F0-9]{64}$/.test(sig)) return null;
  return { code, sig };
}

export function mapPracticeCatalogToSprintTopics(response: BackendPracticeCatalogResponse): SprintTopic[] {
  return response.skills
    .filter((skill) => skill.servable === undefined || skill.servable > 0 || (skill.generated ?? 0) > 0)
    .map((skill) => ({
      id: skill.skill,
      label: skill.skill.replace(/[_-]+/g, " "),
      icon: Zap,
      color: LIME_BRIGHT,
    }));
}

export type BackendPracticeSessionResponse = {
  items: Array<{
    source: string;
    template_id: string;
    question_text: string | null;
    difficulty: number;
    skill: string | null;
    technique: string | null;
    topic: string | null;
    sub_topic: string | null;
    trust: string;
    feeds_mastery: boolean;
    irt?: { a?: number; b?: number; source?: string } | null;
    answer_check: "client_extract" | "server_sympy";
    expected_answer: number | null;
    answer_key_display?: string | null;
    template?: unknown;
  }>;
  summary: { requested: number; served: number; [key: string]: unknown };
};

export function mapBackendPracticeSession(
  response: BackendPracticeSessionResponse,
  input: { topic: string; difficulty: string; domain?: string },
): SprintSession {
  const trustStatus = (trust: string): TrustStatus | undefined =>
    trust === "trusted" || trust === "sandbox" || trust === "live" ? trust : undefined;

  return {
    id: crypto.randomUUID(),
    domain: input.domain,
    topic: input.topic,
    topicLabel: input.topic.replace(/[_-]+/g, " "),
    difficulty: input.difficulty,
    totalTime: response.items.length * 30,
    questions: response.items.map((item) => {
      const template = item.template as { expected_time?: unknown; key_reminders?: unknown } | undefined;
      const expectedTime = Number(template?.expected_time);
      const hint = Array.isArray(template?.key_reminders)
        ? template.key_reminders.find((reminder): reminder is string => typeof reminder === "string")
        : undefined;
      return {
        id: item.template_id,
        text: item.question_text ?? "This problem has no display text yet.",
        options: [],
        correctIndex: -1,
        answerType: "text",
        expectedAnswer: item.expected_answer,
        answerCheck: item.answer_check,
        feedsMastery: item.feeds_mastery,
        timeLimit: Number.isFinite(expectedTime) && expectedTime > 0 ? Math.ceil(expectedTime) : 30,
        difficulty: item.difficulty,
        hint,
        techniqueId: item.skill ?? item.technique ?? undefined,
        ...(item.skill ? { skillId: item.skill } : {}),
        ...(typeof item.irt?.a === "number" && Number.isFinite(item.irt.a) && item.irt.a > 0 && typeof item.irt.b === "number" && Number.isFinite(item.irt.b)
          ? { irt: { a: item.irt.a, b: item.irt.b, source: item.irt.source ?? "seed" } }
          : {}),
        trustStatus: trustStatus(item.trust),
        sourceId: item.template_id,
      };
    }),
  };
}

export type BackendMockHistoryResponse = {
  attempts: Array<{
    mock_id: string;
    exam: string;
    sections: string[];
    total_score: number | null;
    max_score: number | null;
    percentile: number | null;
    completed_at: string | null;
    total_time_taken_seconds: number | null;
    practice_label?: string | null;
  }>;
};

const HISTORY_SECTION_KEYS: Record<string, Record<string, string>> = {
  cat: { varc: "va", dilr: "lrdi", qa: "qa" },
  gmat: { quant: "ps", verbal: "rc", di: "ds" },
  gre: { quant: "ps", verbal: "rc", awa: "tc" },
};

const HISTORY_SECTION_LABELS: Record<string, Record<string, string>> = {
  cat: { varc: "Verbal Ability", dilr: "LR & DI", qa: "Quantitative Aptitude" },
  gmat: { quant: "Quantitative", verbal: "Verbal", di: "Data Insights" },
  gre: { quant: "Quantitative", verbal: "Verbal", awa: "Analytical Writing" },
};

export function mapMockHistory(response: BackendMockHistoryResponse, domain?: string): HistoryEntry[] {
  return response.attempts
    .filter((attempt) => !domain || attempt.exam === domain)
    .map((attempt) => {
      const section = attempt.sections[0];
      const score = attempt.total_score ?? 0;
      const total = attempt.max_score ?? 0;
      const topic = section
        ? (HISTORY_SECTION_KEYS[attempt.exam]?.[section] ?? section)
        : attempt.exam;
      const sectionLabel = section
        ? (HISTORY_SECTION_LABELS[attempt.exam]?.[section] ?? section.toUpperCase())
        : "Mock Exam";
      return {
        id: attempt.mock_id,
        topic,
        topicLabel: `${attempt.exam.toUpperCase()} · ${sectionLabel}`,
        difficulty: attempt.practice_label ? "Practice" : "Mock exam",
        score,
        total,
        accuracy: total > 0 ? Math.round((score / total) * 100) : 0,
        totalTimeSpent: (attempt.total_time_taken_seconds ?? 0) * 1000,
        completedAt: attempt.completed_at ?? "",
      };
  });
}

export function mapMockHistoryFilters(
  response: BackendBlueprintsResponse,
  domain?: string,
): Array<{ id: string; label: string }> {
  return [
    { id: "all", label: "All Topics" },
    ...response.blueprints
      .filter((blueprint) => !domain || blueprint.key === domain)
      .flatMap((blueprint) =>
        blueprint.sections.map((section) => ({
          id: HISTORY_SECTION_KEYS[blueprint.key]?.[section.key] ?? section.key,
          label: HISTORY_SECTION_LABELS[blueprint.key]?.[section.key] ?? section.name,
        })),
      ),
  ];
}

type BackendBlueprint = {
  key: string;
  name: string;
  scoring: string;
  negative_marking: boolean;
  total_minutes: number;
  notes: string;
  sections: Array<{ key: string; name: string; questions: number; minutes: number }>;
};

export type BackendBlueprintsResponse = {
  blueprints: BackendBlueprint[];
};

const PAPER_ACCENTS: Record<string, string> = {
  cat: VIOLET_PURPLE,
  gmat: EMERALD,
  gre: CYAN,
};

export function mapMockBlueprints(
  response: BackendBlueprintsResponse,
  domain?: string,
): MockPaper[] {
  const selectedDomain = domain ?? "cat";
  return response.blueprints
    .filter((blueprint) => blueprint.key === selectedDomain)
    .map((blueprint) => ({
      id: blueprint.key,
      domain: blueprint.key,
      title: blueprint.name,
      shortLabel: blueprint.key.toUpperCase(),
      description: blueprint.notes,
      sections: blueprint.sections.map((section) => ({
        id: section.key,
        label: section.name,
        topic: section.key,
        questions: section.questions,
        minutes: section.minutes,
      })),
      totalQuestions: blueprint.sections.reduce((total, section) => total + section.questions, 0),
      durationMinutes: blueprint.total_minutes,
      difficulty: blueprint.scoring === "scaled" ? "Scaled scoring" : "Raw scoring",
      accent: PAPER_ACCENTS[blueprint.key] ?? CYAN,
    }));
}

// ── Mock exam lifecycle: configure → submit-answer → submit → results ──────

export type BackendMockQuestion = {
  question_id: string;
  kind?: string;
  text: string;
  options?: Array<{ id: string; text: string }> | null;
  skill?: string | null;
  difficulty?: number | string | null;
  position?: number;
};

export type BackendMockConfigureResponse = {
  mock_id: string;
  exam: string;
  mode: string;
  time_limit_seconds: number;
  timers_suppressed?: boolean;
  practice_label?: string | null;
  sections: Array<{ key: string; name: string; minutes: number; questions: BackendMockQuestion[] }>;
};

export function mapMockConfigure(response: BackendMockConfigureResponse, title?: string): SprintSession {
  const questions = response.sections.flatMap((section) =>
    section.questions.map((q) => {
      const options = q.options ?? [];
      return {
        id: q.question_id,
        text: q.text,
        options: options.map((o) => o.text),
        optionIds: options.map((o) => o.id),
        // No options → free-text (TITA/numeric); the answer is typed and sent as-is.
        answerType: options.length === 0 ? ("text" as const) : ("choice" as const),
        correctIndex: -1,
        serverGraded: true,
        timeLimit: Math.max(30, Math.round((section.minutes * 60) / Math.max(section.questions.length, 1))),
        techniqueId: q.skill ?? undefined,
        difficulty: typeof q.difficulty === "number" ? q.difficulty : undefined,
      };
    }),
  );
  return {
    id: response.mock_id,
    mockId: response.mock_id,
    domain: response.exam,
    topic: response.exam,
    topicLabel: title ?? response.exam.toUpperCase(),
    difficulty: response.practice_label ?? "Full Test",
    practiceLabel: response.practice_label ?? null,
    questions,
    totalTime: response.time_limit_seconds,
  };
}

export type BackendMockSubmitResponse = { mock_id: string; xp_awarded?: number; percentile?: number | null; deferred_sinking_skills?: string[] };

export type BackendMockResultsResponse = {
  mock_id: string;
  review: Array<{
    question_id: string;
    your_answer: string | null;
    verdict: boolean | null;
    time_ms: number | null;
  }>;
};

/** Build the client SprintResult from the server-graded review. Verdicts are the backend's, never computed locally. */
export function mapMockResults(
  results: BackendMockResultsResponse,
  questions: SprintSession["questions"],
  xpEarned: number,
  totalTimeSpent: number,
): SprintResult {
  const byId = new Map(results.review.map((r) => [r.question_id, r]));
  const answers: SprintResult["answers"] = questions.map((q) => {
    const r = byId.get(q.id);
    const idx = r?.your_answer != null ? (q.optionIds ?? []).indexOf(r.your_answer) : -1;
    return {
      questionId: q.id,
      selectedIndex: idx,
      ...(r?.your_answer != null && q.answerType === "text" ? { answerText: r.your_answer } : {}),
      correct: r?.verdict ?? null,
      timeSpent: Math.round((r?.time_ms ?? 0) / 1000),
    };
  });
  const score = answers.filter((a) => a.correct === true).length;
  const graded = answers.filter((a) => a.correct !== null).length;
  return {
    answers,
    score,
    total: questions.length,
    accuracy: graded > 0 ? Math.round((score / graded) * 100) : 0,
    totalTimeSpent,
    xpEarned,
  };
}
