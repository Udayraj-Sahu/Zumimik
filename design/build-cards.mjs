// Generates design/cards-script.json for `figcraft-cli run --in ... --out ...`.
// Appends ONE new frame to design/zuzumik.figcraft: the five dashboard
// carousel cards at their shortened (content) heights measured from the built
// app at a 390px viewport: 366 / 321 / 424 / 313 / 405.
// Colours/radius/type mirror the app's carousel + the board's existing frames.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const C = {
  bg: "#050505",
  panel: "#10140E",
  cardBorder: "#FFFFFF14",
  glass06: "#FFFFFF0F",
  glass10: "#FFFFFF1A",
  glassBg: "#FFFFFF0A",
  clear: "#00000000",
  white: "#FFFFFF",
  muted: "#8B8B8B",
  soft: "#B3B3B3",
  slate: "#9CA3AF",
  lime: "#C8FF5A",
  limeTint: "#C8FF5A0F",
  limeLine: "#C8FF5A33",
  onLime: "#05150D",
  emerald: "#34D399",
  emeraldTint: "#34D3990F",
  cyan: "#22D3EE",
  cyanTint: "#22D3EE14",
  amber: "#FBBF24",
  amberTint: "#FBBF240F",
  violet: "#A78BFA",
};

const F = { head: "Space Grotesk", body: "Inter", mono: "JetBrains Mono" };

// linear gradient as a `fills` array (node.create rejects a gradient in `fill`)
const GF = (...stops) => ({ fills: [{ type: "linearGradient", stops }] });

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
const Grp = (name, x, y, width, height, children) => Fr(name, x, y, width, height, { fill: C.clear }, children);

const TC = (name, text, x, y, width, height, props = {}) =>
  T(name, text, x, y + Math.round((height - (props.fontSize || 14) * 1.25) / 2), width, {
    textAlign: "center",
    ...props,
  });

// rounded, tinted icon tile with a glyph centred inside
const tile = (name, x, y, size, radius, bg, glyph, color, glyphSize = 15) =>
  Fr(name, x, y, size, size, { fill: bg, cornerRadius: radius }, [
    TC("Glyph", glyph, 0, 0, size, size, { fontFamily: F.body, fontSize: glyphSize, fill: color }),
  ]);

// pill; stroke only when a colour is given
const pill = (name, x, y, w, h, bg, text, color, opts = {}) => {
  const props = { fill: bg, cornerRadius: h / 2 };
  if (opts.stroke) {
    props.stroke = opts.stroke;
    props.strokeWeight = 1;
  }
  return Fr(name, x, y, w, h, props, [
    TC("Label", text, 0, 0, w, h, {
      fontFamily: opts.mono ? F.mono : F.body,
      fontSize: opts.fontSize || 10,
      fontStyle: "bold",
      fill: color,
    }),
  ]);
};

const mod = { "space-grotesk": "Space Grotesk", inter: "Inter", "jetbrains-mono": "JetBrains Mono" };
const font = (id) => mod[id] || id;

/* ------------------------------------------------------ 1 · Profile status --- */

const CAP_W = 342;
const CARD_Y = 90;

const CHIPS = [["Name", 58], ["Persona", 70], ["Goal", 48], ["Vibe", 50], ["Details", 62]];
let chipX = 24;
const chipNodes = CHIPS.map(([label, w]) => {
  const node = pill(`Chip/${label}`, chipX, 268, w, 20, C.glassBg, label, C.soft, { stroke: C.glass06, fontSize: 8 });
  chipX += w + 6;
  return node;
});

