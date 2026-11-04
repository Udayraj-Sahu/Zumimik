import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { RendererProps } from "@/lib/types/template";

const ArrowMatrixRenderer = dynamic(
  () => import("@/components/renderers/arrow-matrix-renderer"),
  { ssr: false },
);
const StrikePadRenderer = dynamic(
  () => import("@/components/renderers/strike-pad-renderer"),
  { ssr: false },
);
const NumberLineRenderer = dynamic(
  () => import("@/components/renderers/number-line-renderer"),
  { ssr: false },
);
const GridDerivationRenderer = dynamic(
  () => import("@/components/renderers/grid-derivation-renderer"),
  { ssr: false },
);
const EquationChainRenderer = dynamic(
  () => import("@/components/renderers/equation-chain-renderer"),
  { ssr: false },
);
const ShapeCanvasRenderer = dynamic(
  () => import("@/components/renderers/shape-canvas-renderer"),
  { ssr: false },
);
const TextScaffold = dynamic(
  () => import("@/components/renderers/text-scaffold"),
  { ssr: false },
);

export const SCAFFOLD_TO_RENDERER: Record<
  string,
  ComponentType<RendererProps>
> = {
  arrow_matrix: ArrowMatrixRenderer,
  place_value_chart: StrikePadRenderer,
  number_line: NumberLineRenderer,
  grid_construction: GridDerivationRenderer,
  shape_canvas: ShapeCanvasRenderer,
  textual_scaffold: EquationChainRenderer,
  equation_chain: EquationChainRenderer,
};

export function resolveRenderer(
  scaffoldType: string,
): ComponentType<RendererProps> {
  const key = scaffoldType?.toLowerCase() ?? "";
  return SCAFFOLD_TO_RENDERER[key] || TextScaffold;
}
