interface Metric {
  route: string;
  count: number;
  lastCalled: number;
  errorCount: number;
}

const metrics: Record<string, Metric> = {};

export function logApiUsage(route: string, error = false) {
  if (!metrics[route]) {
    metrics[route] = {
      route,
      count: 0,
      lastCalled: Date.now(),
      errorCount: 0
    };
  }

  const m = metrics[route];
  m.count++;
  m.lastCalled = Date.now();
  if (error) m.errorCount++;
}

export function getMetrics(): Metric[] {
  return Object.values(metrics).sort((a, b) => b.count - a.count);
}

export function resetMetrics() {
  Object.keys(metrics).forEach(key => delete metrics[key]);
}

let lastCall = 0;

export async function safeCall<T>(
  fn: () => Promise<T>,
  cooldown = 4000
): Promise<T | null> {
  const now = Date.now();
  if (now - lastCall < cooldown) return null;
  lastCall = now;
  return await fn();
}
