import type { FaqItem, AppInfo } from "@/lib/types/help";

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    question: "How do I start a sprint?",
    answer:
      'Navigate to the Sprints page from the sidebar, select your topic, duration, and difficulty, then tap "Start Sprint". You\'ll be presented with timed questions — answer each one to earn XP and track your progress.',
  },
  {
    id: "faq-2",
    question: "What are streaks and how do they work?",
    answer:
      "Streaks track consecutive days you complete at least one sprint. The longer your streak, the more bonus XP you earn. Streaks reset if you miss a day, so stay consistent!",
  },
  {
    id: "faq-3",
    question: "How is XP calculated?",
    answer:
      "XP is earned per sprint: 10 XP per correct answer, plus a 50 XP accuracy bonus if you score 80% or higher, and an additional 100 XP for a perfect 100% score. Streak bonuses and challenge rewards add extra XP on top.",
  },
  {
    id: "faq-4",
    question: "Can I review my past sprint results?",
    answer:
      "Yes after each sprint you'll see a detailed results page with your score, accuracy, time breakdown, and a question-by-question review. Past results are available in your Analytics dashboard.",
  },
  {
    id: "faq-5",
    question: "What do the difficulty levels mean?",
    answer:
      "Beginner: standard questions with relaxed time limits. Advanced: harder questions with tighter time limits. Adaptive: the system adjusts difficulty based on your performance in real-time.",
  },
];

export const APP_INFO: AppInfo = {
  version: "1.0.0",
  platform: "Web / Android APK",
  buildNumber: "2026.06.20",
};
