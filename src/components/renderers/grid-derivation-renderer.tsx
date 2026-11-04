"use client";

import { useMemo } from "react";
import type { RendererProps } from "@/lib/types/template";
import { parseSquareProblem } from "@/components/renderers/utils/parse-square";
import TextScaffold from "./text-scaffold";

export default function GridDerivationRenderer(props: RendererProps) {
  const { template, visibleSteps, mode, onStepReveal, ...rest } = props;
  const { number, base, deficiency } = useMemo(() => {
    const p = template.examples?.[0]?.problem_statement ?? "";
    const s = template.examples?.[0]?.solution ?? [];
    return parseSquareProblem(p, s);
  }, [template.examples]);

  const resultLeft = number + deficiency;
  const resultRight = Math.abs(deficiency * deficiency);
  const pad = base >= 1000 ? 3 : base >= 100 ? 2 : 1;
  const finalAnswer = `${resultLeft}${String(resultRight).padStart(pad, "0")}`;

  return (
    <TextScaffold
      template={template}
      visibleSteps={visibleSteps}
      mode={mode}
      onStepReveal={onStepReveal}
      {...rest}
    >
      <svg
        viewBox="0 0 420 280"
        className="w-full h-auto max-w-[450px]"
        role="img"
        aria-label={`Grid derivation for square of ${number}`}
      >
        {/* ROW 1: Number + Base */}
        <g
          opacity={visibleSteps > 0 ? 1 : 0.2}
          className="transition-opacity duration-300"
        >
          <rect x={30} y={30} width={160} height={50} rx={6} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
          <text x={110} y={60} textAnchor="middle" fill="var(--foreground)" fontSize="14" fontWeight="600">
            Number: {number}
          </text>
          <rect x={230} y={30} width={160} height={50} rx={6} fill="var(--primary)" fillOpacity={0.08} stroke="var(--primary)" strokeWidth={1.5} />
          <text x={310} y={60} textAnchor="middle" fill="var(--primary)" fontSize="14" fontWeight="600">
            Base: {base}
          </text>
        </g>

        {/* ARROW R1 → R2 */}
        <line
          x1={110} y1={82} x2={110} y2={96}
          stroke="var(--chart-3)"
          strokeWidth={2}
          markerEnd="url(#arrow-green)"
          opacity={visibleSteps > 1 ? 1 : 0}
          className="transition-opacity duration-300"
        />

        {/* ROW 2: Deficiency */}
        <g
          opacity={visibleSteps > 1 ? 1 : 0.2}
          className="transition-opacity duration-300"
        >
          <rect x={30} y={100} width={160} height={50} rx={6} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
          <text x={110} y={131} textAnchor="middle" fill="var(--foreground)" fontSize="13" fontWeight="500">
            Def: {deficiency > 0 ? "+" : ""}{deficiency}
          </text>
          <rect x={230} y={100} width={160} height={50} rx={6} fill="var(--card)" stroke="var(--border)" strokeWidth={1.5} />
          <text x={310} y={131} textAnchor="middle" fill="var(--foreground)" fontSize="13" fontWeight="500">
            {number} {deficiency > 0 ? "+" : ""}{deficiency} = {resultLeft}
          </text>
        </g>

        {/* ARROW R2 → R3 */}
        <line
          x1={310} y1={152} x2={310} y2={166}
          stroke="var(--chart-3)"
          strokeWidth={2}
          markerEnd="url(#arrow-green)"
          opacity={visibleSteps > 2 ? 1 : 0}
          className="transition-opacity duration-300"
        />

        {/* ROW 3: Result */}
        <g
          opacity={visibleSteps > 2 ? 1 : 0.2}
          className="transition-opacity duration-300"
        >
          <rect x={30} y={170} width={160} height={50} rx={6} fill="var(--chart-3)" fillOpacity={0.08} stroke="var(--chart-3)" strokeWidth={1.5} />
          <text x={110} y={201} textAnchor="middle" fill="var(--chart-3)" fontSize="13" fontWeight="600">
            {deficiency}² = {resultRight}
          </text>
          <rect x={230} y={170} width={160} height={50} rx={6} fill="var(--chart-3)" fillOpacity={0.15} stroke="var(--chart-3)" strokeWidth={2} />
          <text x={310} y={201} textAnchor="middle" fill="var(--chart-3)" fontSize="16" fontWeight="800">
            = {finalAnswer}
          </text>
        </g>

        {/* ARROWHEADS */}
        <defs>
          <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--chart-3)" />
          </marker>
        </defs>
      </svg>
    </TextScaffold>
  );
}
