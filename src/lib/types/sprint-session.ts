export type TrustStatus = "sandbox" | "trusted" | "live";

export type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  answerType?: "choice" | "text";
  expectedAnswer?: number | null;
  answerCheck?: "client_extract" | "server_sympy";
  feedsMastery?: boolean;
  timeLimit: number;
  difficulty?: number;
  hint?: string;
  explanation?: string;
  techniqueId?: string;
  /** The canonical :Skill id (GET /practice/catalog vocabulary). Mastery and ability are keyed on this only; `techniqueId` may be a corpus label. */
  skillId?: string;
  /** The subject the backend assigned to this item (quant or di). Absent when the backend did not name one: it is then unclassified, never assumed to be quant. */
  subject?: "quant" | "di";
  /** The slot bucket the server served this item under (primary = consolidate, sinking = review, frontier = new). */
  bucket?: "primary" | "sinking" | "frontier";
  /** IRT item parameters the server attached (calibrated, or the seed a=1, b=difficulty-3). Absent: the client seeds from `difficulty`. */
  irt?: { a: number; b: number; source: string };
  trustStatus?: TrustStatus;
  sourceId?: string;
  variantGroupId?: string;
  /** Mock exams: backend option ids ("a", "b", …), parallel to `options`. Answers are submitted by id. */
  optionIds?: string[];
  /** Mock exams: the server withholds correct answers and grades on submit; the client never shows a verdict. */
  serverGraded?: boolean;
};

export type SprintSession = {
  id: string;
  /** Mock exams: set when the server could not build a faithful paper and served a labelled practice attempt instead (not scored for percentile). */
  practiceLabel?: string | null;
  domain?: string;
  topic: string;
  topicLabel: string;
  difficulty: string;
  questions: Question[];
  totalTime: number;
  /** Set for backend mock exams (POST /mocks/configure → mock_id). */
  mockId?: string;
};

export type SprintAnswer = {
  questionId: string;
  selectedIndex: number;
  answerText?: string;
  correct: boolean | null;
  timeSpent: number;
  /** Epoch ms at which the learner submitted this answer (the device clock at that moment). Absent on answers from before it was recorded. */
  answeredAt?: number;
};

export type SprintResult = {
  answers: SprintAnswer[];
  score: number;
  total: number;
  accuracy: number;
  totalTimeSpent: number;
  xpEarned: number;
};
