import { cn } from "@/lib/utils";

export function ZuzumikMark({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Zuzumik"
      viewBox="0 0 512 512"
      className={cn("block size-9 shrink-0", className)}
    >
      <rect width="512" height="512" rx="112" fill="#0b0e1a" />
      <rect x="3" y="3" width="506" height="506" rx="109" fill="none" stroke="#1c2233" strokeWidth={6} />
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M114 128H376M114 355H376" stroke="#f6f1e3" strokeWidth={28} />
        <path d="M114 355L186 248L214 278L267 167L290 200L372 130" stroke="#e8b93f" strokeWidth={26} />
      </g>
      <circle cx="114" cy="355" r="17" fill="#e8b93f" />
    </svg>
  );
}
