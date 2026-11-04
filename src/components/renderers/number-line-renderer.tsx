"use client";

import { useMemo } from "react";
import type { RendererProps } from "@/lib/types/template";
import { parseNumberLine } from "@/components/renderers/utils/parse-number-line";
import TextScaffold from "./text-scaffold";

export default function NumberLineRenderer(props: RendererProps) {
  const { template, visibleSteps, mode, onStepReveal, ...rest } = props;
  const { lower, upper, result, totalSteps } = useMemo(() => {
    const s = template.examples?.[0]?.solution ?? [];
    const parsed = parseNumberLine(s);
    return { ...parsed, totalSteps: s.length };
  }, [template.examples]);
  const allRevealed = visibleSteps >= totalSteps;

  const range = upper - lower || 1;
  const ticks = 10;
  const marginLeft = 60;
  const marginRight = 60;
  const lineWidth = 340;
  const svgWidth = marginLeft + lineWidth + marginRight;
  const svgHeight = 130;

  const resultX = marginLeft + ((result - lower) / range) * lineWidth;

  return (
    <TextScaffold
      template={template}
      visibleSteps={visibleSteps}
      mode={mode}
      onStepReveal={onStepReveal}
      {...rest}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto max-w-[500px]"
        role="img"
        aria-label={`Number line from ${lower} to ${upper}`}
      >
        {/* ESTIMATION ZONE */}
        <rect
          x={marginLeft}
          y={36}
          width={lineWidth}
          height={40}
          rx={6}
          fill="var(--primary)"
          opacity={0.08}
        />

        {/* HORIZONTAL LINE */}
        <line
          x1={marginLeft}
          y1={60}
          x2={marginLeft + lineWidth}
          y2={60}
          stroke="var(--foreground)"
          strokeWidth={2}
        />

        {/* TICK MARKS */}
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const x = marginLeft + (i / ticks) * lineWidth;
          const val = lower + (range * i) / ticks;
          return (
            <g key={`tick-${i}`}>
              <line
                x1={x}
                y1={50}
                x2={x}
                y2={70}
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={86}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="10"
              >
                {val.toFixed(val % 1 === 0 ? 0 : 1)}
              </text>
            </g>
          );
        })}

        {/* RESULT MARKER */}
        <g
          opacity={allRevealed ? 1 : 0}
          className="transition-opacity duration-300"
        >
          <circle cx={resultX} cy={60} r={8} fill="var(--destructive)" />
          <circle cx={resultX} cy={60} r={4} fill="var(--background)" />
          <text
            x={resultX}
            y={42}
            textAnchor="middle"
            fill="var(--destructive)"
            fontSize="12"
            fontWeight="700"
          >
            {result}
          </text>
        </g>
      </svg>
    </TextScaffold>
  );
}
