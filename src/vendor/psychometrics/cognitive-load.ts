/**
 * Base cognitive load (COG-01), VMSG:312:
 *   BCL = clamp(1 + 0.4·ops + 0.3·digits + 0.6·carry + 0.2·chars/40 + 0.5·special, 1, 5)
 *
 * No source defines how the five features are counted; the counting rules below
 * are the design's [REC, Q24], made concrete. BCL is logged on `problem_attempt`
 * and used ONLY as the CLR tiebreak (clr.ts `clrQueue`); it never routes and
 * never touches P(L).
 *
 * Not built, because nothing specifies them: COG-02/03 (linguistic and
 * working-memory load, "similarly", VMSG:312) and COG-MAP-06 (VMSG:315) — Q24.
 *
 * Scale note, for whoever reads the logs: with these weights HALF of all
 * 2-digit × 2-digit products clamp at 5 — 4,049 of the 8,100 ("a × b",
 * 10 ≤ a, b ≤ 99): every one with 4 or more column carries, since
 * 1 + 0.4 + 1.2 + 0.035 = 2.635 before carries and each carry adds 0.6
 * (98 × 97, 6 carries, clamps; 12 × 12, none, is 2.635). So BCL separates easy
 * items from each other and lumps carry-heavy multi-digit work together. That
 * is the formula, not the counting.
 */

export interface BclFeatures {
  /** Arithmetic operator tokens: binary +, binary −, ×, ÷, division "/" and "x" between two numbers. */
  ops: number;
  /** ASCII digit characters in numeric literals (thousands separators excluded). */
  digits: number;
  /** Carries of the column algorithm for integer + and × operand pairs; 0 otherwise. */
  carry: number;
  /** Length of the question as read, in code points: LaTeX commands removed (a symbol
   *  command such as \pi or \le counts as the one character it renders as),
   *  whitespace collapsed. */
  chars: number;
  /** Count of {fraction, decimal point, unary minus, %, √, exponent}. */
  special: number;
}

/** VMSG:312 weights and clamp. */
export const BCL_WEIGHTS = { ops: 0.4, digits: 0.3, carry: 0.6, charsPer40: 0.2, special: 0.5 } as const;
export const BCL_MIN = 1;
export const BCL_MAX = 5;

/** Operands longer than this are not column-worked (bounded work on hostile
 *  input: at most 64 × 64 digit steps per operator); their digit count alone
 *  already clamps BCL at 5 (0.3 × 64 > 4). */
export const MAX_CARRY_OPERAND_DIGITS = 64;

export function baseCognitiveLoad(f: BclFeatures): number {
  for (const [k, v] of Object.entries(f)) {
    if (!Number.isFinite(v) || v < 0) throw new RangeError(`BCL feature ${k} must be a finite count ≥ 0, got ${v}`);
  }
  const raw =
    1 +
    BCL_WEIGHTS.ops * f.ops +
    BCL_WEIGHTS.digits * f.digits +
    BCL_WEIGHTS.carry * f.carry +
    (BCL_WEIGHTS.charsPer40 * f.chars) / 40 +
    BCL_WEIGHTS.special * f.special;
  return Math.min(BCL_MAX, Math.max(BCL_MIN, raw));
}

// ── column-algorithm carries ─────────────────────────────────────────────────

/** Little-endian digit array of a digit string. */
function digitsOf(s: string): number[] {
  return [...s].reverse().map((c) => c.charCodeAt(0) - 48);
}

/** Columns of a + b that carry out. */
export function additionCarries(a: string, b: string): number {
  return columnSum([digitsOf(a), digitsOf(b)]).carries;
}

/** Column-wise sum of little-endian rows; counts columns whose carry out is > 0. */
function columnSum(rows: number[][]): { digits: number[]; carries: number } {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const out: number[] = [];
  let carry = 0;
  let carries = 0;
  for (let c = 0; c < width; c++) {
    let s = carry;
    for (const r of rows) s += r[c] ?? 0;
    out.push(s % 10);
    carry = Math.floor(s / 10);
    if (carry > 0) carries++;
  }
  while (carry > 0) {
    out.push(carry % 10);
    carry = Math.floor(carry / 10);
  }
  return { digits: out, carries };
}

/**
 * Long multiplication a × b as written in columns, b below a: one partial
 * product per digit of b (each digit-by-digit step that carries counts), then
 * the shifted partial products summed in columns (each column that carries
 * counts). A one-digit b has no summing stage.
 */
