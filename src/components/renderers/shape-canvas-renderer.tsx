"use client";

import { useMemo } from "react";
import type { RendererProps } from "@/lib/types/template";
import TextScaffold from "./text-scaffold";

type ShapeType = "triangle" | "rectangle" | "square" | "circle";

type ParsedShape = {
  shape: ShapeType;
  dimensions: number[];
};

function parseShape(problem: string): ParsedShape {
  const cleaned = problem.toLowerCase();
  let shape: ShapeType = "triangle";
  const dims: number[] = [];

  const dimMatch = cleaned.match(/([\d.]+)\s*(?:cm|mm|m)/g);
  if (dimMatch) {
    dims.push(...dimMatch.map((d) => parseFloat(d)));
  }

  if (cleaned.includes("circle") || cleaned.includes("circumference")) shape = "circle";
  else if (cleaned.includes("square")) shape = "square";
  else if (cleaned.includes("rectangle")) shape = "rectangle";
  else if (cleaned.includes("triangle")) shape = "triangle";

  return { shape, dimensions: dims };
}

export default function ShapeCanvasRenderer(props: RendererProps) {
  const { template, visibleSteps, mode, onStepReveal, ...rest } = props;
  const problem = template.examples?.[0]?.problem_statement ?? "";
  const { shape, dimensions } = useMemo(() => parseShape(problem), [problem]);

  const allRevealed = visibleSteps >= (template.examples?.[0]?.solution?.length ?? 0);
  const svgHeight = useMemo(() => 200 + Math.max(0, dimensions.length - 1) * 14, [dimensions.length]);

  const renderShape = () => {
    switch (shape) {
      case "triangle": {
        const [a = 5, b = 4] = dimensions;
        const h = (2 * (a || 1)) / (b || 1);
        return (
          <polygon
            points={`100,160 260,160 180,${160 - Math.min(h * 20, 120)}`}
            fill="var(--primary)"
            fillOpacity={0.08}
            stroke="var(--primary)"
            strokeWidth={2}
          />
        );
      }
      case "square":
      case "rectangle": {
        const w = shape === "square" ? 120 : Math.min((dimensions[0] ?? 6) * 20, 160);
        const h = shape === "square" ? 120 : Math.min((dimensions[1] ?? 4) * 20, 120);
        return (
          <rect
            x={140 - w / 2}
            y={80 - h / 2}
            width={w}
            height={h}
            rx={4}
            fill="var(--primary)"
            fillOpacity={0.08}
            stroke="var(--primary)"
            strokeWidth={2}
          />
        );
      }
      case "circle": {
        const r = Math.min((dimensions[0] ?? 5) * 15, 100);
        return (
          <circle
            cx={180}
            cy={100}
            r={r}
            fill="var(--primary)"
            fillOpacity={0.08}
            stroke="var(--primary)"
            strokeWidth={2}
          />
        );
      }
    }
  };

  return (
    <TextScaffold
      template={template}
      visibleSteps={visibleSteps}
      mode={mode}
      onStepReveal={onStepReveal}
      {...rest}
    >
      <svg
        viewBox={`0 0 360 ${svgHeight}`}
        className="w-full h-auto max-w-[400px]"
        role="img"
        aria-label={`Shape canvas for ${shape}`}
      >
        {renderShape()}
        {allRevealed && dimensions.length > 0 && dimensions.map((d, i) => (
          <text
            key={`dim-${i}`}
            x={180}
            y={190 + i * 14}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="11"
          >
            {shape === "circle" ? "Radius" : i === 0 ? "Base" : "Height"}: {d}
          </text>
        ))}
      </svg>
    </TextScaffold>
  );
}
