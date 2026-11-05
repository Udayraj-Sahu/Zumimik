import { getAllTechniques } from "@/lib/mock/techniques";
import { REFERENCE_PAGE_IDS_SNAPSHOT } from "@/lib/reference-ids";
import { ClientTechniquePage } from "./client-page";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** The live Reference Library ids at build time. Never throws: an unreachable API falls back to the snapshot. */
async function fetchReferenceIds(): Promise<string[]> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/api/subtopics/reference`, { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { pages?: Array<{ subtopic_id?: unknown }> };
    return (data.pages ?? []).map((p) => p.subtopic_id).filter((id): id is string => typeof id === "string" && ID_PATTERN.test(id));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function generateStaticParams() {
  const live = await fetchReferenceIds();
  const ids = new Set<string>([...getAllTechniques().map((t) => t.id), ...REFERENCE_PAGE_IDS_SNAPSHOT, ...live]);
  return [...ids].map((id) => ({ id }));
}

export default function TechniquePageWrapper() {
  return <ClientTechniquePage />;
}
