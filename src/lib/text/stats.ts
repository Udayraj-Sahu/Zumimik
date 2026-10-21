import type { HistoryEntry } from "@/lib/types/history";
import type { DashboardStats, Topic, StreakData, HomeRecentActivityItem } from "@/lib/types/dashboard";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function computeStats(entries: HistoryEntry[]): DashboardStats {
  if (entries.length === 0) return { accuracy: 0, questions: 0, percentile: 0, speed: 0 };
  const totalCorrect = entries.reduce((sum, e) => sum + e.score, 0);
  const totalQuestions = entries.reduce((sum, e) => sum + e.total, 0);
  const totalTime = entries.reduce((sum, e) => sum + e.totalTimeSpent, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const speed = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;
  return { accuracy, questions: totalQuestions, percentile: 0, speed };
}

export function computeTopicMastery(entries: HistoryEntry[]): Topic[] {
  if (entries.length === 0) return [];
  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const e of entries) {
    const key = e.topicLabel;
    const prev = topicMap.get(key) ?? { correct: 0, total: 0 };
    topicMap.set(key, { correct: prev.correct + e.score, total: prev.total + e.total });
  }
  return Array.from(topicMap.entries())
    .map(([name, { correct, total }]) => ({
      name,
      value: total > 0 ? Math.round((correct / total) * 100) : 0,
      color: "primary" as const,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export function computeStreak(entries: HistoryEntry[]): StreakData {
  if (entries.length === 0) {
    return { current: 0, xp: 0, days: [false, false, false, false, false, false, false], labels: ["M", "T", "W", "T", "F", "S", "S"] };
  }
  const xp = entries.reduce((sum, e) => sum + e.xpEarned, 0);
  const daySet = new Set<string>();
  for (const e of entries) {
    const d = new Date(e.completedAt);
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  const days: boolean[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    days.push(daySet.has(key));
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]) current++;
    else break;
  }
  return { current, xp, days, labels: ["M", "T", "W", "T", "F", "S", "S"] };
}

export function computeRecent(entries: HistoryEntry[]): HomeRecentActivityItem[] {
  return entries.slice(0, 3).map((e) => ({
    label: e.topicLabel,
    score: `${e.score}/${e.total}`,
    time: relativeTime(e.completedAt),
  }));
}
