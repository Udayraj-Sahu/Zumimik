import type { TopicNode, TopicEdge } from "@/lib/types/technique";
import { apiGet } from "./api";
import { buildGlobalExplorerTree } from "./explorer-tree";
import { isExamScopedDomain } from "@/lib/exam-scope";
import {
  mapBackendPracticeEdges,
  mapBackendTechniqueSummaries,
  type BackendPracticeCatalogResponse,
  type BackendTechniqueSummaryResponse,
  type BackendTopicCatalogResponse,
} from "./backend-adapters";
export async function getSubjectTree(domain: string): Promise<TopicNode[]> {
  // Both endpoints take the exam as `domain` (cat, gmat, gre, banking, vedic-math); an unknown domain gets the global catalog.
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  const [topics, techniques] = await Promise.all([
    apiGet<BackendTopicCatalogResponse>(`/api/topics${query}`),
    apiGet<BackendTechniqueSummaryResponse>(explorerTechniquesPath(domain)),
  ]);
  // An exam's topic names are the backend's display labels, not problem-corpus labels, so they cannot start a topic practice session.
  return buildGlobalExplorerTree(topics, techniques, {
    linkBankTopics: !isExamScopedDomain(domain),
  });
}
/** /api/practice/techniques defaults to limit=100 (max 500) and the graph holds more skills than that. */
export const EXPLORER_TECHNIQUES_PATH = "/api/practice/techniques?limit=500";
export function explorerTechniquesPath(domain?: string | null): string {
  return domain
    ? `/api/practice/techniques?domain=${encodeURIComponent(domain)}&limit=500`
    : EXPLORER_TECHNIQUES_PATH;
}
export async function findNodeInTree(domain: string, nodeId: string): Promise<TopicNode | null> {
  const nodes = await getSubjectTree(domain);
  return nodes.find((node) => node.id === nodeId) ?? null;
}
export async function getLeafTechniques(domain: string): Promise<TopicNode[]> {
  const response = await apiGet<BackendTechniqueSummaryResponse>(explorerTechniquesPath(domain));
  return mapBackendTechniqueSummaries(response);
}
export async function getSubjectEdges(): Promise<TopicEdge[]> {
  const response = await apiGet<BackendPracticeCatalogResponse>("/practice/catalog");
  return mapBackendPracticeEdges(response);
}
export async function getPrerequisitesForTechnique(techniqueId: string): Promise<TopicEdge[]> {
  const response = await apiGet<BackendPracticeCatalogResponse>("/practice/catalog");
  return mapBackendPracticeEdges(response).filter((edge) => edge.sourceId === techniqueId);
}
export async function checkTechniqueUnlocked(
  techniqueId: string,
  masteredTechniqueIds: string[],
): Promise<boolean> {
  return masteredTechniqueIds.includes(techniqueId);
}
