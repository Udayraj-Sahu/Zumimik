const INR_FORMAT = new Intl.NumberFormat('en-IN');

export function formatINR(n: number): string {
  const v = Number.isFinite(n) ? Math.round(n) : 0;
  return '\u20B9' + INR_FORMAT.format(v);
}

export { INR_FORMAT as INR };