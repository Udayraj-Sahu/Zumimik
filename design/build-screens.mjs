// Generates design/screens-script.json — faithful mockups of the real Zuzumik
// screens, built from the actual components/tokens in src/.
// Run: node design/build-screens.mjs
// Then: figcraft-cli run design/screens-script.json --out design/zuzumik-app.figcraft

import { writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/* Colours taken from src/app/globals.css + src/lib/theme-tokens.ts (dark / lime). */
const C = {
  bg: "#0A0C0A",
  panel: "#10140E",
  panel2: "#141A12",
  border: "#FFFFFF14",
  borderSoft: "#FFFFFF0A",
  white: "#FFFFFF",
  white06: "#FFFFFF0F",
  white08: "#FFFFFF14",
  white10: "#FFFFFF1A",
  muted: "#8B8B8B",
  slate: "#9CA3AF",
  lime: "#C8FF5A",
  lime06: "#C8FF5A0F",
  lime10: "#C8FF5A1A",
  lime12: "#C8FF5A1F",
  lime20: "#C8FF5A33",
  lime30: "#C8FF5A4D",
  lime40: "#C8FF5A66",
  lime99: "#C8FF5AFC",
  ctaFrom: "#C7F252",
  ctaTo: "#A8D43A",
  onAccent: "#0A0C0A",
  emerald: "#34D399",
  emerald10: "#34D3991F",
  emerald20: "#34D39933",
  cyan: "#22D3EE",
  cyan10: "#22D3EE1F",
  amber: "#FBBF24",
  amber10: "#FBBF241F",
  amber20: "#FBBF2433",
  yellow: "#FACC15",
  violet: "#A78BFA",
  violet10: "#A78BFA1F",
  purple: "#8B5CF6",
  blue: "#3B82F6",
  orange: "#FF6B35",
  red: "#EF4444",
  silver: "#C0C4CC",
  bronze: "#CD7F32",
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
const R = (name, x, y, w, h, props) => ({ type: "rectangle", name, x, y, width: w, height: h, props });
const E = (name, x, y, w, h, props) => ({ type: "ellipse", name, x, y, width: w, height: h, props });
const V = (name, x, y, w, h, path, props) => ({ type: "vector", name, x, y, width: w, height: h, path, props });
const Fr = (name, x, y, w, h, props, children) => ({ type: "frame", name, x, y, width: w, height: h, props, children });

const TC = (name, text, x, y, w, h, props = {}) =>
  T(name, text, x, y + Math.round((h - (props.fontSize || 14) * 1.25) / 2), w, {
    textAlign: "center",
    ...props,
  });

const glyph = (name, x, y, size, ch, color, fontSize) =>
  T(name, ch, x, y + Math.round((size - fontSize * 1.2) / 2), size, {
    fontFamily: F.body,
    fontSize,
    fill: color,
    textAlign: "center",
  });

const card = (name, x, y, w, h, radius, children, fill = C.panel, stroke = C.border) =>
  Fr(name, x, y, w, h, { fill, cornerRadius: radius, stroke, strokeWeight: 1 }, children);

const cta = (name, x, y, w, h, text, fontSize = 14) =>
  Fr(name, x, y, w, h, { fills: [{ type: "linearGradient", stops: [C.ctaFrom, C.ctaTo] }], cornerRadius: 14 }, [
    TC("Label", text, 0, 0, w, h, { fontFamily: F.head, fontSize, fontStyle: "bold", fill: C.onAccent }),
  ]);

const statusBar = () =>
  Fr("StatusBar", 0, 0, 390, 34, {}, [
    T("Time", "9:41", 22, 8, 60, { fontFamily: F.body, fontSize: 13, fontStyle: "bold", fill: C.white }),
    R("Signal", 300, 12, 16, 10, { fill: C.white, cornerRadius: 2 }),
    R("Wifi", 322, 12, 14, 10, { fill: C.white, cornerRadius: 2 }),
    R("Battery", 342, 11, 24, 12, { fill: C.border, cornerRadius: 3, stroke: C.white, strokeWeight: 1 }),
  ]);

const bottomNav = (active) => {
  const items = [
    ["⌂", "Home"],
    ["▤", "Learn"],
    ["⚡", "Play"],
    ["⚙", "Settings"],
  ];
  const kids = items.map(([g, label], i) => {
    const on = label === active;
    const x = 26 + i * 86;
    return Fr(`Nav/${label}`, x, 10, 74, 44, {}, [
      glyph(`Icon`, 0, 2, 74, g, on ? C.lime : "#8B8B8B80", 18),
      TC("Label", label, 0, 26, 74, 16, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: on ? C.lime : "#8B8B8B80" }),
    ]);
  });
  return Fr(
    "BottomNav",
    20,
    772,
    350,
    64,
    { fill: "#0A0C0AE6", cornerRadius: 32, stroke: C.white08, strokeWeight: 1 },
    kids,
  );
};

const screen = (name, x, children, w = 390) => Fr(name, x, 0, w, 844, { fill: C.bg, clip: true }, children);

const label = (text, x) =>
  T(`Label/${text}`, text.toUpperCase(), x, -46, 390, {
    fontFamily: F.mono,
    fontSize: 12,
    fill: C.lime,
  });

/* ------------------------------------------------------------- 1 ONBOARDING */
const onboarding = screen("01 · Onboarding", 0, [
  statusBar(),
  E("Glow", 55, 150, 280, 280, { fill: C.lime06, opacity: 0.7 }),
  R("BrandTile", 163, 214, 64, 64, { fill: C.lime10, cornerRadius: 18, stroke: C.lime20, strokeWeight: 1 }),
  glyph("BrandGlyph", 163, 214, 64, "⚔", C.lime, 28),
  TC("Brand", "ZUZUMIK", 40, 300, 310, 40, {
    fontFamily: F.head,
    fontSize: 28,
    fontStyle: "bold",
    fill: C.white,
    letterSpacing: 3.5,
  }),
  R("RuleL", 120, 354, 24, 1, { fill: C.lime30 }),
  TC("Sub", "ARENA OF CHAMPIONS", 148, 346, 94, 16, {
    fontFamily: F.body,
    fontSize: 9,
    fontStyle: "bold",
    fill: C.lime99,
    letterSpacing: 2,
  }),
  R("RuleR", 246, 354, 24, 1, { fill: C.lime30 }),
  TC("Tagline", "Not a coaching app.\nA battle arena for your brain.", 40, 396, 310, 46, {
    fontFamily: F.body,
    fontSize: 14,
    fill: "#8B8B8BB3",
    lineHeight: 1.5,
  }),
  ...["Speed Drills|REFLEX|" + C.lime, "Smart Sprints|ADAPTIVE|" + C.cyan, "Live Rankings|RANKED|" + C.yellow].map(
    (row, i) => {
      const [name, tag, accent] = row.split("|");
      return card(`Feat/${name}`, 40, 470 + i * 54, 310, 44, 14, [
        E("Dot", 16, 18, 8, 8, { fill: accent }),
        TC("Name", name, 34, 0, 180, 44, { fontFamily: F.body, fontSize: 14, fontStyle: "bold", fill: C.white }),
        TC("Tag", tag, 224, 0, 70, 44, {
          fontFamily: F.mono,
          fontSize: 9,
          fill: accent,
          textAlign: "right",
        }),
      ]);
    },
  ),
  cta("Enter", 32, 660, 326, 52, "ENTER THE ARENA", 15),
  TC("Login", "Already have an account?  Log in", 40, 728, 310, 18, {
    fontFamily: F.body,
    fontSize: 12,
    fill: C.muted,
  }),
  TC("Foot", "Zuzumik · v1.0", 40, 800, 310, 16, { fontFamily: F.mono, fontSize: 10, fill: "#9CA3AF80" }),
]);

/* ----------------------------------------------------------------- 2 AUTH */
const auth = screen("02 · Auth (Web Login)", 430, [
  statusBar(),
  R("LogoTile", 167, 148, 56, 56, { fill: C.lime10, cornerRadius: 16, stroke: C.lime20, strokeWeight: 1 }),
  glyph("LogoGlyph", 167, 148, 56, "⚔", C.lime, 24),
  TC("Brand", "ZUZUMIK", 40, 220, 310, 34, {
    fontFamily: F.head,
    fontSize: 24,
    fontStyle: "bold",
    fill: C.white,
    letterSpacing: 3,
  }),
  R("RuleL", 126, 272, 24, 1, { fill: C.lime30 }),
  TC("Sub", "WEB LOGIN", 152, 264, 86, 16, {
    fontFamily: F.body,
    fontSize: 9,
    fontStyle: "bold",
    fill: C.lime99,
    letterSpacing: 2,
  }),
  R("RuleR", 240, 272, 24, 1, { fill: C.lime30 }),
  card("PairCard", 28, 300, 334, 306, 24, [
    TC("Title", "PAIR YOUR DEVICE", 0, 22, 334, 16, {
      fontFamily: F.body,
      fontSize: 11,
      fontStyle: "bold",
      fill: C.slate,
      letterSpacing: 1.5,
    }),
    R("QR", 105, 52, 124, 124, { fill: C.white, cornerRadius: 14 }),
    R("QR/a", 121, 68, 30, 30, { fill: C.onAccent }),
    R("QR/b", 183, 68, 30, 30, { fill: C.onAccent }),
    R("QR/c", 121, 130, 30, 30, { fill: C.onAccent }),
    R("QR/d", 174, 122, 20, 20, { fill: C.onAccent }),
    R("QR/e", 158, 154, 14, 14, { fill: C.onAccent }),
    TC("ScanHint", "SCAN WITH THE MOBILE APP", 0, 190, 334, 16, {
      fontFamily: F.body,
      fontSize: 12,
      fontStyle: "bold",
      fill: C.white,
    }),
    TC("Code", "4 8 2 — 9 1 7", 0, 212, 334, 30, {
      fontFamily: F.mono,
      fontSize: 22,
      fontStyle: "bold",
      fill: C.lime,
      letterSpacing: 2,
    }),
    TC("Expiry", "Code expires in 04:58", 0, 248, 334, 16, {
      fontFamily: F.mono,
      fontSize: 11,
      fill: C.muted,
    }),
  ]),
  cta("Continue", 28, 640, 334, 52, "CONTINUE IN BROWSER", 14),
  TC("Alt", "Trouble pairing?  Generate new code", 40, 708, 310, 18, {
    fontFamily: F.body,
    fontSize: 12,
    fill: C.muted,
  }),
  TC("Foot", "Secure device handshake", 40, 796, 310, 16, { fontFamily: F.mono, fontSize: 10, fill: "#9CA3AF80" }),
]);

/* ------------------------------------------------------------ 3 DASHBOARD */
const statCard = (name, x, y, val, unit, cap, accent) =>
  card(name, x, y, 167, 74, 18, [
    TC("Cap", cap, 16, 10, 135, 14, {
      fontFamily: F.body,
      fontSize: 10,
      fill: C.slate,
      letterSpacing: 1,
      textAlign: "left",
    }),
    T("Val", val, 16, 28, 100, { fontFamily: F.head, fontSize: 24, fontStyle: "bold", fill: C.white }),
    T("Unit", unit, 16 + val.length * 15, 38, 50, { fontFamily: F.body, fontSize: 11, fill: accent }),
  ]);

const dashboard = screen("03 · Dashboard", 860, [
  statusBar(),
  T("Greeting", "GOOD EVENING", 22, 44, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  T("Name", "Operative", 22, 60, 220, { fontFamily: F.head, fontSize: 24, fontStyle: "bold", fill: C.white }),
  card("StreakPill", 190, 46, 88, 26, 13, [
    TC("T", "12 DAY", 0, 0, 88, 26, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.orange }),
  ], C.amber10, C.amber20),
  card("XpPill", 286, 46, 82, 26, 13, [
    TC("T", "2,340 XP", 0, 0, 82, 26, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.lime }),
  ], C.lime12, C.lime20),
  card("Hero", 20, 96, 350, 152, 24, [
    T("Tier", "CAT · CHAMPION TIER", 20, 18, 220, {
      fontFamily: F.body,
      fontSize: 10,
      fontStyle: "bold",
      fill: C.lime,
      letterSpacing: 1.5,
    }),
    T("Big", "68", 20, 40, 90, { fontFamily: F.head, fontSize: 40, fontStyle: "bold", fill: C.lime }),
    T("Pct", "th %ILE", 66, 60, 80, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
    T("Sub", "Predicted percentile · last 20 sprints", 20, 88, 310, {
      fontFamily: F.body,
      fontSize: 11,
      fill: C.slate,
    }),
    R("Track", 20, 112, 310, 6, { fill: C.white08, cornerRadius: 3 }),
    R("Fill", 20, 112, 211, 6, { fill: C.lime, cornerRadius: 3 }),
    E("Dot1", 168, 130, 6, 6, { fill: C.lime }),
    E("Dot2", 184, 130, 6, 6, { fill: C.white10 }),
    E("Dot3", 200, 130, 6, 6, { fill: C.white10 }),
  ]),
  T("StatsH", "YOUR STATS", 22, 266, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  statCard("Stat/Accuracy", 20, 288, "85", "%", "ACCURACY", C.lime),
  statCard("Stat/Questions", 203, 288, "2,100", "", "QUESTIONS", C.cyan),
  statCard("Stat/Speed", 20, 370, "72", "%", "SPEED", C.amber),
  statCard("Stat/Percentile", 203, 370, "68", "th", "PERCENTILE", C.violet),
  T("WeekH", "THIS WEEK", 22, 462, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  card("Week", 20, 484, 350, 104, 20, [
    ...["M", "T", "W", "T", "F", "S", "S"].map((d, i) =>
      Fr(`Day/${i}`, 16 + i * 46, 16, 34, 56, {}, [
        R("Dot", 5, 0, 24, 24, {
          fill: i < 5 ? C.lime : C.white06,
          cornerRadius: 8,
          stroke: i < 5 ? C.lime : C.border,
          strokeWeight: 1,
        }),
        glyph("Chk", 0, 0, 34, i < 5 ? "✓" : "·", i < 5 ? C.onAccent : C.muted, 12),
        TC("D", ["M", "T", "W", "T", "F", "S", "S"][i], 0, 28, 34, 14, {
          fontFamily: F.body,
          fontSize: 9,
          fill: C.slate,
        }),
      ]),
    ),
    TC("Cap", "5 of 7 days trained", 16, 78, 200, 16, {
      fontFamily: F.body,
      fontSize: 11,
      fill: C.muted,
      textAlign: "left",
    }),
  ]),
  T("QuickH", "QUICK ACCESS", 22, 606, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  ...[["Practice", "▤"], ["Sprint", "⚡"], ["History", "⏱"], ["Rank", "★"]].map(([n, g], i) =>
    card(`Quick/${n}`, 20 + i * 88, 628, 80, 80, 18, [
      glyph("G", 0, 12, 80, g, C.lime, 20),
      TC("N", n, 0, 52, 80, 16, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.white }),
    ]),
  ),
  bottomNav("Home"),
]);

/* ------------------------------------------------------------- 4 ANALYTICS */
const radarCenter = { x: 175, y: 128, r: 58 };
const radarPoint = (i, frac) => {
  const a = (-90 + i * 60) * (Math.PI / 180);
  return [radarCenter.x + radarCenter.r * frac * Math.cos(a), radarCenter.y + radarCenter.r * frac * Math.sin(a)];
};
const poly = (fracs) => fracs.map((f, i) => radarPoint(i, f).map((n) => n.toFixed(1)).join(",")).join(" ");
const hexPath = (frac) => {
  const pts = [0, 1, 2, 3, 4, 5].map((i) => radarPoint(i, frac));
  return `M${pts.map((p) => p.join(",")).join(" L")} Z`;
};

const analytics = screen("04 · Analytics", 1290, [
  statusBar(),
  T("Title", "ANALYTICS", 22, 48, 220, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.white }),
  T("Sub", "Last 30 days", 22, 76, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
  card("Trend", 20, 104, 350, 178, 22, [
    T("T", "ACCURACY TREND", 18, 16, 200, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1.5 }),
    T("V", "85%", 260, 12, 72, { fontFamily: F.head, fontSize: 18, fontStyle: "bold", fill: C.lime, textAlign: "right" }),
    ...[38, 52, 44, 61, 55, 72, 68, 85].map((v, i) =>
      R(`Bar/${i}`, 22 + i * 39, 150 - v, 22, v, {
        fill: i > 5 ? C.lime : C.white08,
        cornerRadius: 4,
      }),
    ),
  ]),
  card("Radar", 20, 296, 350, 216, 22, [
    T("T", "SKILL RADAR", 18, 16, 200, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1.5 }),
    V("HexOuter", 0, 0, 350, 216, hexPath(1), { fill: C.white06, stroke: C.white08, strokeWeight: 1 }),
    V("HexMid", 0, 0, 350, 216, hexPath(0.5), { fill: C.white06, stroke: C.white06, strokeWeight: 1 }),
    V("Data", 0, 0, 350, 216, `M${poly([0.9, 0.75, 0.7, 0.8, 0.72, 0.85]).split(" ").join(" L")} Z`, {
      fill: C.lime20,
      stroke: C.lime,
      strokeWeight: 2,
    }),
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const p = radarPoint(i, 1.45);
      const names = ["Speed", "Logic", "Stamina", "Focus", "Memory", "Reflex"];
      return TC(`Axis/${i}`, names[i], p[0] - 40, p[1] - 8, 80, 16, {
        fontFamily: F.body,
        fontSize: 9,
        fill: C.muted,
      });
    }),
  ]),
  card("Metric/Delay", 20, 528, 167, 74, 18, [
    T("C", "ACTION DELAY", 14, 14, 140, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1 }),
    T("V", "142ms", 16, 32, 120, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.cyan }),
  ]),
  card("Metric/Focus", 203, 528, 167, 74, 18, [
    T("C", "FOCUS DENSITY", 16, 16, 140, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1 }),
    T("V", "89%", 16, 36, 100, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.lime }),
  ]),
  T("TopicH", "TOPIC MASTERY", 22, 620, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  ...[
    ["Quantitative", 92, C.lime],
    ["Logical Reasoning", 78, C.cyan],
    ["Data Interpretation", 85, C.emerald],
  ].map(([n, pct, ac], i) =>
    Fr(`Topic/${n}`, 20, 642 + i * 56, 350, 48, {}, [
      T("N", n, 4, 2, 240, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.white }),
      T("P", `${pct}%`, 286, 2, 60, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: ac, textAlign: "right" }),
      R("Track", 4, 24, 342, 6, { fill: C.white08, cornerRadius: 3 }),
      R("Fill", 4, 24, Math.round(342 * (pct / 100)), 6, { fill: ac, cornerRadius: 3 }),
    ]),
  ),
  bottomNav("Home"),
]);

