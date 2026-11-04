/**
 * Pure helpers for the Pip mascot definition.
 *
 * Kept separate from ./pip-avatar.tsx so the accent-recoloring logic can be
 * unit-tested without importing the AGPL avatar engine (which touches
 * `window.matchMedia` and pulls in a stylesheet). The renderer lives in
 * ./pip-avatar.tsx.
 */
import type { AvatarProps } from "@bible-strong/avatar-react";
import definition from "./pip.avatar.json";

export type AvatarDefinition = AvatarProps["definition"];

const BASE_DEFINITION = definition as unknown as AvatarDefinition;

/**
 * The mascot definition recolored so the body follows the active accent.
 *
 * Only `colors.body` changes; the eyes keep their fixed near-black colour,
 * which stays legible because every accent swatch is a bright saturated hue.
 */
export function pipDefinitionForAccent(accent: string): AvatarDefinition {
  // The engine validates colors against `^#[0-9a-f]{6}$` (lowercase only),
  // while the accent swatches are authored uppercase.
  const body = accent.toLowerCase() as `#${string}`;
  return {
    ...BASE_DEFINITION,
    colors: { ...BASE_DEFINITION.colors, body },
  };
}
