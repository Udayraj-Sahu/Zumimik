"use client";
import { PageContainer } from "@/components/ui/page-container";
import { BG, CTA_35, CYAN, CYAN_14, CYAN_18, CYAN_85, GLASS_02, GLASS_03, GLASS_07, GLASS_50, GLASS_55, GLASS_BG, GLASS_BORDER, VIOLET_DEEP, VIOLET_DEEP_14, VIOLET_DEEP_18, VIOLET_TEXT } from "@/lib/theme";

import { useState, useMemo, useEffect, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubjectTree, useExplorerMastery } from "@/hooks/queries/use-explorer";
import { useSprintTopics } from "@/hooks/queries/use-sprint";
import { MasteryPanel } from "@/components/explorer/mastery-panel";
import { IS_MOCK } from "@/lib/platform";
import { useAllTechniques } from "@/hooks/queries/use-technique";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { MindMap } from "@/components/explorer/mind-map";
import { Compass, GraduationCap, Lock, Plus, ArrowRight, Layers, ClipboardList, AlertTriangle } from "lucide-react";
import { DOMAIN_LABELS } from "@/lib/types/template";
import type { TopicNode } from "@/lib/types/technique";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { globalTopicsNotice, resolveExplorerScope } from "@/lib/exam-scope";
import { AddPrepModal } from "@/components/learn/add-prep-modal";
import { PaywallModal } from "@/components/paywall/paywall-modal";

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** The real id of the first node matching an id, slug or title (case/punctuation-insensitive), else null. */
function findNodeId(node: TopicNode, key: string): string | null {
  const k = norm(key);
  if (node.id === key || node.slug === k || norm(node.id) === k || norm(node.title) === k) return node.id;
  for (const child of node.children ?? []) {
    const hit = findNodeId(child, key);
    if (hit) return hit;
  }
  return null;
}

function nodeInTree(node: TopicNode, id: string): boolean {
  return findNodeId(node, id) !== null;
}

function findNodeInTrees(trees: TopicNode[], topic: string): { subjectIndex: number; nodeId: string | null } {
  for (let i = 0; i < trees.length; i++) {
    const hit = findNodeId(trees[i], topic);
    if (hit) return { subjectIndex: i, nodeId: hit };
  }
  return { subjectIndex: -1, nodeId: null };
}

/** Mock mode only: the bundled topic -> technique fixture map. It is never loaded in real mode. */
async function findNodeViaFixtureMap(trees: TopicNode[], domain: string, topic: string): Promise<number> {
  const { getTechniqueIdsForTopic } = await import("@/lib/mock/topic-node-map");
  const techs = getTechniqueIdsForTopic(domain, topic);
  return trees.findIndex((tree) => techs.some((id) => nodeInTree(tree, id)));
}

function countConquestStats(subject: TopicNode): { topics: number; practiceSets: number } {
  let topics = 0;
  let practiceSets = 0;
  function walk(node: TopicNode) {
    if (node.type === "technique") {
      practiceSets += 1;
    } else if (node.type === "topic" || node.type === "subtopic") {
      topics += 1;
    }
    (node.children ?? []).forEach(walk);
  }
  walk(subject);
  return { topics, practiceSets };
}

