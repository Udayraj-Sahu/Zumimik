import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  /** One or two sentences: what will appear here, and what the learner can do to get it. */
  description?: ReactNode;
  /** The one thing to do next. Either a link (`href`) or a button (`onClick`). */
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
  "data-testid"?: string;
};

const actionClass =
  "mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-[12px] font-bold uppercase tracking-wider text-primary-foreground outline-none transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring";

/**
 * What a screen shows when there is nothing to list yet: why it is empty and the one next step, instead of a bare icon or a chart of
 * zeros. Uses only theme tokens, so it reads in light, dark and study.
 */
export function EmptyState({ icon: Icon, title, description, action, className, ...rest }: EmptyStateProps) {
  return (
    <div role="status" data-testid={rest["data-testid"] ?? "empty-state"} className={cn("flex flex-col items-center px-4 py-8 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} aria-hidden />
      </span>
      <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className={actionClass}>{action.label}</Link>
        ) : (
          <button type="button" onClick={action.onClick} className={actionClass}>{action.label}</button>
        ))}
    </div>
  );
}