/* ------------------------------------------------------------------ 5 PLAY */
const tabPill = (name, x, label, accent, active) =>
  card(name, x, 96, 84, 36, 12, [
    TC("T", label, 0, 0, 84, 36, {
      fontFamily: F.body,
      fontSize: 12,
      fontStyle: "bold",
      fill: active ? accent : C.slate,
    }),
  ], active ? C.lime10 : C.white06, active ? C.lime20 : C.borderSoft);

const modeCard = (name, y, title, sub, tag, accent, badge) =>
  card(name, 20, y, 350, 120, 22, [
    R("Accent", 0, 20, 4, 80, { fill: accent, cornerRadius: 2 }),
    R("Icon", 24, 26, 40, 40, { fill: C.white06, cornerRadius: 12 }),
    glyph("IconG", 24, 26, 40, "⚡", accent, 18),
    T("Title", title, 76, 30, 220, { fontFamily: F.head, fontSize: 16, fontStyle: "bold", fill: C.white }),
    T("Sub", sub, 76, 54, 240, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
    T("Tags", tag, 76, 78, 240, { fontFamily: F.mono, fontSize: 10, fill: accent }),
    ...(badge
      ? [card("Badge", 312, 18, 26, 20, 10, [
          TC("T", badge, 0, 0, 26, 20, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.onAccent }),
        ], C.lime, C.lime)]
      : []),
    TC("Chev", "›", 316, 0, 24, 120, { fontFamily: F.body, fontSize: 22, fill: C.slate }),
  ]);

