"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import type { RendererProps } from "@/lib/types/template";
import TextScaffold from "./text-scaffold";

export default function EquationChainRenderer(props: RendererProps) {
  const { template, visibleSteps, mode, onStepReveal, ...rest } = props;
  const steps = useMemo(
    () => template.examples?.[0]?.solution ?? [],
    [template.examples],
  );

  const [displayIndex, setDisplayIndex] = useState<number | null>(null);
  const dirRef = useRef<"forward" | "back">("forward");
  const activeRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const prevVisible = useRef(visibleSteps);

  const showIndex = useCallback((target: number, dir: "forward" | "back") => {
    if (busyRef.current) return;
    const current = activeRef.current;
    if (current === target) return;

    busyRef.current = true;
    dirRef.current = dir;
    const currentEl = current !== null ? cardRefs.current.get(current) : null;
    const leaveXPercent = dir === "forward" ? 100 : -100;

    const finish = () => {
      activeRef.current = target;
      setDisplayIndex(target);
      busyRef.current = false;
    };

    if (currentEl) {
      gsap.to(currentEl, {
        xPercent: leaveXPercent,
        x: 0,
        opacity: 0,
        duration: 0.32,
        ease: "power2.inOut",
        onComplete: finish,
      });
    } else {
      finish();
    }
  }, []);

  useEffect(() => {
    const prev = prevVisible.current;
    prevVisible.current = visibleSteps;
    if (visibleSteps <= prev) return;
    showIndex(visibleSteps - 1, "forward");
  }, [visibleSteps, showIndex]);

  useEffect(() => {
    if (displayIndex === null || displayIndex >= steps.length) return;
    const el = cardRefs.current.get(displayIndex);
    if (!el) return;
    const enterXPercent = dirRef.current === "forward" ? -100 : 100;
    gsap.fromTo(
      el,
      { xPercent: enterXPercent, x: 0, opacity: 0 },
      { xPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
    );
  }, [displayIndex, steps.length]);

  const allRevealed = visibleSteps >= steps.length;

  const handleStepBack = useCallback(() => {
    const current = activeRef.current;
    if (current === null || current <= 0) return;
    showIndex(current - 1, "back");
  }, [showIndex]);

  const handleStepForward = useCallback(() => {
    const current = activeRef.current;
    if (current === null || current >= steps.length - 1) return;
    showIndex(current + 1, "forward");
  }, [showIndex, steps.length]);

  const prevStepAvailable = displayIndex !== null && displayIndex > 0;
  const atFirstStep = displayIndex !== null && displayIndex === 0;
  const atLastStep =
    displayIndex !== null && displayIndex >= steps.length - 1;

  return (
    <TextScaffold
      template={template}
      visibleSteps={visibleSteps}
      mode={mode}
      onStepReveal={onStepReveal}
      showStepCards={false}
      onShowFirstStep={
        allRevealed || prevStepAvailable ? handleStepBack : undefined
      }
      backDisabled={allRevealed && atFirstStep}
      onShowNextStep={
        allRevealed && !atLastStep ? handleStepForward : undefined
      }
      nextDisabled={allRevealed && atLastStep}
      {...rest}
    >
      <div
        className="flex min-h-[80px] items-center justify-center"
        role="list"
        aria-label="Equation chain"
      >
        {steps.map((step, i) => {
          if (i !== displayIndex || i >= visibleSteps) return null;
          return (
            <div
              key={step.step_num}
              ref={(el) => {
                if (el) cardRefs.current.set(i, el);
                else cardRefs.current.delete(i);
              }}
              role="listitem"
              className="relative w-full max-w-[560px] px-2 py-2 text-center opacity-0"
            >
              <p className="text-micro font-bold uppercase tracking-[0.28em] text-primary">
                Step {step.step_num}
              </p>
              <div
                className="mx-auto mt-2 h-px w-16 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                aria-hidden="true"
              />
              <p className="mt-2.5 text-fluid-lg font-semibold leading-relaxed break-words text-balance text-foreground">
                {step.operation}
              </p>
            </div>
          );
        })}
      </div>
    </TextScaffold>
  );
}