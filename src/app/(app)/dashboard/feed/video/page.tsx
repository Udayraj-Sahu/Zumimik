"use client";
import { Suspense } from "react";
import { VideoDetail } from "@/components/feed/feed-detail";

/** A feed video, picked with ?id= (a query string, not a path segment, so the static export needs no page per backend id). */
export default function FeedVideoPage() {
  return (
    <Suspense fallback={null}>
      <VideoDetail />
    </Suspense>
  );
}
