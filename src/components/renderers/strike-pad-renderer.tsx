"use client";

import { useMemo } from "react";
import type { RendererProps } from "@/lib/types/template";
import {
  parseDivision,
  extractQuotients,
} from "@/components/renderers/utils/parse-division";
import TextScaffold from "./text-scaffold";

export default function StrikePadRenderer(props: RendererProps) {
  const { template, visibleSteps, mode, onStepReveal, ...rest } = props;
  const problemLabel = template.examples?.[0]?.problem_statement ?? "";
  const parsed = useMemo(() => {
    const p = template.examples?.[0]?.problem_statement ?? "";
    return parseDivision(p);
  }, [template.examples]);
  const quotients = useMemo(() => {
    const s = template.examples?.[0]?.solution ?? [];
    return extractQuotients(s);
  }, [template.examples]);

  const digits = parsed.dividend;
  const cols = Math.max(digits.length, 1);
  const svgWidth = 80 + cols * 60;
  const svgHeight = 220;

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
        className="w-full h-auto max-w-[400px]"
        role="img"
        aria-label={`Division scaffold for ${problemLabel}`}
      >
        {/* DIVISOR */}
        {parsed.divisor > 0 && (
          <text x={20} y={60} fill="var(--foreground)" fontSize="16" fontWeight="700">
            ) {parsed.divisor}
          </text>
        )}

        {/* DIVIDEND DIGITS */}
        {digits.map((digit, i) => (
          <g key={`div-${i}`}>
            <rect
              x={60 + i * 60}
              y={30}
              width={40}
              height={40}
              rx={4}
              fill="transparent"
              stroke={visibleSteps > i ? "var(--primary)" : "var(--border)"}
              strokeWidth={1.5}
              opacity={visibleSteps > i ? 1 : 0.3}
              className="transition-opacity duration-300"
            />
            <text
              x={80 + i * 60}
              y={56}
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="18"
              fontWeight="700"
              opacity={visibleSteps > i ? 1 : 0.3}
              className="transition-opacity duration-300"
            >
              {digit}
            </text>
          </g>
        ))}

        {/* QUOTIENT ROW */}
        {quotients.map((q, i) => (
          <g
            key={`q-${i}`}
            opacity={visibleSteps > i ? 1 : 0}
            className="transition-opacity duration-300"
          >
            <text
              x={80 + i * 60}
              y={100}
              textAnchor="middle"
              fill="var(--chart-3)"
              fontSize="18"
              fontWeight="700"
            >
              {q.digit}
            </text>
            {q.remainder > 0 && (
              <text
                x={80 + i * 60}
                y={118}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="10"
              >
                r{q.remainder}
              </text>
            )}
          </g>
        ))}

        {/* STRIKE-THROUGH */}
        {digits.map((_, i) => (
          <line
            key={`strike-${i}`}
            x1={72 + i * 60}
            y1={42}
            x2={88 + i * 60}
            y2={58}
            stroke="var(--destructive)"
            strokeWidth={2}
            opacity={visibleSteps > i + 1 ? 1 : 0}
            className="transition-opacity duration-300"
          />
        ))}
      </svg>
    </TextScaffold>
  );
}
