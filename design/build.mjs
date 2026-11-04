// Generates design/figcraft-script.json for `figcraft-cli run`.
// The script drives FigCraft headlessly to build the Zuzumik mobile UI kit.
// Colours are copied from src/lib/theme-tokens.ts so the design matches the app.
// `$step` references let a step target a layer an earlier step created, so the
// generator tracks step indexes while it walks the layer tree.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const C = {
  bg: "#050505",
  panel: "#10140E",
  cardBorder: "#FFFFFF14",
  track: "#FFFFFF14",
  white: "#FFFFFF",
  muted: "#8B8B8B",
  slate: "#9CA3AF",
  lime: "#C8FF5A",
  limeSoft: "#C8FF5A1F",
  onLime: "#050505",
  emerald: "#34D399",
  cyan: "#22D3EE",
  amber: "#FBBF24",
  rose: "#FB7185",
  violet: "#A78BFA",
  blue: "#3B82F6",
  orange: "#FF8A4C",
};

const F = { head: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" };

const steps = [];

function add(node, parentIdx) {
  const params = { type: node.type, name: node.name };
  if (node.x != null) params.x = node.x;
  if (node.y != null) params.y = node.y;
  if (node.width != null) params.width = node.width;
  if (node.height != null) params.height = node.height;
  if (node.text != null) params.text = node.text;
  if (node.props) params.props = node.props;
  if (parentIdx != null) params.parent = { $step: parentIdx };
  steps.push({ command: "node.create", params });
  const idx = steps.length - 1;
  for (const child of node.children || []) add(child, idx);
  return idx;
}

const T = (name, text, x, y, width, props) => ({ type: "text", name, text, x, y, width, props });
const R = (name, x, y, width, height, props) => ({ type: "rectangle", name, x, y, width, height, props });
const E = (name, x, y, width, height, props) => ({ type: "ellipse", name, x, y, width, height, props });
const Fr = (name, x, y, width, height, props, children) => ({ type: "frame", name, x, y, width, height, props, children });

// Text vertically centred in a box of `height` (approximate line box = 1.25em).
const TC = (name, text, x, y, width, height, props = {}) =>
  T(name, text, x, y + Math.round((height - (props.fontSize || 14) * 1.25) / 2), width, {
    textAlign: "center",
    ...props,
  });

const screen = (name, x, children) =>
  Fr(name, x, 0, 390, 844, { fill: C.bg, clip: true }, children);

/* ---------------------------------------------------------------- Home --- */

const TOPICS = [
  ["Quantitative Aptitude", 92, C.lime],
  ["Logical Reasoning", 78, C.cyan],
  ["Data Interpretation", 85, C.emerald],
  ["Verbal Ability", 64, C.amber],
  ["General Knowledge", 41, C.rose],
];

const topicRow = (label, pct, accent, y) =>
  Fr(`Topic/${label}`, 24, y, 342, 72, { fill: C.panel, cornerRadius: 18, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Label", label, 20, 16, 230, { fontFamily: F.body, fontSize: 15, fontStyle: "bold", fill: C.white }),
    T("Pct", `${pct}%`, 274, 14, 48, { fontFamily: F.body, fontSize: 14, fontStyle: "bold", fill: accent, textAlign: "right" }),
    R("Track", 20, 46, 302, 8, { fill: C.track, cornerRadius: 4 }),
    R("Progress", 20, 46, Math.round((302 * pct) / 100), 8, { fill: accent, cornerRadius: 4 }),
  ]);

const statChip = (label, value, accent, x) =>
  Fr(`Stat/${label}`, x, 232, 110, 72, { fill: C.panel, cornerRadius: 16, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Value", value, 16, 12, 78, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: accent }),
    T("Label", label, 16, 42, 78, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
  ]);

const home = screen("Home", 0, [
  T("Greeting", "Good evening,", 24, 48, 220, { fontFamily: F.body, fontSize: 14, fill: C.muted }),
  T("UserName", "Arjun M.", 24, 66, 240, { fontFamily: F.head, fontSize: 26, fontStyle: "bold", fill: C.white }),
  E("Avatar", 318, 50, 48, 48, { fill: C.lime }),
  TC("AvatarInitial", "A", 318, 50, 48, 48, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.onLime }),

  Fr("StreakCard", 24, 120, 342, 96, { fill: C.panel, cornerRadius: 20, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Streak", "6 day streak", 20, 16, 200, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.amber }),
    T("Xp", "2,340 XP earned", 20, 44, 220, { fontFamily: F.body, fontSize: 13, fill: C.muted }),
    ...[0, 1, 2, 3, 4, 5, 6].map((i) =>
      R(
        ["M", "T", "W", "T", "F", "S", "S"][i],
        20 + i * 44,
        62,
        32,
        8,
        { fill: [true, true, true, false, true, true, false][i] ? C.lime : C.track, cornerRadius: 4 },
      ),
    ),
  ]),

  statChip("Accuracy", "85%", C.amber, 24),
  statChip("Questions", "2.1k", C.cyan, 140),
  statChip("Speed", "72", C.violet, 256),

  T("TopicsTitle", "Topics", 24, 324, 200, { fontFamily: F.head, fontSize: 18, fontStyle: "bold", fill: C.white }),
  ...TOPICS.map(([label, pct, accent], i) => topicRow(label, pct, accent, 356 + i * 84)),

  Fr("BottomNav", 24, 772, 342, 56, { fill: C.panel, cornerRadius: 24, stroke: C.cardBorder, strokeWeight: 1 }, [
    TC("Nav/Home", "Home", 37, 18, 60, 20, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.lime }),
    TC("Nav/Learn", "Learn", 122, 18, 60, 20, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
    TC("Nav/Play", "Play", 207, 18, 60, 20, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
    TC("Nav/Settings", "Settings", 292, 18, 60, 20, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
  ]),
]);

/* --------------------------------------------------------------- Arena --- */

const option = (letter, label, y, selected) =>
  Fr(`Option/${letter}`, 24, y, 342, 56, {
    fill: selected ? C.limeSoft : C.panel,
    cornerRadius: 18,
    stroke: selected ? C.lime : C.cardBorder,
    strokeWeight: selected ? 2 : 1,
  }, [
    E("Badge", 14, 12, 32, 32, { fill: selected ? C.lime : C.cardBorder }),
    TC("BadgeText", letter, 14, 12, 32, 32, {
      fontFamily: F.body,
      fontSize: 14,
      fontStyle: "bold",
      fill: selected ? C.onLime : C.slate,
    }),
    T("OptionText", label, 60, 17, 250, {
      fontFamily: F.body,
      fontSize: 15,
      fontStyle: "bold",
      fill: selected ? C.white : C.slate,
    }),
  ]);

const arena = screen("Arena", 470, [
  T("Title", "Arena", 24, 46, 220, { fontFamily: F.head, fontSize: 26, fontStyle: "bold", fill: C.white }),
  R("LivePill", 24, 88, 130, 28, { fill: C.limeSoft, cornerRadius: 14 }),
  T("LiveText", "\u25CF LRDI Sprint", 34, 94, 116, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.lime }),
  T("LiveTime", "Today, 8:00 PM", 24, 126, 200, { fontFamily: F.body, fontSize: 13, fill: C.muted }),
  Fr("QuestionCard", 24, 168, 342, 190, { fill: C.panel, cornerRadius: 24, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("QNo", "Q4 / 10", 20, 16, 120, { fontFamily: F.mono, fontSize: 12, fill: C.muted }),
    T("Timer", "00:42", 262, 16, 60, { fontFamily: F.mono, fontSize: 12, fontStyle: "bold", fill: C.lime, textAlign: "right" }),
    R("Track", 20, 44, 302, 6, { fill: C.track, cornerRadius: 3 }),
    R("Progress", 20, 44, 121, 6, { fill: C.lime, cornerRadius: 3 }),
    T("Question", "Which of Newton's laws explains how a rocket moves forward?", 20, 72, 302, {
      fontFamily: F.head,
      fontSize: 18,
      fontStyle: "bold",
      fill: C.white,
      lineHeight: "140%",
    }),
  ]),
  option("A", "First law", 384, false),
  option("B", "Second law", 456, true),
  option("C", "Third law", 528, false),
  option("D", "Law of gravitation", 600, false),
  Fr("Confirm", 24, 700, 342, 56, { fill: C.lime, cornerRadius: 28 }, [
    TC("ConfirmLabel", "Confirm answer", 0, 0, 342, 56, { fontFamily: F.head, fontSize: 16, fontStyle: "bold", fill: C.onLime }),
  ]),
  T("Hint", "Answer within 42s to keep your streak", 24, 772, 342, {
    fontFamily: F.body,
    fontSize: 12,
    fill: C.muted,
    textAlign: "center",
  }),
]);

/* ----------------------------------------------------------- Analytics --- */

const skillBar = (label, pct, accent, y) => [
  T(`Skill/${label}`, label, 20, y - 2, 90, { fontFamily: F.body, fontSize: 13, fill: C.white }),
  R("Track", 120, y, 180, 8, { fill: C.track, cornerRadius: 4 }),
  R("Fill", 120, y, Math.round((180 * pct) / 100), 8, { fill: accent, cornerRadius: 4 }),
  T("Value", `${pct}`, 306, y - 3, 28, { fontFamily: F.mono, fontSize: 11, fill: C.muted, textAlign: "right" }),
];

const analytics = screen("Analytics", 940, [
  T("Title", "Analytics", 24, 46, 220, { fontFamily: F.head, fontSize: 26, fontStyle: "bold", fill: C.white }),
  T("Subtitle", "CAT \u00B7 This week", 24, 84, 240, { fontFamily: F.body, fontSize: 13, fill: C.muted }),
  Fr("AccuracyCard", 24, 116, 342, 120, { fill: C.panel, cornerRadius: 24, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Big", "85%", 24, 18, 180, { fontFamily: F.head, fontSize: 42, fontStyle: "bold", fill: C.lime }),
    T("Label", "Overall accuracy", 26, 76, 220, { fontFamily: F.body, fontSize: 13, fill: C.muted }),
    T("Delta", "+4% vs last week", 210, 26, 108, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.emerald, textAlign: "right" }),
  ]),
  Fr("SkillsCard", 24, 252, 342, 300, { fill: C.panel, cornerRadius: 24, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("SkillsTitle", "Skill radar", 20, 20, 220, { fontFamily: F.head, fontSize: 16, fontStyle: "bold", fill: C.white }),
    ...skillBar("Speed", 90, C.lime, 64),
    ...skillBar("Logic", 75, C.cyan, 102),
    ...skillBar("Stamina", 70, C.emerald, 140),
    ...skillBar("Focus", 80, C.violet, 178),
    ...skillBar("Memory", 72, C.amber, 216),
    ...skillBar("Reflex", 85, C.rose, 254),
  ]),
  Fr("Metric/Delay", 24, 568, 163, 96, { fill: C.panel, cornerRadius: 20, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Value", "142ms", 16, 16, 130, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.violet }),
    T("Label", "Action delay", 16, 56, 130, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
  ]),
  Fr("Metric/Focus", 203, 568, 163, 96, { fill: C.panel, cornerRadius: 20, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Value", "89%", 16, 16, 130, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.cyan }),
    T("Label", "Focus density", 16, 56, 130, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
  ]),
  Fr("OpenReport", 24, 700, 342, 56, { fill: C.lime, cornerRadius: 28 }, [
    TC("ReportLabel", "Open full report", 0, 0, 342, 56, { fontFamily: F.head, fontSize: 16, fontStyle: "bold", fill: C.onLime }),
  ]),
]);

/* ---------------------------------------------------------- Leaderboard --- */

const lbRow = (rank, name, xp, y, me) =>
  Fr(`Rank/${rank}`, 24, y, 342, 72, {
    fill: me ? C.limeSoft : C.panel,
    cornerRadius: 18,
    stroke: me ? C.lime : C.cardBorder,
    strokeWeight: me ? 2 : 1,
  }, [
    E("RankBadge", 16, 16, 40, 40, { fill: C.cardBorder }),
    TC("RankText", `${rank}`, 16, 16, 40, 40, { fontFamily: F.head, fontSize: 15, fontStyle: "bold", fill: me ? C.white : C.slate }),
    T("Name", name, 72, 24, 180, { fontFamily: F.body, fontSize: 16, fontStyle: "bold", fill: C.white }),
    T("XP", `${xp} XP`, 250, 25, 76, { fontFamily: F.mono, fontSize: 13, fill: C.lime, textAlign: "right" }),
  ]);

const eventCard = (title, time, tag, tagColor, y) =>
  Fr(`Event/${title}`, 24, y, 342, 76, { fill: C.panel, cornerRadius: 18, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Title", title, 20, 16, 220, { fontFamily: F.body, fontSize: 15, fontStyle: "bold", fill: C.white }),
    T("Time", time, 20, 42, 200, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
    R("TagPill", 262, 24, 60, 26, { fill: C.cardBorder, cornerRadius: 13 }),
    TC("TagText", tag, 262, 24, 60, 26, { fontFamily: F.body, fontSize: 11, fontStyle: "bold", fill: tagColor }),
  ]);

const leaderboard = screen("Leaderboard", 1410, [
  T("Title", "Leaderboard", 24, 46, 260, { fontFamily: F.head, fontSize: 26, fontStyle: "bold", fill: C.white }),
  T("Subtitle", "CAT \u00B7 This season", 24, 84, 240, { fontFamily: F.body, fontSize: 13, fill: C.muted }),
  lbRow("1", "Priya S.", "4,820", 120, false),
  lbRow("2", "Arjun M.", "4,310", 200, false),
  lbRow("3", "Rohan K.", "3,990", 280, false),
  lbRow("47", "You", "2,340", 360, true),
  T("UpcomingTitle", "Upcoming", 24, 470, 220, { fontFamily: F.head, fontSize: 18, fontStyle: "bold", fill: C.white }),
  eventCard("LRDI Sprint", "Today, 8:00 PM", "LIVE", C.rose, 502),
  eventCard("Mock CAT #7", "Thu, 10:00 AM", "MOCK", C.amber, 590),
  eventCard("VA Sectional", "Sat, 3:00 PM", "GROUP", C.cyan, 678),
]);

/* ---------------------------------------------------------------- Tokens --- */

const swatch = (label, hex, x, y, w, h, overText) =>
  Fr(`Swatch/${label}`, x, y, w, h, { fill: hex, cornerRadius: 14, stroke: C.cardBorder, strokeWeight: 1 }, [
    T("Label", overText || label, 12, h - 24, w - 20, { fontFamily: F.mono, fontSize: 10, fill: overText ? C.onLime : C.white }),
  ]);

const tokens = Fr("Tokens", 1880, 0, 420, 844, { fill: "#0B0D0A", clip: true }, [
  T("Title", "Zuzumik \u2014 Tokens", 24, 40, 372, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.white }),
  T("SurfacesLabel", "SURFACES", 24, 82, 200, { fontFamily: F.mono, fontSize: 11, fill: C.muted, letterSpacing: "6%" }),
  swatch("BG", C.bg, 24, 102, 116, 64, "#050505"),
  swatch("Panel", C.panel, 152, 102, 116, 64, "#10140E"),
  swatch("Glass", C.cardBorder, 280, 102, 116, 64, "#FFFFFF14"),
  T("AccentLabel", "BRAND & ACCENTS", 24, 190, 240, { fontFamily: F.mono, fontSize: 11, fill: C.muted, letterSpacing: "6%" }),
  swatch("Lime", C.lime, 24, 210, 116, 56, "#C8FF5A"),
  swatch("Emerald", C.emerald, 152, 210, 116, 56, "#34D399"),
  swatch("Cyan", C.cyan, 280, 210, 116, 56, "#22D3EE"),
  swatch("Violet", C.violet, 24, 278, 116, 56, "#A78BFA"),
  swatch("Amber", C.amber, 152, 278, 116, 56, "#FBBF24"),
  swatch("Rose", C.rose, 280, 278, 116, 56, "#FB7185"),
  T("TypeLabel", "TEXT", 24, 366, 200, { fontFamily: F.mono, fontSize: 11, fill: C.muted, letterSpacing: "6%" }),
  T("HeadSample", "Space Grotesk", 24, 388, 372, { fontFamily: F.head, fontSize: 28, fontStyle: "bold", fill: C.white }),
  T("BodySample", "Inter \u2014 body copy, 16/150% for long paragraphs.", 24, 428, 372, {
    fontFamily: F.body,
    fontSize: 15,
    fill: C.slate,
    lineHeight: "150%",
  }),
  T("MonoSample", "JetBrains Mono 14 \u2014 00:42", 24, 486, 372, { fontFamily: F.mono, fontSize: 14, fill: C.lime }),
  T("ThemesLabel", "ACCENT THEMES (DARK)", 24, 532, 260, { fontFamily: F.mono, fontSize: 11, fill: C.muted, letterSpacing: "6%" }),
  swatch("Lime", C.lime, 24, 552, 60, 40),
  swatch("Emerald", C.emerald, 114, 552, 60, 40),
  swatch("Cyan", C.cyan, 204, 552, 60, 40),
  swatch("Violet", C.violet, 294, 552, 60, 40),
  swatch("Amber", C.amber, 24, 620, 60, 40),
  swatch("Red", C.rose, 114, 620, 60, 40),
  swatch("Orange", C.orange, 204, 620, 60, 40),
  swatch("Blue", C.blue, 294, 620, 60, 40),
  T("Source", "Source: src/lib/theme-tokens.ts", 24, 780, 372, { fontFamily: F.mono, fontSize: 11, fill: C.muted }),
]);

/* ---------------------------------------------------------------- Build --- */

steps.unshift({ command: "page.rename", params: { name: "Zuzumik" } });

for (const node of [home, arena, analytics, leaderboard, tokens]) add(node, null);

const out = join(here, "figcraft-script.json");
writeFileSync(out, JSON.stringify(steps, null, 2) + "\n");
console.log(`wrote ${out} (${steps.length} steps)`);