const play = screen("05 · Play Hub", 1720, [
  statusBar(),
  T("Title", "PLAY", 22, 48, 220, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.white }),
  T("Sub", "CHOOSE YOUR BATTLE", 22, 76, 220, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  tabPill("Tab/Math", 20, "Math", C.amber, true),
  tabPill("Tab/Puzzle", 110, "Puzzle", C.lime, false),
  tabPill("Tab/Memory", 200, "Memory", C.blue, false),
  tabPill("Tab/Logic", 290, "Logic", C.purple, false),
  T("ModesH", "MATH MODES", 22, 154, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  modeCard("Mode/Sprint", 176, "SPRINT DUELS", "10 questions · 90s each", "Quant · LRDI", C.amber, null),
  modeCard("Mode/FastFirst", 312, "FAST & FIRST DUELS", "Head-to-head · live", "Ranked PvP", C.lime, "2P"),
  T("ContinueH", "CONTINUE", 22, 452, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  card("Continue", 20, 474, 350, 84, 18, [
    T("N", "LR Sprint", 20, 16, 240, { fontFamily: F.body, fontSize: 14, fontStyle: "bold", fill: C.white }),
    T("M", "22/25 · 2h ago", 20, 38, 240, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
    R("Track", 20, 62, 310, 6, { fill: C.white08, cornerRadius: 3 }),
    R("Fill", 20, 62, 273, 6, { fill: C.lime, cornerRadius: 3 }),
  ]),
  bottomNav("Play"),
]);

/* ---------------------------------------------------------------- 6 SPRINT */
const option = (name, y, letter, text, state) =>
  card(name, 20, y, 350, 56, 14, [
    R("Key", 12, 14, 28, 28, { fill: state === "sel" ? C.lime : C.white06, cornerRadius: 8 }),
    TC("KeyT", letter, 12, 14, 28, 28, {
      fontFamily: F.body,
      fontSize: 12,
      fontStyle: "bold",
      fill: state === "sel" ? C.onAccent : C.slate,
    }),
    TC("Text", text, 52, 0, 280, 56, { fontFamily: F.body, fontSize: 13, fill: C.white, textAlign: "left" }),
  ], state === "sel" ? C.lime10 : C.panel, state === "sel" ? C.lime40 : C.border);

const sprint = screen("06 · Sprint (Quiz)", 2150, [
  statusBar(),
  TC("Exit", "EXIT", 20, 44, 60, 22, { fontFamily: F.body, fontSize: 11, fontStyle: "bold", fill: C.muted, textAlign: "left" }),
  card("Pill", 150, 42, 90, 26, 13, [
    TC("T", "SPRINT", 0, 0, 90, 26, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.lime, letterSpacing: 1 }),
  ], C.lime12, C.lime20),
  T("Timer", "04:32", 300, 46, 70, { fontFamily: F.mono, fontSize: 14, fontStyle: "bold", fill: C.white, textAlign: "right" }),
  R("Track", 20, 92, 350, 6, { fill: C.white08, cornerRadius: 3 }),
  R("Fill", 20, 92, 140, 6, { fill: C.lime, cornerRadius: 3 }),
  T("Prog", "QUESTION 4 / 10", 22, 106, 200, { fontFamily: F.mono, fontSize: 11, fill: C.slate }),
  card("Question", 20, 132, 350, 150, 22, [
    T("Cat", "QUANTITATIVE APTITUDE", 20, 18, 240, { fontFamily: F.body, fontSize: 10, fill: C.cyan, letterSpacing: 1.5 }),
    T(
      "Q",
      "A train covers 360 km in 4 hours. If it increases its speed by 15 km/h, how long will it take to cover the same distance?",
      20,
      44,
      310,
      { fontFamily: F.body, fontSize: 16, fontStyle: "bold", fill: C.white, lineHeight: 1.4 },
    ),
  ]),
  option("Opt/A", 300, "A", "3h 30m", "idle"),
  option("Opt/B", 364, "B", "3h 45m", "idle"),
  option("Opt/C", 428, "C", "3h 20m", "sel"),
  option("Opt/D", 492, "D", "4h 00m", "idle"),
  card("Feedback", 20, 562, 350, 44, 12, [
    TC("T", "✓  Correct  ·  +120 XP", 0, 0, 350, 44, { fontFamily: F.body, fontSize: 13, fontStyle: "bold", fill: C.emerald }),
  ], C.emerald10, C.emerald20),
  cta("Next", 20, 700, 350, 52, "NEXT QUESTION", 14),
  TC("Skip", "Skip this question", 20, 764, 350, 18, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
]);

/* -------------------------------------------------------- 7 SPRINT RESULTS */
const statMini = (name, x, val, cap, accent) =>
  card(name, x, 214, 110, 80, 18, [
    TC("Val", val, 0, 18, 110, 28, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: accent }),
    TC("Cap", cap, 0, 48, 110, 14, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1 }),
  ]);

const results = screen("07 · Sprint Results", 2580, [
  statusBar(),
  card("Pill", 120, 46, 150, 26, 13, [
    TC("T", "SPRINT RESULTS", 0, 0, 150, 26, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.lime, letterSpacing: 1.5 }),
  ], C.lime12, C.lime20),
  E("ScoreRing", 145, 92, 100, 100, { fill: C.lime10, stroke: C.lime40, strokeWeight: 3 }),
  TC("Score", "8/10", 145, 118, 100, 34, { fontFamily: F.head, fontSize: 30, fontStyle: "bold", fill: C.lime }),
  TC("ScoreCap", "SCORE", 145, 152, 100, 14, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 2 }),
  statMini("Stat/Acc", 20, "80%", "ACCURACY", C.lime),
  statMini("Stat/Time", 140, "12.4s", "AVG TIME", C.cyan),
  statMini("Stat/Xp", 260, "+960", "XP EARNED", C.amber),
  card("Final", 20, 312, 350, 118, 20, [
    T("H", "FINAL ANSWER", 18, 16, 200, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1.5 }),
    T("Q", "Train speed problem", 18, 38, 300, { fontFamily: F.body, fontSize: 13, fontStyle: "bold", fill: C.white }),
    T("Your", "Your answer", 18, 68, 140, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
    TC("AnsY", "C", 20, 84, 40, 24, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.onAccent }),
    R("KeyY", 20, 84, 28, 24, { fill: C.lime, cornerRadius: 8 }),
    T("CorrL", "Correct", 190, 68, 100, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
    R("KeyC", 310, 82, 28, 24, { fill: C.lime, cornerRadius: 8 }),
    TC("KeyCT", "C", 310, 82, 24, 24, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.onAccent }),
  ]),
  card("RankBanner", 20, 444, 350, 60, 16, [
    T("A", "RANKED UP", 18, 12, 200, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.lime, letterSpacing: 1 }),
    T("B", "You are now in the 68th percentile", 18, 32, 300, { fontFamily: F.body, fontSize: 11, fill: C.white }),
  ], C.lime12, C.lime20),
  cta("Share", 20, 528, 350, 52, "SHARE RESULT", 14),
  card("Again", 20, 592, 350, 52, 14, [
    TC("T", "PLAY AGAIN", 0, 0, 350, 52, { fontFamily: F.head, fontSize: 14, fontStyle: "bold", fill: C.white }),
  ], C.white06, C.border),
  TC("Home", "Back to dashboard", 20, 662, 350, 18, { fontFamily: F.body, fontSize: 12, fill: C.muted }),
]);

