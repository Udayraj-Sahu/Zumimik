import { REFERENCE_PAGE_IDS_SNAPSHOT, hasTechniquePage, skillSlug } from "@/lib/reference-ids";
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

/** The Explorer opens a technique node here with its skill id (a :Skill name, e.g. "Fractions and Decimals"), so those need a page too. */
async function fetchSkillIds(): Promise<string[]> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/api/practice/techniques?limit=500`, { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { techniques?: Array<{ name?: unknown }> };
    return (data.techniques ?? []).map((t) => t.name).filter((n): n is string => typeof n === "string" && hasTechniquePage(n)).map(skillSlug);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function generateStaticParams() {
  const [live, skills] = await Promise.all([fetchReferenceIds(), fetchSkillIds()]);
  const ids = new Set<string>([...REFERENCE_PAGE_IDS_SNAPSHOT, ...live, ...skills]);
  return [...ids].map((id) => ({ id }));
}

export default function TechniquePageWrapper() {
  return <ClientTechniquePage />;
}
