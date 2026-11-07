"use client";
import { MathText } from "@/components/ui/math-text";
import { cn } from "@/lib/utils";

/**
 * The backend sends one `text` per question: any instructions and passage first, then the question itself, separated by blank lines.
 * Shown as one block it is a wall of bold text, so it is split here: the question stays prominent, and the passage and directions are
 * set apart in smaller, roomier type that scrolls when long.
 */
export function splitQuestionText(text: string): { context: string[]; stem: string } {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length <= 1) return { context: [], stem: blocks[0] ?? "" };
  return { context: blocks.slice(0, -1), stem: blocks[blocks.length - 1] };
}

const DIRECTIONS = /^(directions?\b|answer each\b|read the following\b|the \w+ passages\b|per-question format\b|instructions?\b)/i;

export function QuestionText({ text, className }: { text: string; className?: string }) {
  const { context, stem } = splitQuestionText(text);
  const directions = context.length > 1 && DIRECTIONS.test(context[0]) ? context[0] : null;
  const passage = directions ? context.slice(1) : context;
  return (
    <div className={cn("mb-5 max-[359px]:mb-4 text-justify", className)} data-testid="question-text">
      {directions && (
        <p className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px] italic leading-relaxed text-muted-foreground/70 whitespace-pre-line">
          <MathText text={directions} />
        </p>
      )}
      {passage.length > 0 && (
        <section
          aria-label="Passage"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a long passage must be scrollable from the keyboard
          tabIndex={0}
          className="mb-4 max-h-[42vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="question-passage"
        >
          <p className="mb-2 text-micro font-bold uppercase tracking-[0.18em] text-muted-foreground/45">Passage</p>
          <div className="space-y-3 text-[14px] leading-[1.75] text-foreground/85">
            {passage.map((block, i) => (
              <p key={i} className="whitespace-pre-line">
                <MathText text={block} />
              </p>
            ))}
          </div>
        </section>
      )}
      <p className="text-[16px] font-semibold leading-snug text-foreground whitespace-pre-line" data-testid="question-stem">
        <MathText text={stem} />
      </p>
    </div>
  );
}
