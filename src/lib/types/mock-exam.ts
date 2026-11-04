export type MockPaperSection = {
  id: string;
  label: string;
  topic: string;
  questions: number;
  minutes: number;
};

export type MockPaper = {
  id: string;
  domain: string;
  title: string;
  shortLabel: string;
  description: string;
  sections: MockPaperSection[];
  totalQuestions: number;
  durationMinutes: number;
  difficulty: string;
  accent: string;
};
