"use client";

import { useMemo } from "react";
import type { RendererProps } from "@/lib/types/template";
import {
  parseMultiplication,
  extractProducts,
} from "@/components/renderers/utils/parse-multiplication";
import TextScaffold from "./text-scaffold";

const CELL_W = 80;
const CELL_H = 60;
const GAP_X = 100;
const GAP_Y = 80;
const OFFSET_X = 50;
const OFFSET_Y = 50;

export default function ArrowMatrixRenderer(props: RendererProps) {
  const { template, visibleSteps, mode, onStepReveal, ...rest } = props;
  const problemLabel = template.examples?.[0]?.problem_statement ?? "";
  const parsed = useMemo(() => {
    const p = template.examples?.[0]?.problem_statement ?? "";
    return parseMultiplication(p);
  }, [template.examples]);
  const products = useMemo(() => {
    const s = template.examples?.[0]?.solution ?? [];
    return extractProducts(s);
  }, [template.examples]);

  const rows = parsed.bottom.length;
  const cols = parsed.top.length;
  const totalCells = rows * cols;
  const svgWidth = OFFSET_X + cols * GAP_X + 80;
  const svgHeight = OFFSET_Y + rows * GAP_Y + 120;

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
        aria-label={`Arrow matrix for ${problemLabel}`}
      >
        {/* GRID CELLS */}
        {Array.from({ length: totalCells }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const x = OFFSET_X + col * GAP_X;
          const y = OFFSET_Y + row * GAP_Y;
          const cellVisible = visibleSteps > row;
          return (
            <g
              key={`cell-${i}`}
              opacity={cellVisible ? 1 : 0.2}
              className="transition-opacity duration-300"
            >
              <rect
                x={x}
                y={y}
                width={CELL_W}
                height={CELL_H}
                rx={6}
                fill="var(--card)"
                stroke="var(--border)"
                strokeWidth={1.5}
              />
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H / 2 - 6}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize="14"
                fontWeight="600"
              >
                {parsed.top[col]}
              </text>
              <text
                x={x + CELL_W / 2}
                y={y + CELL_H / 2 + 14}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="12"
              >
                × {parsed.bottom[row]}
              </text>
            </g>
          );
        })}

        {/* DIAGONAL ARROWS */}
        {Array.from({ length: Math.max(0, totalCells - 1) }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const x1 = OFFSET_X + CELL_W + col * GAP_X;
          const y1 = OFFSET_Y + (row + 0.5) * GAP_Y;
          const x2 = OFFSET_X + (col + 1) * GAP_X;
          const y2 = OFFSET_Y + (row + 0.5) * GAP_Y + GAP_Y - CELL_H / 2;
          const arrowVisible = visibleSteps > row + 1;
          return (
            <line
              key={`arrow-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--primary)"
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={arrowVisible ? 0.6 : 0}
              className="transition-opacity duration-300"
              markerEnd="url(#arrowhead)"
            />
          );
        })}

        {/* PRODUCT ROW */}
        {products.map((p, i) => (
          <text
            key={`prod-${i}`}
            x={svgWidth / 2}
            y={OFFSET_Y + rows * GAP_Y + 30 + i * 28}
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize="15"
            fontWeight="700"
            opacity={visibleSteps > rows + i ? 1 : 0}
            className="transition-opacity duration-300"
          >
            {i === products.length - 1 ? `= ${p.value}` : `${p.value} +`}
          </text>
        ))}

        {/* ARROWHEAD DEF */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="var(--primary)" />
          </marker>
        </defs>
      </svg>
    </TextScaffold>
  );
}
