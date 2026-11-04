"use client";

/**
 * Mascot renderer — Zuzumik dashboard only.
 *
 * Engine: @bible-strong/avatar-react + @bible-strong/avatar-core, licensed
 * AGPL-3.0-only. Source: https://github.com/smontlouis/bible-strong-avatar-lab
 *
 * The definition in ./pip.avatar.json was assembled PROGRAMMATICALLY from the
 * open-source Avatar Lab default starters (the "Strobi" sphere body recolored to
 * the Zuzumik lime palette) and validated against the published
 * avatar-definition v1 JSON schema. To customise it later, open
 * https://avatars.bible-strong.app/ → BUILD → Export, then replace
 * ./pip.avatar.json with the downloaded file. Do not hand-edit the JSON.
 */

import type { ComponentProps } from "react";
import { useMemo } from "react";
import { Avatar } from "@bible-strong/avatar-react";
import "@bible-strong/avatar-react/styles.css";
import { useAccentSwatch } from "@/hooks/use-accent-hex";
import { pipDefinitionForAccent } from "./pip-avatar-definition";

type MascotAnimation = "waking" | "idle";
type MascotExpression = NonNullable<ComponentProps<typeof Avatar>["expression"]>;

type PipAvatarProps = {
  /** Controlled timeline. Mutually exclusive with `expression`. */
  animation?: MascotAnimation;
  /** Controlled still target (used when the visitor prefers reduced motion). */
  expression?: MascotExpression;
};

/**
 * The body is recolored to the active accent's swatch, so switching accent in
 * settings repaints the mascot. The definition is memoized per accent, so the
 * engine only re-validates and re-renders the SVG when the accent actually
 * changes (not on every parent render).
 */
export default function PipAvatar({ animation, expression }: PipAvatarProps) {
  const accent = useAccentSwatch();
  const avatarDefinition = useMemo(() => pipDefinitionForAccent(accent), [accent]);

  return (
    <Avatar
      definition={avatarDefinition}
      animation={animation}
      expression={expression}
      size="100%"
    />
  );
}