const profileCard = Fr("Card/ProfileStatus", 0, CARD_Y, CAP_W, 366, gradient(C.limeTint, C.glassBg), [
  Grp("Header", 24, 12, 294, 44, [
    E("Avatar", 0, 6, 32, 32, { fill: C.lime }),
    TC("AvatarInitial", "A", 0, 6, 32, 32, { fontFamily: font("space-grotesk"), fontSize: 16, fontStyle: "bold", fill: C.onLime }),
    T("HeaderTitle", "Profile complete", 42, 16, 160, { fontFamily: font("inter"), fontSize: 13, fontStyle: "bold", fill: C.white }),
    pill("Pct", 214, 10, 80, 24, C.limeTint, "\u2726 100%", C.lime, { stroke: C.limeLine, fontSize: 9 }),
  ]),
  R("HeaderRule", 24, 56, 294, 1, { fill: C.glass06 }),
  E("Ring", 125, 86, 92, 92, { fill: C.clear, stroke: C.lime, strokeWeight: 5 }),
  T("RingIcon", "\u2726", 125, 104, 92, { fontFamily: font("inter"), fontSize: 17, fill: C.lime, textAlign: "center" }),
  T("RingPct", "100%", 125, 128, 92, { fontFamily: font("inter"), fontSize: 9, fontStyle: "bold", fill: C.lime, textAlign: "center" }),
  T("Ready", "You\u2019re all set,", 24, 196, 294, { fontFamily: font("space-grotesk"), fontSize: 22, fontStyle: "bold", fill: C.white, textAlign: "center" }),
  T("ReadySub", "Your prep is tailored to your goal \u2014 let\u2019s make it count.", 24, 230, 294, {
    fontFamily: font("inter"), fontSize: 11, fill: C.muted, textAlign: "center", lineHeight: "150%",
  }),
  ...chipNodes,
  T("FootL", "PROFILE READY", 24, 340, 160, { fontFamily: font("inter"), fontSize: 9, fontStyle: "bold", fill: C.muted, letterSpacing: "14%" }),
  T("FootR", "STREAKS UNLOCKED", 168, 340, 150, { fontFamily: font("inter"), fontSize: 9, fontStyle: "bold", fill: C.lime, letterSpacing: "14%", textAlign: "right" }),
]);

/* ------------------------------------------------------------ 2 · Stats --- */

const STATS = [
  ["Accuracy", "85%", C.emerald, "+4%"],
  ["Questions", "2,100", C.cyan, "+23"],
  ["Percentile", "68%ile", C.violet, "Top 8%"],
  ["Speed", "72s avg", C.amber, "-2s"],
];
const statTile = (label, value, color, trend, x, y) =>
  Fr(`Tile/${label}`, x, y, 150, 84, { fill: C.glassBg, cornerRadius: 16, stroke: C.glass06, strokeWeight: 1 }, [
    tile("Icon", 12, 12, 32, 10, color + "1F", "\u25CE", color, 14),
    pill("Trend", 92, 14, 46, 18, C.glass06, trend, C.soft, { fontSize: 8 }),
    T("Value", value, 12, 46, 126, { fontFamily: font("space-grotesk"), fontSize: 18, fontStyle: "bold", fill: C.white }),
    T("Label", label, 12, 70, 126, { fontFamily: font("inter"), fontSize: 9, fill: C.muted }),
  ]);

const statsCard = Fr("Card/YourStats", 0, CARD_Y, CAP_W, 321, gradient("#C8FF5A0A", C.glassBg), [
  Grp("Header", 16, 16, 310, 36, [
    tile("Icon", 0, 0, 36, 12, C.limeTint, "\u2197", C.lime, 15),
    T("H1", "YOUR STATS", 46, 2, 150, { fontFamily: font("inter"), fontSize: 11, fontStyle: "bold", fill: C.white }),
    T("H2", "This week", 46, 20, 150, { fontFamily: font("inter"), fontSize: 9, fill: C.muted }),
    pill("Details", 234, 6, 76, 24, C.glassBg, "Details \u2197", C.slate, { fontSize: 10 }),
  ]),
  statTile(...STATS[0], 16, 64),
  statTile(...STATS[1], 176, 64),
  statTile(...STATS[2], 16, 158),
  statTile(...STATS[3], 176, 158),
]);

