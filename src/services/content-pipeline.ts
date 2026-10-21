import type { ContentFeedbackRequest, ContentFeedbackResponse } from "@/lib/types/content-feedback";
import { apiPost } from "./api";
import { useNetworkStore } from "@/stores/network-store";
import { db } from "./offline/db";

import { IS_MOCK } from "@/lib/platform";

let feedbackIdCounter = 0;

export async function submitContentFeedback(data: ContentFeedbackRequest): Promise<ContentFeedbackResponse> {
  if (IS_MOCK) {
    const { submitFeedback: mockSubmit } = await import("@/lib/mock/content-pipeline");
    await new Promise((r) => setTimeout(r, 200));
    return mockSubmit(data);
  }

  const { isOnline, addToQueue } = useNetworkStore.getState();

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
      payload: data,
      timestamp: Date.now(),
    });
    return { id, status: "accepted", message: "Queued offline" };
  }

  return apiPost<ContentFeedbackResponse>("/content/feedback", data);
}
