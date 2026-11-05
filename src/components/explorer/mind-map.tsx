"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AMBER, AMBER_14, CTA_14, CTA_LIME, CYAN, CYAN_14, GLASS_025, GLASS_14, GLASS_BORDER, VIOLET_DEEP, VIOLET_DEEP_14 } from "@/lib/theme";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronDown, Layers, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopicNode } from "@/lib/types/technique";
import type { TechniqueStateName } from "@vmsg/shared-types";
import { MasteryStateChip } from "./mastery-state-chip";

const TYPE_META: Record<
  string,
  { color: string; softBg: string; label: string }
> = {
  subject: { color: CTA_LIME, softBg: CTA_14, label: "Subject" },
  topic: { color: CYAN, softBg: CYAN_14, label: "Topic" },
  subtopic: { color: VIOLET_DEEP, softBg: VIOLET_DEEP_14, label: "Subtopic" },
  technique: { color: AMBER, softBg: AMBER_14, label: "Technique" },
};

const MasteryStatesContext = createContext<((techniqueId: string) => TechniqueStateName | undefined) | undefined>(undefined);

type MindMapProps = {
  tree: TopicNode | null;
  isLoading: boolean;
  focusNodeId?: string;
  availableTechniqueIds?: Set<string>;
  techniqueHref?: (techniqueId: string) => string;
  bankTopicHref?: (bankTopic: string) => string;
  referenceHref?: (referenceId: string) => string;
  /** The learner's mastery label for a technique (Fractured / Fragile / Fluid); undefined when they have no history with it. */
  masteryStateOf?: (techniqueId: string) => TechniqueStateName | undefined;
};

export function MindMap({ masteryStateOf, ...props }: MindMapProps) {
  return (
    <MasteryStatesContext.Provider value={masteryStateOf}>
      <MindMapInner {...props} />
    </MasteryStatesContext.Provider>
  );
}

