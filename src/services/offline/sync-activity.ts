/**
 * Whether a sync is running right now, observable, so the status indicator can say "Syncing" while a batch is in flight. Nothing here
 * sends or stores anything: the queue functions in sync.ts and telemetry.ts wrap their network work in trackSync.
 */
let active = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((cb) => cb());

export function isSyncing(): boolean {
  return active > 0;
}

export function subscribeSync(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Run network work and count it as a sync while it runs (also when it fails). */
export async function trackSync<T>(work: () => Promise<T>): Promise<T> {
  active += 1;
  notify();
  try {
    return await work();
  } finally {
    active = Math.max(0, active - 1);
    notify();
  }
}
