export function timeAgo(input: number | string | Date): string {
  const ts =
    input instanceof Date
      ? input.getTime()
      : typeof input === 'string'
        ? Date.parse(input)
        : input;

  if (!Number.isFinite(ts)) return '';

  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';

  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.round(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.round(h / 24);
  if (d < 7) return d + 'd ago';
  const w = Math.round(d / 7);
  if (w < 4) return w + 'w ago';
  const mo = Math.round(d / 30);
  if (mo < 12) return mo + 'mo ago';
  const y = Math.round(d / 365);
  return y + 'y ago';
}
