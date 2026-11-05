"use client";

import { FeedLive } from "@/components/feed/feed-live";

/** The Feed is always the backend's: GET /api/v1/feed. There are no bundled posts, in any mode. */
export default function FeedPage() {
  return <FeedLive />;
}