function MindMapInner({
  tree,
  isLoading,
  focusNodeId,
  availableTechniqueIds,
  techniqueHref,
  bankTopicHref,
  referenceHref,
}: {
  tree: TopicNode | null;
  isLoading: boolean;
  focusNodeId?: string;
  availableTechniqueIds?: Set<string>;
  /** Where a technique node leads. Defaults to the bundled lesson page; real mode points it at Practice. */
  techniqueHref?: (techniqueId: string) => string;
  /** Where a problem-bank topic leaf leads. Omitted: those nodes stay display-only. */
  bankTopicHref?: (bankTopic: string) => string;
  /** Where a sub-topic covered by a finished reference page leads (the technique page). Omitted: those nodes stay display-only. */
  referenceHref?: (referenceId: string) => string;
}) {
  const router = useRouter();
  const [path, setPath] = useState<TopicNode[]>([]);
  const focus = path[path.length - 1];
  const root = tree ?? null;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const centerNode: TopicNode | null = focus ?? root;

  useEffect(() => {
    setPath([]);
    setExpanded(new Set());
    if (!tree || !focusNodeId) return;
    const ancestors = collectAncestors(tree, focusNodeId);
    if (ancestors && ancestors.length > 1) {
      const parents = ancestors.slice(0, -1);
      setPath(parents);
      setExpanded(new Set(parents.map((n) => n.id)));
    }
  }, [tree, focusNodeId]);

  const isTechniqueAvailable = (node: TopicNode): boolean => {
    if (node.type !== "technique" || !node.techniqueId) return true;
    if (!availableTechniqueIds) return true;
    return availableTechniqueIds.has(node.techniqueId);
  };

  const handleNodeClick = (node: TopicNode) => {
    if (node.type === "technique" && !isTechniqueAvailable(node)) return;
    if (node.children && node.children.length > 0) {
      toggleExpanded(node.id);
    } else if (node.type === "technique" && node.techniqueId) {
      router.push(techniqueHref ? techniqueHref(node.techniqueId) : `/learn/technique/${node.techniqueId}`);
    } else if (node.bankTopic && bankTopicHref) {
      router.push(bankTopicHref(node.bankTopic));
    } else if (node.referenceId && referenceHref) {
      router.push(referenceHref(node.referenceId));
    }
  };

  return (
    <div className="relative w-full select-none">
      <div className="mb-3 flex items-center justify-center gap-2">
        <p className="text-micro font-medium text-muted-foreground/35">
          Tap a branch to expand or collapse its topics
        </p>
      </div>

      <div
        className="relative w-full overflow-x-auto rounded-[28px] border"
        style={{
          borderColor: GLASS_BORDER,
          background: GLASS_025,
        }}
      >
        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !centerNode ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center">
            <Layers size={30} className="text-muted-foreground/30" />
            <p className="text-[13px] font-semibold text-muted-foreground">No branches available yet</p>
          </div>
        ) : (
          <div className="relative px-4 pb-6">
            <div className="flex w-full flex-col pt-6">
              {path.length === 0 && root && root.children && root.children.length > 0 ? (
                <div className="flex flex-col">
                  <div className="relative ml-3">
                    <span className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.08]" />
                    {root.children.map((c) => (
                      <TreeChild key={c.id}>
                        {nodes(c, expanded, handleNodeClick, 1, focusNodeId, availableTechniqueIds)}
                      </TreeChild>
                    ))}
                  </div>
                </div>
              ) : (
                nodes(centerNode, expanded, handleNodeClick, 0, focusNodeId, availableTechniqueIds)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function collectAncestors(node: TopicNode, targetId: string, trail: TopicNode[] = []): TopicNode[] | null {
  if (node.id === targetId || node.slug === targetId) return [...trail, node];
  for (const c of node.children ?? []) {
    const found = collectAncestors(c, targetId, [...trail, node]);
    if (found) return found;
  }
  return null;
}

function nodes(
  root: TopicNode,
  expanded: Set<string>,
  onSelect: (node: TopicNode) => void,
  depth: number,
  focusNodeId?: string,
  availableTechniqueIds?: Set<string>,
): React.ReactNode {
  const meta = TYPE_META[root.type] ?? TYPE_META.topic;
  const isOpen = expanded.has(root.id);
  const hasChildren = !!root.children && root.children.length > 0;
  const unavailable =
    root.type === "technique" && !!root.techniqueId && availableTechniqueIds
      ? !availableTechniqueIds.has(root.techniqueId)
      : false;

  const row = (
    <div key={`row-${root.id}`} className={cn("flex", depth === 0 && "justify-center")}>
      <BranchNode
        node={root}
        meta={meta}
        depth={depth}
        isOpen={isOpen}
        hasChildren={hasChildren}
        isFocus={root.id === focusNodeId}
        unavailable={unavailable}
        onSelect={() => onSelect(root)}
      />
    </div>
  );

  const childrenContent =
    hasChildren && isOpen ? (
      <AnimatePresence initial={false}>
        <motion.div
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative ml-3">
            <span className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.08]" />
            {root.children!.map((c) => (
              <TreeChild key={c.id}>{nodes(c, expanded, onSelect, depth + 1, focusNodeId, availableTechniqueIds)}</TreeChild>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    ) : null;

  return (
    <div key={root.id} className="relative flex flex-col">
      {row}
      {childrenContent}
    </div>
  );
}

function TreeChild({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pl-4">
      <span
        className="absolute left-0 top-0 h-[30px] w-4 border-b-2 rounded-bl-xl"
        style={{ borderColor: GLASS_14 }}
      />
      {children}
    </div>
  );
}

function BranchNode({
  node,
  meta,
  depth,
  isOpen,
  hasChildren,
  isFocus,
  unavailable,
  onSelect,
}: {
  node: TopicNode;
  meta: { color: string; softBg: string; label: string };
  depth: number;
  isOpen: boolean;
  hasChildren: boolean;
  isFocus: boolean;
  unavailable: boolean;
  onSelect: () => void;
}) {
  const masteryStateOf = useContext(MasteryStatesContext);
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onSelect}
        tabIndex={unavailable ? -1 : 0}
        aria-disabled={unavailable}
        className={cn(
          "relative z-10 my-1.5 flex items-center gap-2.5 rounded-2xl border px-4 py-3 transition-all duration-200",
          !unavailable && "hover:scale-[1.02] active:scale-95",
          unavailable && "opacity-45 cursor-not-allowed",
          depth === 0
            ? "border-transparent bg-cta text-[var(--on-accent)] shadow-[0_12px_40px_-14px_var(--primary)]"
            : "bg-white/[0.05]",
          isFocus ? "ring-2 ring-primary ring-offset-1 ring-offset-transparent" : "",
        )}
        style={
          depth === 0
            ? undefined
            : { borderColor: `${meta.color}33`, boxShadow: `0 8px 28px -16px ${meta.color}66` }
        }
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl",
            depth === 0 ? "bg-[var(--bg-10)]" : "",
          )}
          style={depth === 0 ? undefined : { background: meta.softBg, color: meta.color }}
          aria-hidden
        >
          {unavailable ? (
            <Lock size={15} />
          ) : node.type === "technique" || node.referenceId ? (
            <BookOpen size={15} />
          ) : (
            <Layers size={15} />
          )}
        </span>
        <span className="min-w-0 text-left">
          <span
            className={cn(
              "block max-w-[200px] text-[13px] font-semibold leading-snug",
              depth === 0 ? "text-[var(--on-accent)]" : "text-foreground",
            )}
          >
            {node.title}
          </span>
          <span
            className={cn(
              "block text-[9px] font-medium uppercase tracking-wider",
              depth === 0 ? "text-[var(--bg-60)]" : "",
            )}
            style={depth === 0 ? undefined : { color: meta.color }}
          >
            {meta.label}
            {hasChildren ? ` · ${node.children!.length}` : ""}
          </span>
          {node.type === "technique" && node.techniqueId && masteryStateOf ? (
            <MasteryStateChip state={masteryStateOf(node.techniqueId)} className="mt-1" />
          ) : null}
        </span>
        {!unavailable && hasChildren && (
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full transition-transform duration-200",
              isOpen ? "rotate-180" : "",
              depth === 0 ? "bg-[var(--bg-10)] text-[var(--on-accent)]" : "bg-white/[0.06] text-muted-foreground",
            )}
          >
            <ChevronDown size={12} />
          </span>
        )}
      </button>
    </div>
  );
}
