export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function pct(n: number, d: number, round = true): number {
  if (!d || !Number.isFinite(d)) return 0;
  const v = (n / d) * 100;
  return round ? Math.round(v) : v;
}

export function roundTo(n: number, decimals = 0): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}
