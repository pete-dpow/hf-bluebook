interface TokenUsageMetric {
  operation: string;
  timestamp: number;
  estimatedTokens: number;
  context: string;
  duration?: number;
}

interface TokenBudget {
  operation: string;
  maxTokens: number;
  warningThreshold: number;
}

const tokenMetrics: TokenUsageMetric[] = [];
const MAX_METRICS_STORED = 100;

const DEFAULT_BUDGETS: TokenBudget[] = [
  { operation: 'file_read', maxTokens: 5000, warningThreshold: 3000 },
  { operation: 'file_search', maxTokens: 10000, warningThreshold: 7000 },
  { operation: 'api_call', maxTokens: 2000, warningThreshold: 1500 },
  { operation: 'context_scan', maxTokens: 50000, warningThreshold: 30000 },
];

export function estimateTokensFromText(text: string): number {
  const avgCharsPerToken = 4;
  return Math.ceil(text.length / avgCharsPerToken);
}

export function estimateTokensFromFileSize(bytes: number): number {
  const avgBytesPerToken = 4;
  return Math.ceil(bytes / avgBytesPerToken);
}

export function trackTokenUsage(
  operation: string,
  estimatedTokens: number,
  context: string = '',
  duration?: number
): void {
  const metric: TokenUsageMetric = {
    operation,
    timestamp: Date.now(),
    estimatedTokens,
    context,
    duration,
  };

  tokenMetrics.push(metric);

  if (tokenMetrics.length > MAX_METRICS_STORED) {
    tokenMetrics.shift();
  }

  const budget = DEFAULT_BUDGETS.find((b) => b.operation === operation);
  if (budget && estimatedTokens > budget.warningThreshold) {
    console.warn(
      `[Token Warning] Operation "${operation}" used ${estimatedTokens} tokens (threshold: ${budget.warningThreshold})`
    );
  }

  if (budget && estimatedTokens > budget.maxTokens) {
    console.error(
      `[Token Alert] Operation "${operation}" exceeded budget! Used ${estimatedTokens} tokens (max: ${budget.maxTokens})`
    );
  }
}

export function getTokenUsageReport(): {
  totalTokens: number;
  operationBreakdown: Record<string, { count: number; totalTokens: number; avgTokens: number }>;
  recentMetrics: TokenUsageMetric[];
  topConsumers: TokenUsageMetric[];
} {
  const totalTokens = tokenMetrics.reduce((sum, m) => sum + m.estimatedTokens, 0);

  const operationBreakdown: Record<
    string,
    { count: number; totalTokens: number; avgTokens: number }
  > = {};

  tokenMetrics.forEach((m) => {
    if (!operationBreakdown[m.operation]) {
      operationBreakdown[m.operation] = { count: 0, totalTokens: 0, avgTokens: 0 };
    }
    operationBreakdown[m.operation].count++;
    operationBreakdown[m.operation].totalTokens += m.estimatedTokens;
  });

  Object.keys(operationBreakdown).forEach((op) => {
    const data = operationBreakdown[op];
    data.avgTokens = Math.round(data.totalTokens / data.count);
  });

  const topConsumers = [...tokenMetrics]
    .sort((a, b) => b.estimatedTokens - a.estimatedTokens)
    .slice(0, 10);

  const recentMetrics = tokenMetrics.slice(-20);

  return {
    totalTokens,
    operationBreakdown,
    recentMetrics,
    topConsumers,
  };
}

export function resetTokenMetrics(): void {
  tokenMetrics.length = 0;
}

export function shouldProceedWithOperation(
  operation: string,
  estimatedTokens: number
): { proceed: boolean; reason?: string } {
  const budget = DEFAULT_BUDGETS.find((b) => b.operation === operation);

  if (!budget) {
    return { proceed: true };
  }

  if (estimatedTokens > budget.maxTokens) {
    return {
      proceed: false,
      reason: `Operation would use ${estimatedTokens} tokens, exceeding budget of ${budget.maxTokens}`,
    };
  }

  return { proceed: true };
}

export function logHighTokenOperation(
  operation: string,
  filePath: string,
  tokenCount: number
): void {
  console.log(`[High Token Operation] ${operation} on ${filePath}: ${tokenCount} tokens`);

  trackTokenUsage(operation, tokenCount, filePath);
}

export function getTokenUsageSummary(): string {
  const report = getTokenUsageReport();

  let summary = `Token Usage Summary:\n`;
  summary += `Total Tokens: ${report.totalTokens.toLocaleString()}\n\n`;

  summary += `Operation Breakdown:\n`;
  Object.entries(report.operationBreakdown).forEach(([op, data]) => {
    summary += `  ${op}: ${data.count} operations, ${data.totalTokens.toLocaleString()} tokens (avg: ${data.avgTokens})\n`;
  });

  summary += `\nTop 5 Token Consumers:\n`;
  report.topConsumers.slice(0, 5).forEach((metric, i) => {
    summary += `  ${i + 1}. ${metric.operation} - ${metric.estimatedTokens.toLocaleString()} tokens (${metric.context})\n`;
  });

  return summary;
}
