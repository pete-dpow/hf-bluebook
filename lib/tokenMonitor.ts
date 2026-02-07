export interface Metric {
  route: string;
  count: number;
  avgLatency: number;
  totalLatency: number;
  minLatency: number;
  maxLatency: number;
  lastCalled: number;
  errorCount: number;
}

const metrics: Record<string, Metric> = {};

export function logApiUsage(route: string, latency: number, error = false) {
  if (!metrics[route]) {
    metrics[route] = {
      route,
      count: 0,
      avgLatency: 0,
      totalLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      lastCalled: Date.now(),
      errorCount: 0
    };
  }

  const m = metrics[route];
  m.count++;
  m.totalLatency += latency;
  m.avgLatency = m.totalLatency / m.count;
  m.minLatency = Math.min(m.minLatency, latency);
  m.maxLatency = Math.max(m.maxLatency, latency);
  m.lastCalled = Date.now();

  if (error) {
    m.errorCount++;
  }

}

export function reportMetrics(): Metric[] {
  const sorted = Object.values(metrics).sort((a, b) => b.count - a.count);


  return sorted;
}

export function getMetricsByRoute(route: string): Metric | null {
  return metrics[route] || null;
}

export function getTopRoutes(limit = 10): Metric[] {
  return Object.values(metrics)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getSlowestRoutes(limit = 10): Metric[] {
  return Object.values(metrics)
    .sort((a, b) => b.avgLatency - a.avgLatency)
    .slice(0, limit);
}

export function getRoutesByErrorRate(limit = 10): Metric[] {
  return Object.values(metrics)
    .filter(m => m.errorCount > 0)
    .sort((a, b) => {
      const aRate = a.errorCount / a.count;
      const bRate = b.errorCount / b.count;
      return bRate - aRate;
    })
    .slice(0, limit);
}

export function resetMetrics() {
  Object.keys(metrics).forEach(key => delete metrics[key]);
}

export function getTotalStats() {
  const allMetrics = Object.values(metrics);

  return {
    totalCalls: allMetrics.reduce((sum, m) => sum + m.count, 0),
    totalErrors: allMetrics.reduce((sum, m) => sum + m.errorCount, 0),
    avgLatency: allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.avgLatency, 0) / allMetrics.length
      : 0,
    uniqueRoutes: allMetrics.length,
    errorRate: allMetrics.reduce((sum, m) => sum + m.count, 0) > 0
      ? (allMetrics.reduce((sum, m) => sum + m.errorCount, 0) / allMetrics.reduce((sum, m) => sum + m.count, 0)) * 100
      : 0
  };
}
