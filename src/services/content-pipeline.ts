import type { ContentFeedbackRequest, ContentFeedbackResponse } from "@/lib/types/content-feedback";
import { apiPost } from "./api";
import { useNetworkStore } from "@/stores/network-store";
import { db } from "./offline/db";
import { mapContentFeedback } from "./backend-adapters";
let feedbackIdCounter = 0;
export async function submitContentFeedback(
  data: ContentFeedbackRequest,
): Promise<ContentFeedbackResponse> {
  if (data.feedbackType === "thumbs_up") {
    // The backend sync contract accepts content reports, not positive ratings.
    return {
      id: `feedback-${Date.now()}`,
      status: "accepted",
      message: "Thanks for your feedback.",
    };
  }
  const { isOnline, addToQueue } = useNetworkStore.getState();
  const backendPayload = mapContentFeedback(data);
  if (!isOnline) {
    feedbackIdCounter++;
    const id = `fb-offline-${Date.now()}-${feedbackIdCounter}`;
    await db.feedbackQueue.put({
      id,
      payload: data,
      createdAt: Date.now(),
      retryCount: 0,
    });
    addToQueue({
      id,
      key: "content/feedback",
      payload: backendPayload,
      timestamp: Date.now(),
    });
    return { id, status: "accepted", message: "Queued offline" };
  }
  await apiPost<{
    status: "accepted";
    key: string;
  }>("/sync/content/feedback", backendPayload);
  return { id: data.questionId, status: "accepted", message: "Feedback saved." };
}
