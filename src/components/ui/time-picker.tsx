"use client";

import { ScrollColumn } from "@/components/ui/scroll-column";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const MERIDIEM = ["AM", "PM"] as const;

export type ParsedTime = { hour: string; minute: string; meridiem: (typeof MERIDIEM)[number] };

// "HH:MM" (24h) -> wheel selection (12h + meridiem). Falls back to 08:00 on bad input.
export function parseTime24(value: string): ParsedTime {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  let h = match ? Number(match[1]) : 8;
  let m = match ? Number(match[2]) : 0;
  if (!Number.isFinite(h) || h < 0 || h > 23) h = 8;
  if (!Number.isFinite(m) || m < 0 || m > 59) m = 0;
  const meridiem: ParsedTime["meridiem"] = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: String(hour12), minute: String(m).padStart(2, "0"), meridiem };
}

// wheel selection (12h + meridiem) -> "HH:MM" (24h)
export function formatTime24(hour12: string, minute: string, meridiem: string): string {
  const h12 = Number(hour12);
  const safeH = Number.isFinite(h12) && h12 >= 1 && h12 <= 12 ? h12 : 8;
  const m = Number(minute);
  const safeM = Number.isFinite(m) ? Math.min(59, Math.max(0, Math.trunc(m))) : 0;
  let h24 = safeH % 12;
  if (meridiem === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(safeM).padStart(2, "0")}`;
}

type Props = {
  value: string; // "HH:MM" (24h)
  onChange: (value: string) => void; // emits "HH:MM" (24h)
  fadeFrom?: string;
};

export function TimePicker({ value, onChange, fadeFrom }: Props) {
  const { hour, minute, meridiem } = parseTime24(value);

  return (
    <div className="rounded-2xl border border-border/40 bg-background overflow-hidden">
      <div className="flex">
        <ScrollColumn
          items={HOURS.map((h) => ({ value: h, label: h }))}
          selected={hour}
          onSelect={(v) => onChange(formatTime24(v, minute, meridiem))}
          label="HH"
          fadeFrom={fadeFrom}
        />
        <div className="w-px bg-border my-3" />
        <ScrollColumn
          items={MINUTES.map((m) => ({ value: m, label: m }))}
          selected={minute}
          onSelect={(v) => onChange(formatTime24(hour, v, meridiem))}
          label="MM"
          fadeFrom={fadeFrom}
        />
        <div className="w-px bg-border my-3" />
        <ScrollColumn
          items={MERIDIEM.map((m) => ({ value: m, label: m }))}
          selected={meridiem}
          onSelect={(v) => onChange(formatTime24(hour, minute, v))}
          label=""
          fadeFrom={fadeFrom}
        />
      </div>
    </div>
  );
}
