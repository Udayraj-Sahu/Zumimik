import type { Question, SprintAnswer } from "@/lib/types/sprint-session";

export type Tally = { attempts: number; correct: number; accuracyPct: number };
export type TechniqueTally = Tally & { skill: string };
export type DifficultyTally = Tally & { difficulty: number };

export type SessionBreakdown = {
  byTechnique: TechniqueTally[];
  byDifficulty: DifficultyTally[];
  /** Mean time per scored answer in seconds; null when nothing was scored. */
  avgSeconds: number | null;
};

const pct = (c: number, n: number) => (n === 0 ? 0 : Math.round((c / n) * 100));

/**
 * Accuracy of one finished session by technique and by difficulty, and the average answer time. These are this session's results
 * only: ACCURACY. Mastery of a technique is a different thing (the engine's label over the learner's whole history) and is never
 * computed here. Only scored answers count (a deferred, server-graded answer has no verdict yet), and only answers whose question
 * carries the canonical skill are grouped by technique.
 */
export function breakdownSession(questions: ReadonlyArray<Pick<Question, "id" | "skillId" | "difficulty">>, answers: ReadonlyArray<SprintAnswer>): SessionBreakdown {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const tech = new Map<string, { attempts: number; correct: number }>();
  const diff = new Map<number, { attempts: number; correct: number }>();
  let time = 0;
  let scored = 0;
  for (const a of answers) {
    if (a.correct === null || (a.selectedIndex === -1 && a.answerText === undefined)) continue;
    const q = byId.get(a.questionId);
    scored += 1;
    time += Math.max(0, a.timeSpent);
    const hit = a.correct ? 1 : 0;
    if (q?.skillId) {
      const t = tech.get(q.skillId) ?? { attempts: 0, correct: 0 };
      t.attempts += 1; t.correct += hit; tech.set(q.skillId, t);
    }
    if (typeof q?.difficulty === "number") {
      const d = diff.get(q.difficulty) ?? { attempts: 0, correct: 0 };
      d.attempts += 1; d.correct += hit; diff.set(q.difficulty, d);
    }
  }
  return {
    byTechnique: [...tech].map(([skill, t]) => ({ skill, ...t, accuracyPct: pct(t.correct, t.attempts) })).sort((a, b) => a.accuracyPct - b.accuracyPct || a.skill.localeCompare(b.skill)),
    byDifficulty: [...diff].map(([difficulty, d]) => ({ difficulty, ...d, accuracyPct: pct(d.correct, d.attempts) })).sort((a, b) => a.difficulty - b.difficulty),
    avgSeconds: scored === 0 ? null : Math.round((time / scored) * 10) / 10,
  };
}
