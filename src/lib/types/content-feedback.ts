export type FeedbackType = "thumbs_up" | "thumbs_down";

export type ContentFeedback = {
  questionId: string;
  feedbackType: FeedbackType;
  clarity?: number;
  difficultyRating?: number;
  wrongAnswer?: boolean;
  comment?: string;
  timestamp: number;
  synced: boolean;
};

export type ContentFeedbackRequest = {
  questionId: string;
  feedbackType: FeedbackType;
  clarity?: number;
  difficultyRating?: number;
  wrongAnswer?: boolean;
  comment?: string;
};

export type ContentFeedbackResponse = {
  id: string;
  status: "accepted" | "rejected";
  message?: string;
};
