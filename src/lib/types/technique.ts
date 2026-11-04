export type TopicNodeType = "subject" | "topic" | "subtopic" | "technique";

export type EdgeType = "REQUIRES" | "FRONTIER_OF" | "NEXT_TOPIC";

export type TopicEdge = {
  sourceId: string;
  targetId: string;
  type: EdgeType;
  label?: string;
};

export type TopicNode = {
  id: string;
  type: TopicNodeType;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  children?: TopicNode[];
  techniqueId?: string;
  masteryLevel?: number;
};

export type QuickReferenceCard = {
  formula: string;
  keyIdea: string;
  shortcut: string;
  commonMistake: string;
};

export type DifficultyLevel = {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  explanation: string;
  examples: TechniqueExample[];
  questions: TechniquePracticeQuestion[];
  commonTraps: string[];
  speedTips: string[];
};

export type TechniqueExample = {
  problem: string;
  steps: string[];
  answer: string;
};

export type TechniquePracticeQuestion = {
  id: string;
  text: string;
  options?: string[];
  correctIndex?: number;
  answer?: string;
  explanation: string;
};

export type Technique = {
  id: string;
  subjectId: string;
  topicPath: string[];
  name: string;
  quickReference: QuickReferenceCard;
  levels: Partial<Record<1 | 2 | 3 | 4 | 5, DifficultyLevel>>;
};