function ExplorerContent() {
  usePageMeta("Topic Explorer — Zuzumik");
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const activePreps = useOnboardingStore((s) => s.activePreps);

  const prepExams = useMemo(() => {
    const others = activePreps.filter((id) => id !== targetExam && id in DOMAIN_LABELS);
    const list = [...others];
    if (targetExam && targetExam in DOMAIN_LABELS) list.unshift(targetExam);
    return list;
  }, [activePreps, targetExam]);

  const urlDomain = searchParams.get("domain");
  const urlTopic = searchParams.get("topic");
  const initialDomain = urlDomain && prepExams.includes(urlDomain) ? urlDomain : null;

  const [activeDomain, setActiveDomain] = useState(() => initialDomain || prepExams[0] || "");
  const [activeSubject, setActiveSubject] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [paramsProcessed, setParamsProcessed] = useState(false);
  const [showAddPrep, setShowAddPrep] = useState(false);

  const activePath = useOnboardingStore((s) => s.activePath);
  // Exam and learning path are separate inputs; neither one changes which topics the backend returns.
  const scope = resolveExplorerScope(activeDomain, activePath);

  const { data: trees, isLoading, isError: treesError, refetch: refetchTrees } = useSubjectTree(activeDomain);
  const subjects = useMemo(() => trees ?? [], [trees]);

  // Mock mode: bundled lessons decide which technique nodes open. Real mode: a node opens Practice only when the
  // practice catalog actually serves that skill (technique names are :Skill names, the catalog's vocabulary).
  const { data: allTechniques, isError: techniquesError } = useAllTechniques(IS_MOCK);
  const {
    data: catalogData,
    isError: catalogError,
    refetch: refetchCatalog,
  } = useSprintTopics(activeDomain, !IS_MOCK);
  const availableTechniqueIds = useMemo(
    () =>
      IS_MOCK
        ? new Set((allTechniques ?? []).map((t) => t.id))
        : new Set((catalogData?.topics ?? []).map((t) => t.id)),
    [allTechniques, catalogData],
  );
  const { data: mastery, isLoading: masteryLoading, isError: masteryError, refetch: refetchMastery } = useExplorerMastery();
  const loadFailed = treesError || (IS_MOCK ? techniquesError : catalogError);

  useEffect(() => {
    if (paramsProcessed) return;
    if (!urlTopic) {
      setParamsProcessed(true);
      return;
    }
    if (!trees || trees.length === 0) return;
    const { subjectIndex, nodeId } = findNodeInTrees(trees, urlTopic);
    if (nodeId) {
      setFocusNodeId(nodeId);
      if (subjectIndex >= 0) setActiveSubject(subjectIndex);
    } else if (IS_MOCK) {
      void findNodeViaFixtureMap(trees, activeDomain, urlTopic).then((index) => {
        if (index >= 0) setActiveSubject(index);
      });
    }
    setParamsProcessed(true);
    router.replace("/learn/explorer", { scroll: false });
  }, [trees, activeDomain, urlTopic, paramsProcessed, router]);

  const handleExamSwitch = (id: string) => {
    if (id !== activeDomain) {
      setSlideDir(prepExams.indexOf(id) > prepExams.indexOf(activeDomain) ? 1 : -1);
      setActiveDomain(id);
      setActiveSubject(0);
    }
  };

  const handleSubjectSwitch = (idx: number) => {
    if (idx !== activeSubject) {
      setSlideDir(idx > activeSubject ? 1 : -1);
      setActiveSubject(idx);
    }
  };

  const { headerRef, animateSection } = useEntranceAnimations();

  const label = DOMAIN_LABELS[activeDomain] ?? activeDomain;

  const conquest = useMemo(
    () => (subjects[activeSubject] ? countConquestStats(subjects[activeSubject]) : { topics: 0, practiceSets: 0 }),
    [subjects, activeSubject],
  );

  if (prepExams.length === 0) {
    return (
      <PageContainer>
        {/* Branded header at top */}
        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-1.5 max-[359px]:px-3">
            <Compass size={12} className="text-primary" />
            <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">EXPLORER</span>
          </div>
        </div>

        <div className="flex items-center justify-center pt-14 pb-10">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] backdrop-blur-xl px-6 py-8 max-[359px]:p-4" style={{ background: GLASS_BG }}>
            <div className="absolute -top-12 -right-12 size-40 rounded-full opacity-[0.07] pointer-events-none" style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }} />
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="relative grid size-14 place-items-center rounded-2xl bg-white/[0.05] border border-white/[0.06]">
                <Lock size={20} className="text-muted-foreground/45" />
              </span>
              <div>
                <h1 className="text-[18px] font-bold tracking-[-0.02em] text-foreground">No exam selected</h1>
                <p className="mt-1.5 text-[12px] text-muted-foreground/45 font-normal leading-relaxed max-w-[240px] mx-auto">
                  Add a prep to explore topics and techniques in your study map.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPrep(true)}
                className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 max-[359px]:px-4 whitespace-nowrap text-[12px] font-bold text-[var(--bg)] transition-all hover:opacity-90 active:scale-[0.97] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus size={13} strokeWidth={3} /> ADD PREP
                <ArrowRight size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {showAddPrep && <AddPrepModal gated={false} onClose={() => setShowAddPrep(false)} />}
        <PaywallModal />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="overflow-x-clip">
      <div className="mx-auto w-full md:max-w-3xl">
      {loadFailed && (
        <div
          role="alert"
          data-testid="explorer-error"
          className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-[12px] font-medium text-destructive"
        >
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">Couldn&apos;t load the study map. Please try again.</span>
          <button
            type="button"
            onClick={() => {
              if (treesError) void refetchTrees();
              if (!IS_MOCK && catalogError) void refetchCatalog();
            }}
            className="rounded-full border border-destructive/40 px-3 py-1 text-micro font-bold uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retry
          </button>
        </div>
      )}
      {/* Header */}
      <div ref={headerRef} className="relative text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-1.5 max-[359px]:px-3 mb-4">
          <Compass size={12} className="text-primary" />
          <span className="text-micro font-semibold tracking-[0.22em] text-primary/80">EXPLORER</span>
        </div>
        <h1 className="text-[24px] font-bold tracking-[-0.02em] text-foreground leading-tight">
          Explore <span className="text-primary">{IS_MOCK ? label : "Topics"}</span>
        </h1>
        <p className="mt-1.5 text-[12px] text-muted-foreground/45 font-normal">Tap nodes to branch out and explore your study map.</p>
        {!IS_MOCK && (
          <p data-testid="global-topics-notice" className="mt-1.5 text-[11px] text-muted-foreground/50">
            {scope.examCatalogUnavailable
              ? `The exam-specific catalog for ${label} is not configured. ${globalTopicsNotice(label)}`
              : globalTopicsNotice(null)}
          </p>
        )}
      </div>

      {/* Exam switcher — sliding segmented control */}
      {prepExams.length > 1 && (
        <div ref={animateSection} data-section-index={0} className="relative mt-7">
          <div
            className="relative flex gap-1 p-1 overflow-x-auto rounded-3xl border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ borderColor: GLASS_BORDER, background: GLASS_BG }}
          >
            {prepExams.map((id) => {
              const active = activeDomain === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleExamSwitch(id)}
                  className="relative flex-1 flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 max-[359px]:px-2 text-[11px] font-bold uppercase tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ color: active ? BG : GLASS_55 }}
                >
                  {active && (
                    <motion.div
                      layoutId="explorer-exam-slider"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: `linear-gradient(180deg, var(--cta-from), var(--cta-to))`, boxShadow: "0 6px 16px -4px var(--accent-40)" }}
                    />
                  )}
                  <span className="relative flex items-center gap-2 transition-colors duration-300" style={{ textShadow: active ? "0 1px 0 var(--glass-35)" : "none" }}>
                    <GraduationCap size={14} className="relative" />
                    <span className="relative">{DOMAIN_LABELS[id] ?? id}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject tabs */}
      {subjects.length > 1 && (
        <div ref={animateSection} data-section-index={1} className="relative mt-6 flex items-center gap-2.5 max-[359px]:gap-1.5 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {subjects.map((subject, idx) => {
            const active = activeSubject === idx;
            return (
              <motion.button
                key={subject.id}
                type="button"
                onClick={() => handleSubjectSwitch(idx)}
                initial={false}
                animate={{ y: active ? -2 : 0, scale: active ? 1.04 : 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="relative shrink-0"
              >
                <div
                  className="absolute inset-x-1.5 top-0 h-px rounded-full transition-opacity duration-500 ease-out pointer-events-none"
                  style={{
                    opacity: active ? 1 : 0,
                    background: "linear-gradient(90deg, transparent, var(--cta-80), transparent)",
                  }}
                />
                <div
                  className="relative flex items-center gap-1.5 rounded-full border px-4 py-2 max-[359px]:px-3 text-[11px] font-semibold tracking-wide whitespace-nowrap transition-all duration-500 ease-out focus-visible:ring-2 focus-visible:ring-ring"
                  style={
                    active
                      ? {
                          borderColor: CTA_35,
                          background: "linear-gradient(180deg, var(--accent-20), var(--accent-04))",
                          color: "var(--primary)",
                          boxShadow:
                            "0 8px 18px var(--black-35), inset 0 1px 0 var(--glass-30), inset 0 -2px 6px var(--black-35)",
                        }
                      : {
                          borderColor: GLASS_07,
                          background: GLASS_02,
                          color: GLASS_50,
                          boxShadow: "inset 0 2px 4px var(--black-40)",
                        }
                  }
                >
                  <GraduationCap size={12} className={active ? "text-primary" : "text-muted-foreground"} />
                  <span
                    style={
                      active
                        ? { textShadow: "0 1px 1px var(--black-60)" }
                        : { textShadow: "0 1px 2px var(--black-70)" }
                    }
                  >
                    {subject.title}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Conquest stats */}
      {subjects.length > 0 && (
        <div ref={animateSection} data-section-index={2} className="mt-6 grid grid-cols-2 gap-3 max-[359px]:gap-2">
          <div
            className="relative overflow-hidden rounded-2xl border backdrop-blur-xl px-4 py-4 max-[359px]:p-3"
            style={{ borderColor: CYAN_18, background: GLASS_03 }}
          >
            <div className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-[0.12]" style={{ background: `radial-gradient(circle, ${CYAN}, transparent 70%)` }} />
            <div className="relative flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl" style={{ background: CYAN_14 }}>
                <Layers size={15} className="text-[var(--cyan)]" />
              </span>
              <span className="text-[26px] font-black leading-none tracking-[-0.02em] text-[var(--cyan)]">
                {conquest.topics}
              </span>
            </div>
            <p className="relative mt-3 text-micro font-semibold tracking-[0.14em] uppercase" style={{ color: CYAN_85 }}>
              Topics to conquer
            </p>
          </div>
          <div
            className="relative overflow-hidden rounded-2xl border backdrop-blur-xl px-4 py-4 max-[359px]:p-3"
            style={{ borderColor: VIOLET_DEEP_18, background: GLASS_03 }}
          >
            <div className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full opacity-[0.12]" style={{ background: `radial-gradient(circle, ${VIOLET_DEEP}, transparent 70%)` }} />
            <div className="relative flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl" style={{ background: VIOLET_DEEP_14 }}>
                <ClipboardList size={15} className="text-[var(--violet-deep)]" />
              </span>
              <span className="text-[26px] font-black leading-none tracking-[-0.02em] text-[var(--violet-deep)]">
                {conquest.practiceSets}
              </span>
            </div>
            <p className="relative mt-3 text-micro font-semibold tracking-[0.14em] uppercase" style={{ color: VIOLET_TEXT }}>
              Practice sets to conquer
            </p>
          </div>
        </div>
      )}

      {!IS_MOCK && !isLoading && !loadFailed && subjects.length === 0 && (
        <p role="status" data-testid="explorer-empty" className="mt-6 rounded-2xl p-5 text-center text-[13px] text-muted-foreground/60" style={{ background: GLASS_03 }}>
          No topics are available yet.
        </p>
      )}

      {/* Mind map */}
      <div ref={animateSection} data-section-index={3} className="relative mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeDomain}-${activeSubject}`}
            initial={{ opacity: 0, x: slideDir * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDir * -24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <MindMap
              tree={(activeSubject < subjects.length ? subjects[activeSubject] : subjects[0]) ?? null}
              isLoading={isLoading}
              focusNodeId={focusNodeId ?? undefined}
              availableTechniqueIds={availableTechniqueIds}
              techniqueHref={IS_MOCK ? undefined : (id) => `/learn/practice?skill=${encodeURIComponent(id)}`}
              bankTopicHref={IS_MOCK ? undefined : (topic) => `/learn/practice?bankTopic=${encodeURIComponent(topic)}`}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <MasteryPanel
        mastery={mastery}
        isLoading={masteryLoading}
        isError={masteryError}
        onRetry={() => void refetchMastery()}
        practicable={availableTechniqueIds}
        examLabel={label}
      />
      </div>
    </PageContainer>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense fallback={null}>
      <ExplorerContent />
    </Suspense>
  );
}
