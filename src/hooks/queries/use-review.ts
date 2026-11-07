import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { loadCatalogSkills, loadLearnerStates, loadSinkingBook } from "@/services/learner";
import { reviewItems, reviewQueue, withDecayEntries, type ReviewItem } from "@/lib/learning/review";
/** The techniques due for revision now: the engine's queue over this learner's real state and review entries. */
export function useReviewItems() {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  return useQuery<ReviewItem[]>({
    queryKey: ["review-items", userId],
    queryFn: async () => {
      const now = Date.now();
      const states = await loadLearnerStates(userId, now);
      if (!states) return [];
      const catalog = await loadCatalogSkills();
      const servable = new Set(catalog.filter((c) => c.servable !== 0).map((c) => c.skill));
      const queue = reviewQueue(withDecayEntries(loadSinkingBook(userId), states, now), servable);
      return reviewItems(queue, states, now);
    },
    enabled: !!userId,
    staleTime: 60000,
    retry: false,
  });
}
