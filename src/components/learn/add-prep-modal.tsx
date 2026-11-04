"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { X, GraduationCap, Calculator, BookOpen, Landmark, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useDashboardData } from "@/hooks/queries/use-dashboard";
import { usePlanStore } from "@/stores/plan-store";
import { usePaywallStore } from "@/stores/paywall-store";
import { Dialog } from "@/components/ui/dialog";

const EXAMS = [
  { id: "cat", label: "CAT", icon: GraduationCap },
  { id: "gmat", label: "GMAT", icon: Calculator },
  { id: "gre", label: "GRE", icon: BookOpen },
  { id: "banking", label: "Banking", icon: Landmark },
];

function getStatus(value: number): { label: string; color: string; bgClass: string } {
  if (value >= 80) return { label: "Strong", color: "text-primary", bgClass: "bg-primary/10" };
  if (value >= 50) return { label: "In Progress", color: "text-chart-3", bgClass: "bg-chart-3/10" };
  return { label: "Needs Work", color: "text-destructive", bgClass: "bg-destructive/10" };
}

type Props = { onClose: () => void; gated?: boolean };

export function AddPrepModal({ onClose, gated = true }: Props) {
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const addActivePrep = useOnboardingStore((s) => s.addActivePrep);
  const removeActivePrep = useOnboardingStore((s) => s.removeActivePrep);
  const activePreps = useOnboardingStore((s) => s.activePreps);
  const targetExam = useOnboardingStore((s) => s.targetExam);
  const canAddPrep = usePlanStore((s) => s.canAddPrep);
  const openPaywall = usePaywallStore((s) => s.openPaywall);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const { data } = useDashboardData(selectedExam ?? undefined);
  const topics = data?.topics ?? [];

  const orderedExams = [...EXAMS.filter((e) => e.id === targetExam), ...EXAMS.filter((e) => e.id !== targetExam)];

  useEffect(() => {
    if (overlayRef.current && dialogRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(dialogRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    }
  }, []);

  const handleClose = () => {
    if (overlayRef.current && dialogRef.current) {
      gsap.to(dialogRef.current, { opacity: 0, y: 16, duration: 0.15 });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.15, onComplete: onClose });
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedExam && !activePreps.includes(selectedExam)) {
      const alreadyActive = activePreps.includes(selectedExam);
      if (gated && !alreadyActive && !canAddPrep(activePreps.length + 1)) {
        openPaywall("prep");
        return;
      }
      addActivePrep(selectedExam);
    }
    handleClose();
  };

  return (
    <Dialog
      open
      onClose={handleClose}
      overlayRef={overlayRef}
      panelRef={dialogRef}
      ariaLabelledby="add-prep-title"
    >
      <div className="sticky top-0 bg-card/95 backdrop-blur-sm px-5 pt-5 pb-3 border-b border-border/40 flex items-center justify-between">
          <h2 id="add-prep-title" className="text-fluid-base font-bold text-foreground">
            {selectedExam ? "Topic Mastery" : "Add Prep"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {!selectedExam ? (
            <div className="flex flex-col gap-2.5">
              <p className="text-fluid-xs text-muted-foreground mb-1">
                Choose an exam or subject to see your progress
              </p>
              {orderedExams.map((exam) => {
                const Icon = exam.icon;
                const isOnboarding = exam.id === targetExam;
                const alreadyAdded = isOnboarding || activePreps.includes(exam.id);
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => {
                      if (alreadyAdded) {
                        if (isOnboarding) {
                          setSelectedExam(exam.id);
                        } else {
                          removeActivePrep(exam.id);
                        }
                      } else {
                        setSelectedExam(exam.id);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-4 outline-none transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring",
                      alreadyAdded
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 bg-background hover:border-border hover:bg-accent/40",
                    )}
                  >
                    <span className="grid size-10 place-items-center rounded-xl border border-border/40 bg-muted/50">
                      <Icon size={18} className="text-muted-foreground" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-fluid-sm font-bold text-foreground">
                        {exam.label}
                      </span>
                      {isOnboarding && (
                        <span className="text-micro font-medium text-primary">Your primary exam</span>
                      )}
                    </span>
                    {isOnboarding ? (
                      <span className="inline-flex items-center gap-1 text-micro font-bold text-primary tracking-wide">
                        <Check size={11} /> PRIMARY
                      </span>
                    ) : alreadyAdded ? (
                      <span className="inline-flex items-center gap-1 text-micro font-bold text-primary tracking-wide">
                        <X size={11} /> REMOVE
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {topics.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-fluid-sm text-muted-foreground">No topic data available yet.</p>
                  <p className="text-fluid-xs text-muted-foreground/70 mt-1">Complete a sprint to see mastery levels.</p>
                </div>
              ) : (
                <>
                  <p className="text-fluid-xs text-muted-foreground mb-1">
                    Here&apos;s where you stand:
                  </p>
                  {topics.map((topic) => {
                    const status = getStatus(topic.value);
                    return (
                      <div
                        key={topic.name}
                        className="rounded-xl border border-border/40 bg-background p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-fluid-sm font-bold text-foreground">
                            {topic.name}
                          </span>
                          <span className={cn("text-micro font-bold tracking-wide", status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${topic.value}%`,
                                backgroundColor: topic.value >= 80 ? "var(--primary)" : topic.value >= 50 ? "var(--chart-3)" : "var(--destructive)",
                              }}
                            />
                          </div>
                          <span className="text-fluid-xs font-mono text-muted-foreground w-8 text-right">
                            {topic.value}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm px-5 pb-5 pt-3 border-t border-border/40">
          {selectedExam ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="flex-1 rounded-2xl border border-border/60 bg-background py-3.5 text-fluid-sm font-bold text-foreground outline-none transition-all hover:bg-accent/40 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-2xl bg-cta py-3.5 text-fluid-sm font-bold text-[var(--on-accent)] outline-none transition-all hover:shadow-[0_0_18px_var(--accent-30)] hover:opacity-95 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
              >
                Confirm
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-2xl border border-border/60 bg-background py-3.5 text-fluid-sm font-bold text-foreground outline-none transition-all hover:bg-accent/40 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
          )}
        </div>
    </Dialog>
  );
}
