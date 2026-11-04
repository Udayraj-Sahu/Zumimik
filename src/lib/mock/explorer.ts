import type { TopicNode, TopicEdge } from "@/lib/types/technique";

const SUBJECT_TREES: Record<string, TopicNode[]> = {
  "fundamental-math": [
    {
      id: "fundamental-math",
      type: "subject",
      title: "Fundamental Math",
      slug: "fundamental-math",
      description: "Core mathematics concepts for competitive exams",
      children: [
        {
          id: "number-system",
          type: "topic",
          title: "Number System",
          slug: "number-system",
          children: [
            {
              id: "factors",
              type: "subtopic",
              title: "Factors & Multiples",
              slug: "factors",
              children: [
                { id: "number-system-factors", type: "technique", title: "Factor Counting & Sum", slug: "number-system-factors", techniqueId: "number-system-factors" },
                { id: "prime-factorization", type: "technique", title: "Prime Factorization", slug: "prime-factorization", techniqueId: "prime-factorization" },
                { id: "lcm-gcd", type: "technique", title: "LCM & GCD", slug: "lcm-gcd", techniqueId: "lcm-gcd" },
              ],
            },
          ],
        },
      ],
    },
  ],
  cat: [
    {
      id: "cat",
      type: "subject",
      title: "CAT",
      slug: "cat",
      description: "Common Admission Test preparation for MBA entrance",
      children: [
        {
          id: "cat-quant",
          type: "topic",
          title: "Quantitative Aptitude",
          slug: "cat-quantitative",
          children: [
            {
              id: "arithmetic",
              type: "subtopic",
              title: "Arithmetic",
              slug: "cat-arithmetic",
              children: [
                { id: "cat-percentage", type: "technique", title: "Percentages & Profit", slug: "cat-percentage", techniqueId: "cat-percentage" },
                { id: "cat-ratio", type: "technique", title: "Ratio & Proportion", slug: "cat-ratio", techniqueId: "cat-ratio" },
              ],
            },
            {
              id: "algebra",
              type: "subtopic",
              title: "Algebra",
              slug: "cat-algebra",
              children: [
                { id: "cat-quadratic", type: "technique", title: "Quadratic Equations", slug: "cat-quadratic", techniqueId: "cat-quadratic" },
              ],
            },
            {
              id: "geometry",
              type: "subtopic",
              title: "Geometry",
              slug: "cat-geometry",
              children: [
                { id: "cat-triangles", type: "technique", title: "Triangles & Circles", slug: "cat-triangles", techniqueId: "cat-triangles" },
              ],
            },
          ],
        },
        {
          id: "cat-verbal",
          type: "topic",
          title: "Verbal Ability",
          slug: "cat-verbal",
          children: [
            {
              id: "reading-comp",
              type: "subtopic",
              title: "Reading Comprehension",
              slug: "cat-reading-comprehension",
              children: [
                { id: "cat-rc", type: "technique", title: "RC Strategy", slug: "cat-rc", techniqueId: "cat-rc" },
              ],
            },
            {
              id: "sentence-correction-cat",
              type: "subtopic",
              title: "Sentence Correction",
              slug: "cat-sentence-correction",
              children: [
                { id: "cat-sc", type: "technique", title: "Error Spotting", slug: "cat-sc", techniqueId: "cat-sc" },
              ],
            },
          ],
        },
        {
          id: "cat-logical",
          type: "topic",
          title: "Logical Reasoning",
          slug: "cat-logical",
          children: [
            {
              id: "arrangements",
              type: "subtopic",
              title: "Arrangements & Puzzles",
              slug: "cat-arrangements",
              children: [
                { id: "cat-seating", type: "technique", title: "Seating Arrangements", slug: "cat-seating", techniqueId: "cat-seating" },
              ],
            },
          ],
        },
        {
          id: "cat-di",
          type: "topic",
          title: "Data Interpretation",
          slug: "cat-data-interpretation",
          children: [
            {
              id: "tables-charts",
              type: "subtopic",
              title: "Tables & Charts",
              slug: "cat-tables-charts",
              children: [
                { id: "cat-tables", type: "technique", title: "Data Tables", slug: "cat-tables", techniqueId: "cat-tables" },
              ],
            },
          ],
        },
      ],
    },
  ],
  gmat: [
    {
      id: "gmat",
      type: "subject",
      title: "GMAT",
      slug: "gmat",
      description: "Graduate Management Admission Test preparation",
      children: [
        {
          id: "quantitative",
          type: "topic",
          title: "Quantitative",
          slug: "quantitative",
          children: [
            {
              id: "work-rate",
              type: "subtopic",
              title: "Work Rate",
              slug: "work-rate",
              children: [
                { id: "work-rate-tech", type: "technique", title: "Work Rate Problems", slug: "work-rate-tech", techniqueId: "work-rate" },
              ],
            },
            {
              id: "speed-distance",
              type: "subtopic",
              title: "Speed & Distance",
              slug: "speed-distance",
              children: [
                { id: "speed-distance-tech", type: "technique", title: "Speed & Distance", slug: "speed-distance-tech", techniqueId: "speed-distance" },
              ],
            },
          ],
        },
        {
          id: "ds",
          type: "topic",
          title: "Data Sufficiency",
          slug: "data-sufficiency",
          children: [
            {
              id: "ds-strategy",
              type: "subtopic",
              title: "Strategy & Grid Method",
              slug: "ds-strategy",
              children: [
                { id: "ds-strategy-tech", type: "technique", title: "DS Strategy", slug: "ds-strategy-tech", techniqueId: "data-sufficiency" },
              ],
            },
          ],
        },
        {
          id: "sc",
          type: "topic",
          title: "Sentence Correction",
          slug: "sentence-correction",
          children: [
            {
              id: "parallelism",
              type: "subtopic",
              title: "Parallelism",
              slug: "parallelism",
              children: [
                { id: "sc-parallelism", type: "technique", title: "Parallel Structure", slug: "sc-parallelism", techniqueId: "sentence-correction-parallelism" },
              ],
            },
          ],
        },
      ],
    },
  ],
  gre: [
    {
      id: "gre",
      type: "subject",
      title: "GRE",
      slug: "gre",
      description: "Graduate Record Examination preparation",
      children: [
        {
          id: "quantitative",
          type: "topic",
          title: "Quantitative Reasoning",
          slug: "quantitative",
          children: [
            {
              id: "quant-comparison",
              type: "subtopic",
              title: "Quant Comparison",
              slug: "quant-comparison",
              children: [
                { id: "quant-comparison-tech", type: "technique", title: "QC Strategy", slug: "quant-comparison-tech", techniqueId: "quant-comparison" },
              ],
            },
          ],
        },
      ],
    },
  ],
  banking: [
    {
      id: "banking",
      type: "subject",
      title: "Banking Exams",
      slug: "banking",
      description: "Banking competitive exam preparation",
      children: [
        {
          id: "numerical",
          type: "topic",
          title: "Numerical Ability",
          slug: "numerical",
          children: [
            {
              id: "percentages",
              type: "subtopic",
              title: "Percentages",
              slug: "percentages",
              children: [
                { id: "percentage-tricks-tech", type: "technique", title: "Percentage Tricks", slug: "percentage-tricks-tech", techniqueId: "percentage-tricks" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const SUBJECT_EDGES: TopicEdge[] = [
  { sourceId: "prime-factorization", targetId: "number-system-factors", type: "REQUIRES", label: "Understand factors before prime factorization" },
  { sourceId: "lcm-gcd", targetId: "prime-factorization", type: "REQUIRES", label: "Prime factorization is needed for LCM/GCD" },
  { sourceId: "speed-distance", targetId: "work-rate", type: "FRONTIER_OF", label: "Work rate uses rate concepts from speed-distance" },
  { sourceId: "work-rate", targetId: "data-sufficiency", type: "FRONTIER_OF", label: "DS uses work rate problems" },
  { sourceId: "percentage-tricks", targetId: "number-system-factors", type: "REQUIRES", label: "Percentage tricks build on number system" },
];

export function getSubjectTree(domain: string): TopicNode[] {
  return SUBJECT_TREES[domain] ?? [];
}

export function findNodeById(tree: TopicNode[], id: string): TopicNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getSubjectEdges(): TopicEdge[] {
  return SUBJECT_EDGES;
}

export function getPrerequisitesForTechnique(techniqueId: string): TopicEdge[] {
  return SUBJECT_EDGES.filter(
    (e) => e.targetId === techniqueId && e.type === "REQUIRES",
  );
}

export function isTechniqueUnlocked(
  techniqueId: string,
  masteredTechniqueIds: string[],
): boolean {
  const prereqs = getPrerequisitesForTechnique(techniqueId);
  if (prereqs.length === 0) return true;
  return prereqs.every((p) => masteredTechniqueIds.includes(p.sourceId));
}

export function getAllLeafTechniques(tree: TopicNode[]): TopicNode[] {
  const leaves: TopicNode[] = [];
  function walk(nodes: TopicNode[]) {
    for (const node of nodes) {
      if (node.type === "technique" && node.techniqueId) {
        leaves.push(node);
      }
      if (node.children) walk(node.children);
    }
  }
  walk(tree);
  return leaves;
}

export function getAllTechniqueIds(): string[] {
  const ids = new Set<string>();
  for (const tree of Object.values(SUBJECT_TREES)) {
    for (const node of getAllLeafTechniques(tree)) {
      if (node.techniqueId) ids.add(node.techniqueId);
    }
  }
  return [...ids];
}