/* -------------------------------------------------------------- 8 PRACTICE */
const drill = (name, y, title, meta, accent) =>
  card(name, 20, y, 350, 70, 18, [
    R("Icon", 14, 17, 36, 36, { fill: C.white06, cornerRadius: 10 }),
    glyph("IconG", 14, 17, 36, "▤", accent, 16),
    T("T", title, 62, 18, 240, { fontFamily: F.body, fontSize: 14, fontStyle: "bold", fill: C.white }),
    T("M", meta, 16 + 46, 40, 260, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
    TC("Chev", "›", 316, 0, 24, 80, { fontFamily: F.body, fontSize: 22, fill: C.slate }),
  ]);

const practice = screen("08 · Practice", 3010, [
  statusBar(),
  T("Title", "PRACTICE", 22, 48, 220, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.white }),
  T("Sub", "Untimed · learn mode", 22, 76, 220, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
  tabPill("Tab/Quant", 20, "Quant", C.lime, true),
  tabPill("Tab/LRDI", 110, "LRDI", C.lime, false),
  tabPill("Tab/VARC", 200, "VARC", C.lime, false),
  tabPill("Tab/GK", 290, "GK", C.lime, false),
  card("Hero", 20, 148, 350, 176, 24, [
    T("Cat", "QUANTITATIVE APTITUDE", 20, 20, 260, { fontFamily: F.body, fontSize: 11, fill: C.lime, letterSpacing: 1.5 }),
    T("Title", "Number Systems", 20, 44, 260, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.white }),
    T("Sub", "Books, videos and adaptive drills", 20, 74, 280, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
    R("Track", 20, 104, 310, 6, { fill: C.white08, cornerRadius: 3 }),
    R("Fill", 20, 104, 285, 6, { fill: C.lime, cornerRadius: 3 }),
    T("Pct", "Strength 92%", 20, 116, 200, { fontFamily: F.body, fontSize: 10, fill: C.lime }),
    cta("Start", 20, 138, 140, 30, "START DRILL", 11),
  ]),
  T("DrillH", "RECOMMENDED DRILLS", 22, 340, 260, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  drill("Drill/1", 362, "Divisibility Rules", "12 questions · Easy", C.emerald),
  drill("Drill/2", 442, "Remainders & Factors", "18 questions · Medium", C.amber),
  drill("Drill/3", 522, "LCM / HCF Sprint", "10 questions · Medium", C.cyan),
  bottomNav("Learn"),
]);

/* ----------------------------------------------------------- 9 LEADERBOARD */
const podiumCard = (name, x, y, h, rank, initials, pts, accent) =>
  card(name, x, y, 110, h, 18, [
    E("Avatar", 37, 16, 36, 36, { fill: C.white06 }),
    TC("Init", initials, 37, 16, 36, 36, { fontFamily: F.body, fontSize: 13, fontStyle: "bold", fill: C.white }),
    TC("Rank", `#${rank}`, 0, 56, 110, 16, { fontFamily: F.mono, fontSize: 11, fontStyle: "bold", fill: accent }),
    TC("Name", name, 0, 74, 110, 16, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: C.white }),
    TC("Pts", pts, 0, 92, 110, 16, { fontFamily: F.body, fontSize: 11, fill: C.slate }),
  ]);

const lbRow = (y, rank, initials, name, pts, you) =>
  card(`Row/${rank}`, 20, y, 350, 56, 16, [
    T("Rank", String(rank), 16, 0, 30, { fontFamily: F.mono, fontSize: 13, fontStyle: "bold", fill: you ? C.lime : C.slate }),
    E("Av", 52, 12, 32, 32, { fill: C.white06 }),
    TC("In", initials, 52, 12, 32, 32, { fontFamily: F.body, fontSize: 11, fontStyle: "bold", fill: C.white }),
    T("Name", name, 96, 0, 180, { fontFamily: F.body, fontSize: 13, fontStyle: "bold", fill: C.white }),
    T("Pts", pts, 250, 0, 84, { fontFamily: F.body, fontSize: 12, fontStyle: "bold", fill: you ? C.lime : C.lime, textAlign: "right" }),
  ], you ? C.lime10 : C.panel, you ? C.lime40 : C.border);

const leaderboard = screen("09 · Leaderboard", 3440, [
  statusBar(),
  T("Title", "LEADERBOARD", 22, 48, 240, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.white }),
  card("Range", 276, 50, 92, 26, 13, [
    TC("T", "THIS WEEK", 0, 0, 92, 26, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.slate }),
  ], C.white06, C.borderSoft),
  podiumCard("Priya S.", 20, 120, 110, 2, "PS", "4,820", C.silver),
  podiumCard("Arjun M.", 140, 100, 130, 1, "AM", "5,140", C.lime),
  podiumCard("Rohan K.", 260, 130, 100, 3, "RK", "3,990", C.bronze),
  T("ListH", "TOP PERFORMERS", 22, 268, 260, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
  lbRow(290, 1, "AM", "Arjun Malhotra", "5,140", false),
  lbRow(354, 2, "PS", "Priya Sharma", "4,820", false),
  lbRow(418, 3, "RK", "Rohan Kapoor", "3,990", false),
  lbRow(482, 26, "YO", "You", "2,340", true),
  bottomNav("Settings"),
]);