/* ----------------------------------------------------------- 3 · Habits --- */

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DONE = [true, true, true, false, true, true, false];
const dayRow = DAYS.map((d, i) => {
  const props = { fill: DONE[i] ? C.emerald : C.glassBg, cornerRadius: 14 };
  if (!DONE[i]) {
    props.stroke = C.glass06;
    props.strokeWeight = 1;
  }
  return Fr(`Day/${i}`, 16 + i * 47, 74, 28, 28, props, [
    TC("T", d, 0, 0, 28, 28, {
      fontFamily: font("jetbrains-mono"),
      fontSize: 10,
      fontStyle: "bold",
      fill: DONE[i] ? C.onLime : "#4D5552",
    }),
  ]);
});

const habitsCard = Fr("Card/ThisWeek", 0, CARD_Y, CAP_W, 424, gradient(C.emeraldTint, C.glassBg), [
  Grp("Header", 16, 16, 310, 40, [
    tile("Icon", 0, 0, 40, 12, "#34D3991F", "\u25B2", C.emerald, 16),
    T("Label", "THIS WEEK", 54, 4, 160, { fontFamily: font("inter"), fontSize: 10, fontStyle: "bold", fill: C.emerald, letterSpacing: "18%" }),
    T("Count", "\u25CF 3 day", 214, 12, 96, { fontFamily: font("inter"), fontSize: 13, fontStyle: "bold", fill: C.emerald, textAlign: "right" }),
  ]),
  ...dayRow,
  R("Rule", 16, 118, 310, 1, { fill: C.glass06 }),
  T("HabitLabel", "DAILY HABITS", 16, 130, 200, { fontFamily: font("inter"), fontSize: 10, fontStyle: "bold", fill: C.emerald, letterSpacing: "18%" }),
  T("HabitTitle", "Build consistency", 16, 148, 300, { fontFamily: font("space-grotesk"), fontSize: 22, fontStyle: "bold", fill: C.white }),
  E("Ring", 16, 190, 76, 76, { fill: C.glassBg, stroke: C.glass06, strokeWeight: 5 }),
  T("RingNum", "3", 16, 200, 76, { fontFamily: font("space-grotesk"), fontSize: 20, fontStyle: "bold", fill: C.white, textAlign: "center" }),
  T("RingDen", "/ 5", 16, 224, 76, { fontFamily: font("inter"), fontSize: 9, fontStyle: "bold", fill: C.muted, textAlign: "center" }),
  tile("RowIcon1", 112, 194, 28, 9, C.glass06, "\u25B2", C.emerald, 13),
  T("RowT1", "3 day streak", 148, 196, 178, { fontFamily: font("inter"), fontSize: 12, fontStyle: "bold", fill: C.white }),
  T("RowS1", "Best 5 days", 148, 212, 178, { fontFamily: font("inter"), fontSize: 10, fill: C.muted }),
  tile("RowIcon2", 112, 240, 28, 9, C.glass06, "\u25CE", C.emerald, 13),
  T("RowT2", "Completion", 148, 242, 110, { fontFamily: font("inter"), fontSize: 12, fontStyle: "bold", fill: C.white }),
  T("RowP2", "78%", 258, 242, 68, { fontFamily: font("inter"), fontSize: 12, fontStyle: "bold", fill: C.emerald, textAlign: "right" }),
  R("BarTrack", 148, 262, 178, 4, { fill: C.glass10, cornerRadius: 2 }),
  R("BarFill", 148, 262, 139, 4, { fill: C.emerald, cornerRadius: 2 }),
  pill("Chip1", 16, 300, 62, 20, C.glassBg, "Sprint", "#CCCCCC", { stroke: C.glass06, fontSize: 9 }),
  pill("Chip2", 84, 300, 70, 20, C.glassBg, "Practice", "#CCCCCC", { stroke: C.glass06, fontSize: 9 }),
  pill("Chip3", 160, 300, 50, 20, C.glassBg, "Read", "#CCCCCC", { stroke: C.glass06, fontSize: 9 }),
  T("ChipMore", "+2", 216, 304, 24, { fontFamily: font("inter"), fontSize: 9, fontStyle: "bold", fill: "#CCCCCC" }),
  Fr("ViewBtn", 16, 336, 310, 44, { fill: C.emerald, cornerRadius: 22 }, [
    TC("Label", "VIEW HABITS  \u2197", 0, 0, 310, 44, { fontFamily: font("inter"), fontSize: 13, fontStyle: "bold", fill: C.onLime }),
  ]),
]);

