"use client";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";
export default function PlannerPage() {
  return (
    <FeatureUnavailable
      title="Class Calendar"
      description="The planner isn't available yet. The server doesn't support it, so no schedule is shown."
    />
  );
}
