"use client";
import { Suspense } from "react";
import { StoryDetail } from "@/components/feed/feed-detail";

/** A feed story, picked with ?id= (a query string, not a path segment, so the static export needs no page per backend id). */
export default function FeedStoryPage() {
  return (
    <Suspense fallback={null}>
      <StoryDetail />
    </Suspense>
  );
}
