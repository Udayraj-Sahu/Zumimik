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
};

export type SprintResult = {
  answers: SprintAnswer[];
  score: number;
  total: number;
  accuracy: number;
  totalTimeSpent: number;
  xpEarned: number;
};