export function multiplicationCarries(a: string, b: string): number {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let carries = 0;
  const rows: number[][] = [];
  db.forEach((d, shift) => {
    const row: number[] = new Array(shift).fill(0);
    let carry = 0;
    for (const x of da) {
      const p = x * d + carry;
      row.push(p % 10);
      carry = Math.floor(p / 10);
      if (carry > 0) carries++;
    }
    if (carry > 0) row.push(carry);
    rows.push(row);
  });
  if (rows.length > 1) carries += columnSum(rows).carries;
  return carries;
}

// ── tokenising question text ─────────────────────────────────────────────────

type Tok =
  | {
      kind: "num";
      int: string;
      frac: string | null;
      /** Part of a fraction, a percentage, an exponent base or a negated literal:
       *  not a plain integer operand for the carry count. */
      tainted: boolean;
    }
  | { kind: "word"; text: string }
  | { kind: "sym"; ch: string }
  | { kind: "space" };

const SUPERSCRIPT = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/u;
const VULGAR_FRACTION = /[¼½¾⅐-⅞]/u;
const OPENERS = new Set(["(", "[", "{", "=", ",", ":", ";", "+", "-", "×", "÷", "/", "^"]);
const CLOSERS = new Set([")", "]", "}", "%"]);

/** LaTeX symbol commands → the one character each renders as. A Greek letter
 *  becomes a one-letter word, i.e. a variable ("2\pi r" reads "2π r"). */
const LATEX_SYMBOLS: Readonly<Record<string, string>> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", vartheta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ",
  Psi: "Ψ", Omega: "Ω",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", lt: "<", gt: ">", approx: "≈", equiv: "≡",
  sim: "∼", infty: "∞", pm: "±", mp: "∓", circ: "∘", degree: "°", angle: "∠", triangle: "△", perp: "⊥",
  parallel: "∥", in: "∈", cup: "∪", cap: "∩", subset: "⊂", therefore: "∴", because: "∵", to: "→",
  rightarrow: "→", Rightarrow: "⇒", implies: "⇒", mid: "∣", ldots: "…", cdots: "…", dots: "…",
};

/** LaTeX and Unicode spellings → one vocabulary.
 *  `\frac{A}{B}` of two integers becomes `A/B`, which the scan counts as one
 *  fraction and whose numbers it then keeps out of carry pairs (otherwise
 *  `\frac{3}{4} \times 8` would column-work 4 × 8). Any other `\frac{A}{B}`
 *  becomes `(A)⁄(B)` with U+2044 FRACTION SLASH, a fraction that is never an
 *  operator. A `\frac` nested too deep to match is counted and dropped.
 *  `^\circ` is a degree sign, not an exponent. Symbol commands (`LATEX_SYMBOLS`)
 *  become their character; every other command — formatting such as `\text`,
 *  `\mathrm`, `\displaystyle`, spacing such as `\quad`, `\,` — is removed, its
 *  braced argument kept as plain text. So `chars` counts what is read. */
