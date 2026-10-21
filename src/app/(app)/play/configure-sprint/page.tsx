"use client";
import { PageContainer } from "@/components/ui/page-container";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntranceAnimations } from "@/hooks/use-entrance-animations";
import { useSprintTopics } from "@/hooks/queries/use-sprint";
import { useTemplatesByCategory } from "@/hooks/queries/use-templates";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useSprintStore } from "@/stores/sprint-store";
import { useResumeStore } from "@/stores/resume-store";
import { getTemplateCategoriesForTopic } from "@/lib/content";
import { GLASS_06, GLASS_BG, GLASS_BORDER } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export default function ConfigureSprintPage() {
  usePageMeta("Configure Sprint — Zuzumik");
  const router = useRouter();
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const { data, isLoading } = useSprintTopics(targetExam);
  const [topic, setTopic] = useState<string | null>(null);
  const [length, setLength] = useState(10);
  const [difficulty, setDifficulty] = useState("Beginner");
  const templateCats = useMemo(
    () => (topic ? getTemplateCategoriesForTopic(targetExam, topic) : []),
    [topic, targetExam],
  );
  const { data: templates = [], isLoading: loadingTemplates } = useTemplatesByCategory(
    templateCats[0] ?? null,
    targetExam,
  );

  const { headerRef, animateSection } = useEntranceAnimations();

  if (isLoading || !data) {
    return (
      <PageContainer className="flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </PageContainer>
    );
  }

  const { topics, config } = data;

  return (
      <PageContainer>
        <div className="mx-auto w-full md:max-w-2xl">
        <div ref={headerRef} className="text-center mb-6 max-[359px]:mb-4">
          <div className="inline-flex items-center gap-2 pill px-4 py-1.5 mb-3 max-[359px]:px-3">
            <BookOpen size={12} className="text-primary" />
            <h1 className="text-micro font-semibold tracking-[0.22em] text-primary/80">SPRINT</h1>
          </div>
          <p className="text-[12px] text-muted-foreground/45 font-normal mt-1">Choose your topic, duration, and difficulty level.</p>
        </div>

        <section
          ref={animateSection} data-section-index={0}
          aria-label="Choose your topic"
        >
          <div className="mb-4 flex items-center gap-2 max-[359px]:mb-3 max-[359px]:gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-micro font-bold uppercase tracking-wider text-primary max-[359px]:px-2.5 whitespace-nowrap">
              Step 1
            </span>
            <h2 className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
              Topic
            </h2>
          </div>
          <div
            role="radiogroup"
            aria-label="Choose your topic"
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 max-[359px]:gap-1.5"
          >
            {topics.map((t) => {
              const active = topic === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTopic(t.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-2 rounded-3xl border backdrop-blur-xl p-4 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] sm:gap-3 sm:p-6 max-[359px]:gap-1.5 max-[359px]:p-3",
                    active
                      ? "border-primary shadow-[0_0_0_1px_var(--primary),0_0_24px_-4px_var(--primary)]"
                      : "hover:border-white/[0.12] active:border-white/[0.12]",
                  )}
                  style={{
                    background: active ? GLASS_06 : GLASS_BG,
                    borderColor: active ? undefined : GLASS_BORDER,
                  }}
                >
                  <Icon
                    className={cn("size-6 sm:size-8", active ? "text-primary" : t.color)}
                    aria-hidden="true"
                  />
                  <span className="text-center text-micro font-bold uppercase tracking-wide sm:text-[12px]">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:gap-6 sm:mt-10 max-[359px]:mt-6 max-[359px]:gap-4">
          <section
            ref={animateSection} data-section-index={1}
            className="flex-1"
          >
            <div className="mb-4 flex items-center gap-2 max-[359px]:mb-3 max-[359px]:gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-micro font-bold uppercase tracking-wider text-primary max-[359px]:px-2.5 whitespace-nowrap">
                Step 2
              </span>
              <h2 className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
                Duration
              </h2>
            </div>
            <div
              role="radiogroup"
              aria-label="Session length"
              className="flex gap-2.5 sm:gap-3 max-[359px]:gap-1.5"
            >
              {config.lengths.map((m) => {
                const active = length === m;
                return (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLength(m)}
                    className={cn(
                      "relative flex flex-1 flex-col items-center gap-1 rounded-3xl border backdrop-blur-xl py-4 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring sm:py-5 max-[359px]:py-3.5",
                      active
                        ? "border-primary shadow-[0_0_0_1px_var(--primary),0_0_24px_-4px_var(--primary)]"
                        : "text-muted-foreground hover:border-white/[0.12]",
                    )}
                    style={{
                      background: active ? GLASS_06 : GLASS_BG,
                      borderColor: active ? undefined : GLASS_BORDER,
                    }}
                  >
                    <span className="text-[16px] font-black italic tracking-tight sm:text-[20px]">{m}</span>
                    <span className="text-micro font-bold uppercase tracking-widest">
                      min
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            ref={animateSection} data-section-index={2}
            className="flex-1"
          >
            <div className="mb-4 flex items-center gap-2 max-[359px]:mb-3 max-[359px]:gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1 text-micro font-bold uppercase tracking-wider text-primary max-[359px]:px-2.5 whitespace-nowrap">
                Step 3
              </span>
              <h2 className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
                Difficulty
              </h2>
            </div>
            <div
              role="radiogroup"
              aria-label="Difficulty"
              className="flex gap-2.5 sm:gap-3 max-[359px]:gap-1.5"
            >
              {config.difficulties.map((d) => {
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "relative flex flex-1 flex-col items-center gap-1 rounded-3xl border backdrop-blur-xl py-4 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] sm:py-5",
                      active
                        ? "border-primary shadow-[0_0_0_1px_var(--primary),0_0_24px_-4px_var(--primary)]"
                        : "text-muted-foreground hover:border-white/[0.12]",
                    )}
                    style={{
                      background: active ? GLASS_06 : GLASS_BG,
                      borderColor: active ? undefined : GLASS_BORDER,
                    }}
                  >
                    <span className="text-[12px] font-extrabold uppercase tracking-wider sm:text-[13px] whitespace-nowrap">
                      {d}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {(templates.length > 0 || loadingTemplates) && (
          <section
            ref={animateSection} data-section-index={3}
            className="mt-6 max-[359px]:mt-4"
          >
            <div className="mb-3 flex items-center gap-2 max-[359px]:mb-2.5 max-[359px]:gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-chart-3/10 px-3 py-1 text-micro font-bold uppercase tracking-wider text-chart-3">
                Learn
              </span>
              <h2 className="text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
                Learn the Technique
              </h2>
            </div>
            {loadingTemplates ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory max-[359px]:gap-2 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible md:pb-0 md:snap-none">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="min-w-[65vw] sm:min-w-[260px] md:min-w-0 snap-start rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 animate-pulse" style={{ background: GLASS_BG }}>
                    <div className="h-4 w-24 rounded-xl bg-white/[0.06] mb-3" />
                    <div className="h-3 w-32 rounded-xl bg-white/[0.06] mb-2" />
                    <div className="h-8 w-20 rounded-xl bg-white/[0.06] mt-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory max-[359px]:gap-2 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible md:pb-0 md:snap-none">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="min-w-[65vw] sm:min-w-[240px] md:min-w-0 snap-start shrink-0 rounded-3xl border border-white/[0.06] backdrop-blur-xl p-4 max-[359px]:p-3.5 flex flex-col"
                    style={{ background: GLASS_BG }}
                  >
                    <p className="text-micro font-bold uppercase tracking-wider text-chart-3 mb-1">
                      {tpl.concept.category}
                    </p>
                    <p className="text-[12px] font-bold text-foreground leading-snug">
                      {tpl.concept.technique_name}
                    </p>
                    <p className="text-micro text-muted-foreground/50 mt-1">
                      {tpl.examples.length} example{tpl.examples.length > 1 ? "s" : ""} &middot; ~{tpl.expected_time}s
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {[1, 2, 3, 4, 5].map((d) => (
                        <span
                          key={d}
                          className={cn(
                            "size-1.5 rounded-full",
                            d <= tpl.difficulty ? "bg-chart-3" : "bg-white/[0.06]",
                          )}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/learn/practice?templateId=${tpl.id}&returnTo=/play/configure-sprint&topic=${topic ?? ""}&difficulty=${difficulty.toLowerCase()}`)
                      }
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl py-3 text-micro font-bold uppercase tracking-wider text-chart-3 outline-none transition-colors hover:bg-chart-3/20 active:bg-chart-3/30 focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]"
                      style={{ background: GLASS_BG, border: `1px solid ${GLASS_BORDER}` }}
                    >
                      <BookOpen size={12} />
                      Learn
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div ref={animateSection} data-section-index={4} className="mt-6 sm:mt-8 max-[359px]:mt-5">
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              if (!topic) return;
              useSprintStore.getState().reset();
              useResumeStore.getState().clearSnapshot();
              router.push(`/play/sprint?topic=${topic}&length=${length}&difficulty=${difficulty.toLowerCase()}`);
            }}
            disabled={!topic}
            className={cn(
              "group relative overflow-hidden max-[359px]:py-3.5 hover:scale-[1.01] active:scale-[0.99] sm:text-[16px]",
              !topic && "disabled:opacity-40 hover:scale-100",
            )}
          >
            <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 transition-transform duration-500 group-hover:translate-y-0" />
            <span className="relative flex items-center gap-3">
              {topic ? "Start Sprint" : "Select a Topic"}
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Button>
        </div>
        </div>
      </PageContainer>
  );
}
