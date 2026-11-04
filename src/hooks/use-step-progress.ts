"use client";

import { useCallback } from "react";
import { useTemplateStore } from "@/stores/template-store";

export function useStepProgress() {
  const visibleSteps = useTemplateStore((s) => s.visibleSteps);
  const totalSteps = useTemplateStore((s) => s.totalSteps);
  const isCorrect = useTemplateStore((s) => s.isCorrect);
  const mode = useTemplateStore((s) => s.mode);
  const currentIndex = useTemplateStore((s) => s.currentIndex);
  const templates = useTemplateStore((s) => s.templates);
  const stepProgress = useTemplateStore((s) => s.stepProgress);

  const revealNext = useTemplateStore((s) => s.revealNextStep);
  const revealAll = useTemplateStore((s) => s.revealAllSteps);
  const reset = useTemplateStore((s) => s.resetSteps);
  const setCorrect = useTemplateStore((s) => s.setCorrect);
  const completeCurrent = useTemplateStore((s) => s.completeCurrent);
  const nextTemplate = useTemplateStore((s) => s.nextTemplate);
  const loadTemplate = useTemplateStore((s) => s.loadTemplate);

  const allRevealed = visibleSteps >= totalSteps;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex >= templates.length - 1;
  const currentProgress = templates[currentIndex]
    ? stepProgress[templates[currentIndex].id]
    : null;
  const isCompleted = currentProgress?.completed ?? false;

  const handleRevealNext = useCallback(() => {
    revealNext();
  }, [revealNext]);

  const handleCorrect = useCallback(() => {
    setCorrect(true);
    completeCurrent(true);
  }, [setCorrect, completeCurrent]);

  const handleWrong = useCallback(() => {
    setCorrect(false);
  }, [setCorrect]);

  const handleNextQuestion = useCallback(() => {
    if (!isLast) {
      nextTemplate();
    }
  }, [isLast, nextTemplate]);

  return {
    visibleSteps,
    totalSteps,
    isCorrect,
    mode,
    currentIndex,
    allRevealed,
    isFirst,
    isLast,
    isCompleted,
    currentProgress,
    handleRevealNext,
    handleCorrect,
    handleWrong,
    handleNextQuestion,
    revealAll,
    reset,
    loadTemplate,
  };
}