/* -------------------------------------------------- 4 · Practice + Technique --- */

const actionCard = (name, y, h, accent, tint, accent2, label, title, desc, cta) =>
  Fr(name, 12, y, 318, h, gradient(tint, C.glassBg), [
    Grp("Top", 12, 10, 294, 36, [
      tile("Icon", 0, 0, 36, 12, tint, accent === C.cyan ? "\u25B6" : "\u25A0", accent, 14),
      T("Label", label, 46, 12, 220, { fontFamily: font("inter"), fontSize: 9, fontStyle: "bold", fill: accent, letterSpacing: "18%" }),
    ]),
    T("Title", title, 12, 52, 294, { fontFamily: font("space-grotesk"), fontSize: 16, fontStyle: "bold", fill: C.white }),
    T("Desc", desc, 12, 78, 294, { fontFamily: font("inter"), fontSize: 11, fill: C.muted }),
    Fr("Cta", 12, h - 42, 294, 30, { fills: [{ type: "linearGradient", stops: [accent, accent2] }], cornerRadius: 15 }, [
      TC("Label", cta, 0, 0, 294, 30, { fontFamily: font("inter"), fontSize: 11, fontStyle: "bold", fill: C.onLime }),
    ]),
  ]);

const practiceCard = Fr("Card/PracticeTechnique", 0, CARD_Y, CAP_W, 313, { fill: C.glassBg, cornerRadius: 24, stroke: C.glass06, strokeWeight: 1 }, [
  actionCard("Action/Practice", 12, 140, C.cyan, C.cyanTint, C.cyan, "PRACTICE MODE", "Master with templates", "Guided exercises \u00B7 Build speed & accuracy", "PRACTICE NOW"),
  actionCard("Action/Technique", 162, 139, C.amber, C.amberTint, C.amber, "TECHNIQUE LIBRARY", "Learn a technique", "Browse core methods \u00B7 Master each approach", "EXPLORE TECHNIQUES"),
]);

/* ------------------------------------------------------ 5 · Readiness --- */

