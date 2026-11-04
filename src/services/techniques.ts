import type { Technique } from "@/lib/types/technique";

export async function getTechnique(id: string): Promise<Technique | null> {
  // The backend exposes technique summaries, not the examples/levels required
  // by this lesson screen. Keep authored lesson content bundled with the app.
  const { getTechniqueById } = await import("@/lib/mock/techniques");
  return getTechniqueById(id) ?? null;
}

export async function getTechniquesBySubject(subjectId: string): Promise<Technique[]> {
  const { getTechniquesBySubject } = await import("@/lib/mock/techniques");
  return getTechniquesBySubject(subjectId);
}

export async function getAllTechniques(): Promise<Technique[]> {
  const { getAllTechniques } = await import("@/lib/mock/techniques");
  return getAllTechniques();
}
