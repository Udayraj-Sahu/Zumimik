import { cn } from "@/lib/utils";

const WORDMARK_DOT = "#ff4d2e";

export function ZuzumikWordmark({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Zuzumik"
      viewBox="0 0 350 80"
      fill="none"
      className={cn("block h-6 w-auto", className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth={9} strokeLinejoin="miter" strokeMiterlimit={2}>
        <path d="M10 28H38L10 66H38" />
        <path d="M54 28V48A18 18 0 0 0 90 48V28M90 28V66" />
        <path d="M104 28H132L104 66H132" />
        <path d="M148 28V48A18 18 0 0 0 184 48V28M184 28V66" />
        <path d="M200 66V28M200 44A16 16 0 0 1 232 44V66M232 44A16 16 0 0 1 264 44V66" />
        <path d="M282 28V66" />
        <path d="M300 6V66M334 28L302 50M312 44L336 66" />
      </g>
      <circle cx="282" cy="9" r="7" fill={WORDMARK_DOT} />
    </svg>
  );
}