const readinessCard = Fr("Card/Readiness", 0, CARD_Y, CAP_W, 405, gradient(C.cyanTint, C.glassBg), [
  Grp("Progress", 20, 20, 302, 210, [
    Grp("Head", 0, 0, 302, 36, [
      tile("Icon", 0, 0, 36, 12, C.limeTint, "\u25B2", C.lime, 15),
      T("Label", "YOUR PROGRESS", 48, 12, 190, { fontFamily: font("inter"), fontSize: 10, fontStyle: "bold", fill: C.muted, letterSpacing: "16%" }),
      pill("Preps", 244, 6, 58, 22, C.limeTint, "1 prep", C.lime, { fontSize: 9 }),
    ]),
    E("Ring", 0, 48, 92, 92, { fill: C.glassBg, stroke: C.lime, strokeWeight: 6 }),
    T("RingPct", "84%", 0, 76, 92, { fontFamily: font("space-grotesk"), fontSize: 20, fontStyle: "bold", fill: C.white, textAlign: "center" }),
    T("RingCap", "ready", 0, 100, 92, { fontFamily: font("inter"), fontSize: 8, fontStyle: "bold", fill: C.muted, textAlign: "center" }),
    T("K1", "CURRICULUM PREPAREDNESS", 108, 52, 194, { fontFamily: font("inter"), fontSize: 10, fontStyle: "bold", fill: C.muted, letterSpacing: "10%" }),
    T("K2", "You\u2019ve covered 2 of 5 topics expected for CAT.", 108, 72, 194, {
      fontFamily: font("inter"), fontSize: 12, fill: "#E5E5E5", lineHeight: "140%",
    }),
    pill("OnTrack", 108, 118, 84, 22, C.limeTint, "\u25CF On track", C.lime, { stroke: C.limeLine, fontSize: 9 }),
    Fr("ExamRow", 0, 156, 302, 42, { fill: C.glassBg, cornerRadius: 16, stroke: C.glass06, strokeWeight: 1 }, [
      tile("Icon", 12, 9, 24, 8, C.limeTint, "\u25CF", C.lime, 11),
      T("Date", "Exam Sep 12, 2026", 46, 14, 200, { fontFamily: font("inter"), fontSize: 12, fontStyle: "bold", fill: C.white }),
      T("Edit", "\u270E", 274, 13, 20, { fontFamily: font("inter"), fontSize: 13, fill: "#5A5A5A", textAlign: "right" }),
    ]),
  ]),
  R("Rule", 0, 250, CAP_W, 1, { fill: C.glass06 }),
  T("BigDays", "38", 0, 276, CAP_W, { fontFamily: font("space-grotesk"), fontSize: 48, fontStyle: "bold", fill: C.white, textAlign: "center" }),
  T("BigCap", "REMAINING FOR CAT", 0, 336, CAP_W, { fontFamily: font("inter"), fontSize: 11, fontStyle: "bold", fill: C.muted, letterSpacing: "28%", textAlign: "center" }),
  T("BigSub", "132h of focused practice", 0, 358, CAP_W, { fontFamily: font("inter"), fontSize: 12, fill: C.lime, textAlign: "center" }),
]);

/* ---------------------------------------------------------- assemble --- */

function gradient(...stops) {
  return { fills: [{ type: "linearGradient", stops }] };
}

const CAPTIONS = [
  "1 \u00B7 Profile status",
  "2 \u00B7 Your stats",
  "3 \u00B7 This week + habits",
  "4 \u00B7 Practice + technique",
  "5 \u00B7 Readiness",
];
const CARDS = [profileCard, statsCard, habitsCard, practiceCard, readinessCard];
const HEIGHTS = [366, 321, 424, 313, 405];

const column = (i) => {
  const x = 36 + i * 366;
  return [
    T(`Caption/${i + 1}`, CAPTIONS[i], x, 64, 250, { fontFamily: font("jetbrains-mono"), fontSize: 10, fill: C.lime }),
    T(`Height/${i + 1}`, `${HEIGHTS[i]}px`, x + 262, 64, 80, { fontFamily: font("jetbrains-mono"), fontSize: 10, fill: C.muted, textAlign: "right" }),
    { ...CARDS[i], x, y: CARD_Y },
  ];
};

const frame = Fr("Dashboard \u00B7 Carousel cards", 2350, 0, 1878, 560, { fill: C.bg, clip: true }, [
  T("FrameTitle", "Dashboard \u00B7 Carousel cards (shortened)", 36, 22, 900, {
    fontFamily: font("space-grotesk"), fontSize: 18, fontStyle: "bold", fill: C.white,
  }),
  T("FrameSub", "Outer cards sized to their content \u2014 dead space removed. Heights from the app at a 390px viewport.", 36, 46, 1200, {
    fontFamily: font("inter"), fontSize: 12, fill: C.muted,
  }),
  ...column(0),
  ...column(1),
  ...column(2),
  ...column(3),
  ...column(4),
]);

add(frame, null);

const out = fileURLToPath(new URL("./cards-script.json", import.meta.url));
writeFileSync(out, JSON.stringify(steps, null, 2) + "\n");
console.log(`wrote ${out} (${steps.length} steps)`);
