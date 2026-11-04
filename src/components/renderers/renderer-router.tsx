"use client";

import { useMemo } from "react";
import type { RendererProps } from "@/lib/types/template";
import { resolveRenderer } from "@/components/renderers/utils/renderer-registry";

export default function RendererRouter({
  template,
  visibleSteps,
  mode,
  onStepReveal,
  showAnswerInput,
  showVisualScaffold,
}: RendererProps) {
  const scaffoldType = useMemo(
    () => template.visual_scaffold?.type?.toLowerCase() ?? "",
    [template.visual_scaffold?.type],
  );

  const Renderer = useMemo(
    () => resolveRenderer(scaffoldType),
    [scaffoldType],
  );

  return (
    <Renderer template={template} visibleSteps={visibleSteps} mode={mode} onStepReveal={onStepReveal} showAnswerInput={showAnswerInput} showVisualScaffold={showVisualScaffold} />
  );
}
