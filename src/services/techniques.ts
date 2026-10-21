import type { Technique } from "@/lib/types/technique";
import { apiGet } from "./api";

import { IS_MOCK } from "@/lib/platform";

export async function getTechnique(id: string): Promise<Technique | null> {
  if (IS_MOCK) {
    const { getTechniqueById: mockGetById } = await import("@/lib/mock/techniques");
    const { delay } = await import("@/lib/mock/delay");
    await delay(200);
    return mockGetById(id) ?? null;
  }
  return apiGet<Technique>(`/api/techniques/${id}`);
}

export async function getTechniquesBySubject(subjectId: string): Promise<Technique[]> {
  if (IS_MOCK) {
    const { getTechniquesBySubject: mockGetBySubject } = await import("@/lib/mock/techniques");
    const { delay } = await import("@/lib/mock/delay");
    await delay(250);
    return mockGetBySubject(subjectId);
  }
  return apiGet<Technique[]>(`/api/techniques?subject=${subjectId}`);
}

export async function getAllTechniques(): Promise<Technique[]> {
  if (IS_MOCK) {
    const { getAllTechniques: mockGetAll } = await import("@/lib/mock/techniques");
    const { delay } = await import("@/lib/mock/delay");
    await delay(300);
    return mockGetAll();
  }
  return apiGet<Technique[]>("/api/techniques");
}
