import type { SolveAlongTemplate, TemplateSession } from "@/lib/types/template";
import { apiGet, apiPost } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getTemplate(id: string): Promise<SolveAlongTemplate | null> {
  if (IS_MOCK) {
    const { SAMPLE_TEMPLATES, generateFallbackTemplates } = await import("@/lib/mock/templates");
    const { delay } = await import("@/lib/mock/delay");
    await delay(200);
    const match = SAMPLE_TEMPLATES.find((t) => t.id === id);
    if (match) return match;
    if (id.startsWith("fallback__")) {
      const parts = id.split("__");
      const domain = parts[1];
      const category = parts[2];
      return generateFallbackTemplates(domain, category, 1)[0] ?? null;
    }
    return null;
  }
  return apiGet<SolveAlongTemplate>(`/api/templates/${id}`);
}

export async function getTemplatesByDomain(domain: string): Promise<SolveAlongTemplate[]> {
  if (IS_MOCK) {
    const { getTemplatesByDomain: mockGetByDomain } = await import("@/lib/mock/templates");
    const { delay } = await import("@/lib/mock/delay");
    await delay(200);
    return mockGetByDomain(domain);
  }
  return apiGet<SolveAlongTemplate[]>(`/api/templates?domain=${domain}`);
}

export async function getCategoriesForDomain(domain: string): Promise<string[]> {
  if (IS_MOCK) {
    const { getCategoriesForDomain: mockGetCategories } = await import("@/lib/mock/templates");
    const { delay } = await import("@/lib/mock/delay");
    await delay(100);
    return mockGetCategories(domain);
  }
  return apiGet<string[]>(`/api/templates/categories?domain=${domain}`);
}

export async function getTemplatesByCategory(
  category: string,
  domain?: string,
): Promise<SolveAlongTemplate[]> {
  if (IS_MOCK) {
    const { delay } = await import("@/lib/mock/delay");

    await delay(200);
    const { getTemplatesByCategory: mockGetByCat, generateFallbackTemplates } = await import("@/lib/mock/templates");
    const real = mockGetByCat(category, domain);
    if (real.length > 0) return real;
    return generateFallbackTemplates(domain ?? "cat", category);
  }
  const params = new URLSearchParams({ category });
  if (domain) params.set("domain", domain);
  return apiGet<SolveAlongTemplate[]>(`/api/templates?${params}`);
}

export async function getAllTemplates(): Promise<SolveAlongTemplate[]> {
  if (IS_MOCK) {
    const { SAMPLE_TEMPLATES } = await import("@/lib/mock/templates");
    const { delay } = await import("@/lib/mock/delay");
    await delay(300);
    return SAMPLE_TEMPLATES;
  }
  return apiGet<SolveAlongTemplate[]>("/api/templates");
}

export async function createTemplateSession(
  templateIds: string[],
  mode: "quick" | "solve_along" | "guided" = "solve_along",
): Promise<TemplateSession> {
  if (IS_MOCK) {
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
  return apiPost<TemplateSession>("/api/template-sessions", {
    templateIds,
    mode,
  });
}
