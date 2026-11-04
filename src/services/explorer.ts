import type { TopicNode, TopicEdge } from "@/lib/types/technique";
import { apiGet } from "./api";
import { buildGlobalExplorerTree } from "./explorer-tree";
import {
  mapBackendPracticeEdges,
  mapBackendTechniqueSummaries,
  type BackendPracticeCatalogResponse,
  type BackendTechniqueSummaryResponse,
  type BackendTopicCatalogResponse,
} from "./backend-adapters";

import { IS_MOCK } from "@/lib/platform";

export async function getSubjectTree(domain: string): Promise<TopicNode[]> {
  if (IS_MOCK) {
    const { getSubjectTree: mockGetTree } = await import("@/lib/mock/explorer");
    const { delay } = await import("@/lib/mock/delay");
    await delay(250);
    return mockGetTree(domain);
  }
  // Both endpoints are global: neither accepts an exam, so `domain` is deliberately not sent.
  const [topics, techniques] = await Promise.all([
    apiGet<BackendTopicCatalogResponse>("/api/topics"),
    apiGet<BackendTechniqueSummaryResponse>(EXPLORER_TECHNIQUES_PATH),
  ]);
  return buildGlobalExplorerTree(topics, techniques);
}

/** /api/practice/techniques defaults to limit=100 (max 500) and the graph holds more skills than that. */
export const EXPLORER_TECHNIQUES_PATH = "/api/practice/techniques?limit=500";

export async function findNodeInTree(domain: string, nodeId: string): Promise<TopicNode | null> {
  if (IS_MOCK) {
    const { getSubjectTree: mockGetTree, findNodeById: mockFindNode } = await import("@/lib/mock/explorer");
    const { delay } = await import("@/lib/mock/delay");
    await delay(100);
    const tree = mockGetTree(domain);
    return mockFindNode(tree, nodeId);
  }
  const nodes = await getSubjectTree(domain);
  return nodes.find((node) => node.id === nodeId) ?? null;
}

export async function getLeafTechniques(domain: string): Promise<TopicNode[]> {
  if (IS_MOCK) {
    const { getSubjectTree: mockGetTree, getAllLeafTechniques: mockGetLeaves } = await import("@/lib/mock/explorer");
    const { delay } = await import("@/lib/mock/delay");
    await delay(200);
    const tree = mockGetTree(domain);
    return mockGetLeaves(tree);
  }
  const response = await apiGet<BackendTechniqueSummaryResponse>(EXPLORER_TECHNIQUES_PATH);
  return mapBackendTechniqueSummaries(response);
}

export async function getSubjectEdges(): Promise<TopicEdge[]> {
  if (IS_MOCK) {
    const { getSubjectEdges: mockGetEdges } = await import("@/lib/mock/explorer");
    const { delay } = await import("@/lib/mock/delay");
    await delay(100);
    return mockGetEdges();
  }
  const response = await apiGet<BackendPracticeCatalogResponse>("/practice/catalog");
  return mapBackendPracticeEdges(response);
}

export async function getPrerequisitesForTechnique(
  techniqueId: string,
): Promise<TopicEdge[]> {
  if (IS_MOCK) {
    const { getPrerequisitesForTechnique: mockGetPrereqs } = await import("@/lib/mock/explorer");
    const { delay } = await import("@/lib/mock/delay");
    await delay(50);
    return mockGetPrereqs(techniqueId);
  }
  const response = await apiGet<BackendPracticeCatalogResponse>("/practice/catalog");
  return mapBackendPracticeEdges(response).filter((edge) => edge.sourceId === techniqueId);
}

export async function checkTechniqueUnlocked(
  techniqueId: string,
  masteredTechniqueIds: string[],
): Promise<boolean> {
  if (IS_MOCK) {
    const { isTechniqueUnlocked: mockIsUnlocked } = await import("@/lib/mock/explorer");
    const { delay } = await import("@/lib/mock/delay");
    await delay(50);
    return mockIsUnlocked(techniqueId, masteredTechniqueIds);
  }
  return masteredTechniqueIds.includes(techniqueId);
}