/* --------------------------------------------------------------- 10 SETTINGS */
const rowItem = (name, y, g, label, value) =>
  card(name, 20, y, 350, 48, 14, [
    R("Icon", 10, 10, 28, 28, { fill: C.white06, cornerRadius: 8 }),
    glyph("G", 10, 10, 28, g, C.lime, 14),
    T("Label", label, 48, 0, 220, { fontFamily: F.body, fontSize: 13, fontStyle: "bold", fill: C.white }),
    T("Val", value, 210, 0, 110, { fontFamily: F.body, fontSize: 11, fill: C.slate, textAlign: "right" }),
    TC("Chev", "›", 320, 0, 20, 48, { fontFamily: F.body, fontSize: 18, fill: C.slate }),
  ]);

const settings = screen("10 · Settings", 3870, [
  statusBar(),
  T("Title", "SETTINGS", 22, 48, 220, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.white }),
  card("Profile", 20, 88, 350, 96, 22, [
    E("Av", 20, 20, 56, 56, { fill: C.lime12, stroke: C.lime20, strokeWeight: 1 }),
    TC("Init", "U", 20, 20, 56, 56, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.lime }),
    T("Name", "OPERATIVE", 92, 26, 200, { fontFamily: F.head, fontSize: 18, fontStyle: "bold", fill: C.white, letterSpacing: 1 }),
    T("Sub", "CHAMPION  ·  2,340 XP", 92, 52, 240, { fontFamily: F.body, fontSize: 11, fill: C.lime, letterSpacing: 1 }),
  ]),
  T("PerfH", "PERFORMANCE OVERVIEW", 22, 204, 260, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1.5 }),
  card("Perf", 20, 224, 350, 84, 20, [
    T("V1", "85%", 24, 20, 100, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.lime }),
    T("C1", "Accuracy", 24, 48, 100, { fontFamily: F.body, fontSize: 10, fill: C.slate }),
    T("V2", "210", 138, 20, 80, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.cyan }),
    T("C2", "Sprints", 138, 48, 80, { fontFamily: F.body, fontSize: 10, fill: C.slate }),
    T("V3", "12", 248, 20, 80, { fontFamily: F.head, fontSize: 20, fontStyle: "bold", fill: C.orange }),
    T("C3", "Day streak", 248, 48, 90, { fontFamily: F.body, fontSize: 10, fill: C.slate }),
  ]),
  T("AppearH", "APPEARANCE", 22, 328, 200, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1.5 }),
  card("Appearance", 20, 348, 350, 108, 20, [
    T("L1", "THEME", 18, 16, 160, { fontFamily: F.body, fontSize: 11, fontStyle: "bold", fill: C.white, letterSpacing: 1 }),
    card("Seg", 190, 12, 144, 28, 14, [
      R("On", 2, 2, 70, 24, { fill: C.lime, cornerRadius: 12 }),
      TC("Dark", "DARK", 0, 0, 70, 28, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.onAccent }),
      TC("Light", "LIGHT", 72, 0, 70, 28, { fontFamily: F.body, fontSize: 10, fontStyle: "bold", fill: C.slate }),
    ], C.white06, C.borderSoft),
    T("AccL", "ACCENT", 18, 56, 120, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1.5 }),
    E("Sw1", 100, 48, 24, 24, { fill: C.lime, stroke: C.white, strokeWeight: 2 }),
    E("Sw2", 134, 48, 24, 24, { fill: C.emerald }),
    E("Sw3", 168, 48, 24, 24, { fill: C.cyan }),
    E("Sw4", 202, 48, 24, 24, { fill: C.violet }),
  ]),
  rowItem("Row/Sub", 324, "$", "Subscription", "Free"),
  rowItem("Row/Notif", 380, "●", "Notifications", "On"),
  rowItem("Row/Theme", 436, "◐", "Appearance", "Dark"),
  rowItem("Row/Help", 492, "?", "Help & About", ""),
  bottomNav("Settings"),
]);

