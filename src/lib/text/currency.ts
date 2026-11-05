const INR_FORMAT = new Intl.NumberFormat('en-IN');
const INR_FORMAT_PAISE = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatINR(n: number): string {
  if (!Number.isFinite(n)) return '\u2014';
  const rounded = Math.round(n * 100) / 100;
  return '\u20B9' + (Number.isInteger(rounded) ? INR_FORMAT.format(rounded) : INR_FORMAT_PAISE.format(rounded));
}

export { INR_FORMAT as INR };
