import type { ContentFeedbackRequest, ContentFeedbackResponse } from "@/lib/types/content-feedback";

const feedbackStore: ContentFeedbackRequest[] = [];
let counter = 0;

export async function submitFeedback(data: ContentFeedbackRequest): Promise<ContentFeedbackResponse> {
  await new Promise((r) => setTimeout(r, 150));
  counter++;
  feedbackStore.push(data);
  return {
    id: `fb-${Date.now()}-${counter}`,
    status: "accepted",
  };
}

export function getStoredFeedback(): ContentFeedbackRequest[] {
  return [...feedbackStore];
}
