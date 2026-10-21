import { WallRegion } from "@/components/landing/wall-region";
import { AMBER, GLASS_05, LIME_BRIGHT, LIME_BRIGHT_40, RED } from "@/lib/theme";
import { Achievement } from "@/components/landing/achievement";
import { AIScanLine } from "@/components/landing/ai-scan-line";

const ACHIEVEMENTS = [
  { label: "100 Questions Solved", sublabel: "First century. The wall remembers.", unlocked: true },
  { label: "7 Day Streak", sublabel: "Seven consecutive days of forward motion.", unlocked: true },
  { label: "30 Day Streak", sublabel: "A month of uninterrupted movement.", unlocked: false },
  { label: "Top 10%", sublabel: "You have passed 90 out of every 100.", unlocked: false },
  { label: "Top 1%", sublabel: "The wall's highest engraving.", unlocked: false },
  { label: "Speed Demon", sublabel: "Full mock completed in record time.", unlocked: true },
];

const GAP_INSIGHTS = [
  { color: RED, label: "Weak Topic Found", desc: "Chapters requiring immediate attention" },
  { color: LIME_BRIGHT, label: "High Potential Chapter", desc: "Quick improvement opportunity identified" },
  { color: AMBER, label: "Revision Needed", desc: "Decay detected in covered chapters" },
  { color: LIME_BRIGHT, label: "Rank Opportunity", desc: "High-weightage, low-competition zone" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 text-muted-foreground font-sans"
      style={{ fontSize: "clamp(9px, 1.2vw, 11px)", letterSpacing: "0.25em", textTransform: "uppercase" }}>
      <div className="w-6 h-px" style={{ background: LIME_BRIGHT_40 }} />
      {children}
    </div>
  );
}

function Divider() {
  return <div className="w-full h-px" style={{ background: GLASS_05 }} />;
}

export function AchievementWall() {
  return (
    <section id="champions" className="relative bg-background overflow-hidden">
      <div style={{ padding: "120px clamp(24px, 6vw, 120px)", position: "relative" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-start">
          <WallRegion>
            <SectionLabel>Achievement Region</SectionLabel>
            <h2 className="text-foreground font-display"
              style={{ marginTop: "40px", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              THE WALL<br />RECORDS<br /><span className="text-foreground/20">EVERYTHING.</span>
            </h2>
            <p className="text-muted-foreground mt-6 font-sans" style={{ fontSize: "clamp(12px, 1.6vw, 14px)", lineHeight: "1.8", maxWidth: "320px" }}>
              Engravings appear as you move forward. Unlocked marks illuminate. Permanent. Unalterable.
            </p>
          </WallRegion>
          <WallRegion>
            <div style={{ display: "flex", flexDirection: "column", gap: "28px", marginTop: "80px" }}>
              {ACHIEVEMENTS.map((ach, i) => (
                <Achievement key={i} label={ach.label} sublabel={ach.sublabel} unlocked={ach.unlocked} delay={i * 0.1} />
              ))}
            </div>
          </WallRegion>
        </div>
      </div>
      <Divider />
      <div style={{ padding: "120px clamp(24px, 6vw, 120px)", position: "relative" }}>
        <WallRegion>
          <SectionLabel>AI Analysis Region</SectionLabel>
          <h3 className="text-foreground font-display"
            style={{ marginTop: "40px", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "60px", maxWidth: "600px" }}>
            THE WALL READS<br /><span className="text-primary">YOUR GAPS.</span>
          </h3>
        </WallRegion>
        <WallRegion><AIScanLine /></WallRegion>
        <WallRegion>
          <div className="grid gap-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {GAP_INSIGHTS.map((item, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="tracking-wide font-sans" style={{ fontSize: "clamp(11px, 1.4vw, 13px)", color: item.color }}>{item.label}</span>
                </div>
                <p className="text-muted-foreground pl-4 font-sans" style={{ fontSize: "clamp(10px, 1.3vw, 12px)", lineHeight: "1.6" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </WallRegion>
      </div>
    </section>
  );
}
