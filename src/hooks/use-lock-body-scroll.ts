"use client";

import { useEffect } from "react";

let bodyLockCount = 0;
let bodyPrevOverflow: string | null = null;
const mainPrevOverflow = new Map<HTMLElement, string>();

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const lock = () => {
      bodyLockCount += 1;
      if (bodyLockCount === 1) {
        bodyPrevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      const scrollers = Array.from(document.querySelectorAll<HTMLElement>("main"));
      for (const el of scrollers) {
        if (!mainPrevOverflow.has(el)) {
          mainPrevOverflow.set(el, el.style.overflow);
          el.style.overflow = "hidden";
        }
      }
    };

    const unlock = () => {
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0) {
        if (bodyPrevOverflow !== null) {
          document.body.style.overflow = bodyPrevOverflow;
        }
        bodyPrevOverflow = null;
        for (const [el, prev] of mainPrevOverflow) {
          el.style.overflow = prev;
        }
        mainPrevOverflow.clear();
      }
    };

    lock();
    return unlock;
  }, [locked]);
}