function normalise(text: string): { s: string; fracs: number } {
  let fracs = 0;
  // `(?![A-Za-z])`, not `\b`: "\times9" has no word boundary between "s" and "9".
  let s = text
    .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_m, a: string, b: string) =>
      /^\s*\d+\s*$/.test(a) && /^\s*\d+\s*$/.test(b) ? `${a.trim()}/${b.trim()}` : `(${a})⁄(${b})`,
    )
    .replace(/\\[dt]?frac(?![A-Za-z])/g, () => {
      fracs++;
      return " ";
    });
  s = s
    .replace(/\^\s*(?:\{\s*\\circ\s*\}|\\circ(?![A-Za-z]))/g, "°")
    .replace(/\\(?:times|cdot)(?![A-Za-z])|[*∗·⋅]/g, "×")
    .replace(/\\div(?![A-Za-z])/g, "÷")
    .replace(/\\sqrt(?![A-Za-z])/g, "√")
    .replace(/\\%/g, "%")
    .replace(/\\(?:left|right|[bB]igg?[lr]?)(?![A-Za-z])/g, "") // delimiter sizing: glued, as written
    // own keys only: "\constructor" must not reach Object.prototype
    .replace(/\\([A-Za-z]+)/g, (_m, name: string) =>
      Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, name) ? LATEX_SYMBOLS[name] : " ",
    )
    .replace(/\\[{}$&#_,;:!> ]/g, " ") // escaped characters; the spacing commands \, \; \: \! \> and "\ "
    .replace(/\\/g, " ") // "\\" (a line break) and any stray backslash
    .replace(/[−–]/g, "-")
    .replace(/[{}]/g, " ")
    .replace(/\$/g, " ");
  return { s, fracs };
}

function tokenise(s: string): Tok[] {
  const toks: Tok[] = [];
  const num = /^(?:(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?|\.(\d+))/;
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const m = num.exec(rest);
    if (m) {
      const int = (m[1] ?? "").replace(/,/g, "");
      const frac = m[2] ?? m[3] ?? null;
      toks.push({ kind: "num", int, frac, tainted: false });
      i += m[0].length;
      continue;
    }
    const w = /^\p{L}+/u.exec(rest);
    if (w) {
      toks.push({ kind: "word", text: w[0] });
      i += w[0].length;
      continue;
    }
    const sp = /^\s+/.exec(rest);
    if (sp) {
      toks.push({ kind: "space" });
      i += sp[0].length;
      continue;
    }
    const ch = String.fromCodePoint(rest.codePointAt(0)!);
    toks.push({ kind: "sym", ch });
    i += ch.length;
  }
  return toks;
}

/** Index of the nearest non-space token in direction `dir`, or -1. */
function neighbour(toks: Tok[], i: number, dir: 1 | -1): number {
  for (let j = i + dir; j >= 0 && j < toks.length; j += dir) if (toks[j].kind !== "space") return j;
  return -1;
}

function isNum(t: Tok | undefined): t is Extract<Tok, { kind: "num" }> {
  return t?.kind === "num";
}

/** Token j opens an operand: a number, "(", "√" or "∛". */
function startsOperand(toks: Tok[], j: number): boolean {
  const t = toks[j];
  return isNum(t) || (t?.kind === "sym" && (t.ch === "(" || t.ch === "√" || t.ch === "∛"));
}

/** Token j is a sign ("-" or "+") in front of an operand or a word: the "-3" of "2 - -3". */
function isSignedOperand(toks: Tok[], j: number): boolean {
  const t = toks[j];
  if (t?.kind !== "sym" || (t.ch !== "-" && t.ch !== "+")) return false;
  const k = neighbour(toks, j, 1);
  return startsOperand(toks, k) || toks[k]?.kind === "word";
}

/**
 * [REC, Q24] Counting rules:
 * - ops: "+" unless it is a unary plus (at the start, or after an opening
 *   bracket or another operator, in front of an operand: "+5", "5 + +3");
 *   "-" between operands, a signed operand included ("2 - -3", "12 - - 3");
 *   "×" (also *, ·, \times, \cdot); "÷" (also \div); "/" unless it is a
 *   fraction or a unit ratio; "x"/"X" standing alone between two numbers
 *   ("98 x 97"). "=" and comparisons are not operators.
 * - special: a fraction (`a/b` with no spaces between two numbers, `\frac`, or a
 *   vulgar-fraction character), a decimal point, a unary minus (a unary plus is
 *   nothing), "%", "√"/"∛"/"sqrt", an exponent ("^" or a run of superscripts).
 *   Exponents are special only, never also an op.
 * - digits: ASCII digits of numeric literals; "1,234" is 4 digits.
 * - carry: for each "+" or "×" whose two neighbours are plain integer literals,
 *   the column carries of that literal pair. Pairs are read left to right on the
 *   literals as written — precedence is not evaluated.
 * - chars: the normalised text's length in code points, whitespace collapsed.
 * A hyphen inside a word ("two-digit", "3-digit", "x-axis") is neither an op
 * nor a minus; a one-letter right-hand side is a variable, so "5-x", "a-b" and
 * "2x-y" are subtractions. A slash glued between two words of which one is
 * longer than a letter ("km/h", "and/or") is a unit ratio, neither an op nor a
 * fraction; "a/b" between two single letters stays a division.
 */
export function bclFeatures(text: string): BclFeatures {
  const { s, fracs } = normalise(text);
  const toks = tokenise(s);
  let ops = 0;
  let digits = 0;
  let special = fracs;
  const carryOps: number[] = [];

  toks.forEach((t, i) => {
    if (t.kind === "num") {
      digits += t.int.length + (t.frac?.length ?? 0);
      if (t.frac !== null) {
        special++; // decimal point
        t.tainted = true;
      }
      return;
    }
    if (t.kind === "word") {
      const lower = t.text.toLowerCase();
      if (lower === "x" && isNum(toks[neighbour(toks, i, -1)]) && isNum(toks[neighbour(toks, i, 1)])) {
        ops++;
        carryOps.push(i);
      } else if (lower === "sqrt") {
        special++;
      }
      return;
    }
    if (t.kind !== "sym") return;
    const ch = t.ch;
    const p = neighbour(toks, i, -1);
    const n = neighbour(toks, i, 1);
    const prev = toks[p];
    const next = toks[n];
    const tightBefore = p === i - 1;
    const tightAfter = n === i + 1;

    // A sign at the start, or after an opening bracket or another operator.
    const afterOpener = prev === undefined || (prev.kind === "sym" && OPENERS.has(prev.ch));

    if (ch === "+") {
      if (afterOpener && (startsOperand(toks, n) || next?.kind === "word")) return; // unary plus: nothing
      ops++;
      carryOps.push(i);
    } else if (ch === "×") {
      ops++;
      carryOps.push(i);
    } else if (ch === "÷") {
      ops++;
    } else if (ch === "/") {
      if (tightBefore && tightAfter && isNum(prev) && isNum(next)) {
        special++; // fraction
        prev.tainted = true;
        next.tainted = true;
      } else if (
        tightBefore &&
        tightAfter &&
        prev?.kind === "word" &&
        next?.kind === "word" &&
        (prev.text.length > 1 || next.text.length > 1)
      ) {
        // a unit ratio ("km/h"): not arithmetic
      } else {
        ops++;
      }
    } else if (ch === "-") {
      if (next === undefined) return;
      // A word hyphen: glued to a word or number on the left and a word of two
      // or more letters on the right ("two-digit", "3-digit"). A one-letter
      // right-hand side is a variable: "5-x", "a-b", "2x-y" subtract.
      if (
        tightBefore &&
        tightAfter &&
        next.kind === "word" &&
        next.text.length > 1 &&
        (prev?.kind === "word" || isNum(prev))
      ) {
        return;
      }
      const operandAfter = startsOperand(toks, n);
      const operandBefore =
        isNum(prev) ||
        (prev?.kind === "word" && prev.text.length === 1) || // a variable: "x - 3"
        (prev?.kind === "sym" && (CLOSERS.has(prev.ch) || SUPERSCRIPT.test(prev.ch)));
      if (operandBefore && (operandAfter || next.kind === "word" || isSignedOperand(toks, n))) {
        ops++; // binary minus
      } else if (operandAfter && (afterOpener || (prev?.kind === "word" && tightAfter))) {
        // Unary minus: after an opener or operator, spaced or not ("12 - - 3");
        // after a word only when glued to its operand ("is -5", not "is - 5").
        special++;
        if (isNum(next)) next.tainted = true;
      }
    } else if (ch === "^") {
      special++; // exponent
      if (isNum(prev)) prev.tainted = true;
      if (isNum(next)) next.tainted = true;
    } else if (SUPERSCRIPT.test(ch)) {
      // One exponent per run of superscripts: count at the run's first character.
      const before = toks[i - 1];
      if (!(before?.kind === "sym" && SUPERSCRIPT.test(before.ch))) {
        special++;
        if (isNum(before)) before.tainted = true;
      }
    } else if (ch === "%") {
      special++;
      if (isNum(prev)) prev.tainted = true;
    } else if (ch === "√" || ch === "∛") {
      special++;
    } else if (ch === "⁄" || VULGAR_FRACTION.test(ch)) {
      special++;
    }
  });

  let carry = 0;
  for (const i of carryOps) {
    const a = toks[neighbour(toks, i, -1)];
    const b = toks[neighbour(toks, i, 1)];
    if (!isNum(a) || !isNum(b) || a.tainted || b.tainted) continue;
    if (a.int.length > MAX_CARRY_OPERAND_DIGITS || b.int.length > MAX_CARRY_OPERAND_DIGITS) continue;
    const t = toks[i];
    const isPlus = t.kind === "sym" && t.ch === "+";
    carry += isPlus ? additionCarries(a.int, b.int) : multiplicationCarries(a.int, b.int);
  }

  const chars = [...s.replace(/\s+/g, " ").trim()].length;
  return { ops, digits, carry, chars, special };
}