/* ---------------------------------------------------------------- 11 TOKENS */
const swatch = (name, x, y, color, labelText) => [
  R(`Sw/${name}`, x, y, 56, 44, { fill: color, cornerRadius: 10, stroke: C.border, strokeWeight: 1 }),
  T(`SwL/${name}`, labelText, x, y + 48, 88, { fontFamily: F.mono, fontSize: 8.5, fill: C.slate }),
];

const tokensScreen = screen(
  "11 · Design Tokens",
  4300,
  [
    T("Title", "DESIGN TOKENS", 24, 48, 360, { fontFamily: F.head, fontSize: 22, fontStyle: "bold", fill: C.white }),
    T("Sub", "dark · lime accent · from globals.css", 24, 76, 380, { fontFamily: F.mono, fontSize: 10, fill: C.slate }),
    ...swatch("bg", 24, 110, C.bg, "--bg #0A0C0A"),
    ...swatch("panel", 124, 110, C.panel, "--panel #10140E"),
    ...swatch("primary", 224, 110, C.lime, "--primary #C8FF5A"),
    ...swatch("ctaFrom", 324, 110, C.ctaFrom, "--cta-from #C7F252"),
    ...swatch("ctaTo", 24, 190, C.ctaTo, "--cta-to #A8D43A"),
    ...swatch("emerald", 124, 190, C.emerald, "--emerald #34D399"),
    ...swatch("orange", 224, 190, C.orange, "--orange #FF6B35"),
    ...swatch("muted", 324, 190, C.muted, "--muted #8B8B8B"),
    ...swatch("glassBorder", 24, 270, C.white08, "border #FFFFFF14"),
    ...swatch("glassBg", 124, 270, C.white06, "glass #FFFFFF0F"),
    ...swatch("cyan", 224, 270, C.cyan, "cyan #22D3EE"),
    ...swatch("violet", 324, 270, C.violet, "violet #A78BFA"),
    T("FontH", "TYPE SCALE", 24, 356, 300, { fontFamily: F.body, fontSize: 10, fill: C.slate, letterSpacing: 1.5 }),
    T("Head", "Space Grotesk", 24, 380, 360, { fontFamily: F.head, fontSize: 26, fontStyle: "bold", fill: C.white }),
    T("Body", "Inter — body copy and labels", 24, 420, 380, { fontFamily: F.body, fontSize: 14, fill: C.white }),
    T("Mono", "JetBrains Mono · 0123456789 XYZ", 24, 448, 380, { fontFamily: F.mono, fontSize: 12, fill: C.lime }),
    R("Div", 24, 486, 372, 1, { fill: C.border }),
    T("CompH", "COMPONENTS", 24, 506, 300, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 2 }),
    cta("Btn/cta", 24, 534, 180, 48, "CTA BUTTON", 13),
    card("Btn/glass", 216, 534, 180, 48, 14, [
      TC("T", "GLASS BUTTON", 0, 0, 180, 48, { fontFamily: F.head, fontSize: 13, fontStyle: "bold", fill: C.white }),
    ], C.white06, C.border),
    card("Btn/primary", 24, 596, 180, 48, 14, [
      TC("T", "PRIMARY", 0, 0, 180, 48, { fontFamily: F.head, fontSize: 13, fontStyle: "bold", fill: C.lime }),
    ], C.lime12, C.lime20),
    card("Btn/danger", 216, 596, 180, 48, 14, [
      TC("T", "DESTRUCTIVE", 0, 0, 180, 48, { fontFamily: F.head, fontSize: 13, fontStyle: "bold", fill: C.red }),
    ], "#EF44441F", "#EF444433"),
    card("Card/sample", 24, 664, 372, 100, 20, [
      T("T", "GLASS CARD", 20, 18, 200, { fontFamily: F.body, fontSize: 11, fill: C.slate, letterSpacing: 1.5 }),
      T("V", "rounded-2xl / 3xl", 20, 40, 300, { fontFamily: F.mono, fontSize: 12, fill: C.white }),
      T("B", "bg white/4 · border white/8", 20, 62, 320, { fontFamily: F.mono, fontSize: 11, fill: C.muted }),
    ]),
  ],
  420,
);

/* ------------------------------------------------------------------ EMIT */
const frames = [onboarding, auth, dashboard, analytics, play, sprint, results, practice, leaderboard, settings, tokensScreen];
const titles = [
  "01 Onboarding",
  "02 Auth",
  "03 Dashboard",
  "04 Analytics",
  "05 Play",
  "06 Sprint",
  "07 Results",
  "08 Practice",
  "09 Leaderboard",
  "10 Settings",
  "11 Tokens",
];

steps.push({ command: "page.rename", params: { name: "Zuzumik · Core Screens" } });
frames.forEach((f, i) => {
  const x = 0 + i * 470;
  add(label(titles[i], x), null);
  add(f, null);
});

const out = `${here}/screens-script.json`;
(await import("node:fs/promises")).writeFile(out, JSON.stringify(steps, null, 2));
console.log(`wrote ${out} with ${steps.length} steps / ${frames.length} screens`);
