import type { SolveAlongTemplate, TemplateSession } from "@/lib/types/template";

export async function getTemplate(id: string): Promise<SolveAlongTemplate | null> {
  const { SAMPLE_TEMPLATES, generateFallbackTemplates } = await import("@/lib/mock/templates");
  const { delay } = await import("@/lib/mock/delay");
  await delay(200);
  const match = SAMPLE_TEMPLATES.find((t) => t.id === id);
  if (match) return match;
  if (id.startsWith("fallback__")) {
    const parts = id.split("__");
    return generateFallbackTemplates(parts[1], parts[2], 1)[0] ?? null;
  }
  return null;
}

export async function getTemplatesByDomain(domain: string): Promise<SolveAlongTemplate[]> {
  const { getTemplatesByDomain: getBundledByDomain } = await import("@/lib/mock/templates");
  const { delay } = await import("@/lib/mock/delay");
  await delay(200);
  return getBundledByDomain(domain);
}

export async function getCategoriesForDomain(domain: string): Promise<string[]> {
  const { getCategoriesForDomain: getBundledCategories } = await import("@/lib/mock/templates");
  const { delay } = await import("@/lib/mock/delay");
  await delay(100);
  return getBundledCategories(domain);
}

export async function getTemplatesByCategory(
  category: string,
  domain?: string,
): Promise<SolveAlongTemplate[]> {
  const { delay } = await import("@/lib/mock/delay");
  await delay(200);
  const { getTemplatesByCategory, generateFallbackTemplates } = await import("@/lib/mock/templates");
  const bundled = getTemplatesByCategory(category, domain);
  return bundled.length > 0 ? bundled : generateFallbackTemplates(domain ?? "cat", category);
}

export async function getAllTemplates(): Promise<SolveAlongTemplate[]> {
  const { SAMPLE_TEMPLATES } = await import("@/lib/mock/templates");
  const { delay } = await import("@/lib/mock/delay");
  await delay(300);
  return SAMPLE_TEMPLATES;
}

export async function createTemplateSession(
  templateIds: string[],
  mode: "quick" | "solve_along" | "guided" = "solve_along",
): Promise<TemplateSession> {
  const { SAMPLE_TEMPLATES } = await import("@/lib/mock/templates");
  const { delay } = await import("@/lib/mock/delay");
  await delay(300);
  const templates = SAMPLE_TEMPLATES.filter((t) => templateIds.includes(t.id));
  return {
    id: `session_${Date.now()}`,
    templates,
    currentIndex: 0,
    stepProgress: Object.fromEntries(
      templates.map((t) => [
        t.id,
        { visibleSteps: 0, completed: false, correct: null, timeSpent: 0 },
      ]),
    ),
    mode,
  };
}
