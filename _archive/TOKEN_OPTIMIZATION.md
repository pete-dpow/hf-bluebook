# Token Optimization Guide for Claude Code

This document explains how to minimize token consumption when working with Claude Code on this project.

## Problem Overview

When Claude Code analyzes a project, it can consume excessive tokens (200k-600k+) by:
- Scanning large directories like `node_modules` (589MB in this project)
- Reading package-lock.json files (often 50k-100k lines)
- Processing binary files and build artifacts
- Performing broad file searches without proper exclusions

## Solutions Implemented

### 1. File Exclusion Configuration

**`.bolt/ignore`** - Prevents Claude Code from scanning specified files/directories:
- `node_modules/` - Dependencies (589MB)
- `package-lock.json` - Lock file (large)
- `.next/`, `build/`, `dist/` - Build outputs
- `coverage/` - Test coverage reports
- Log files and temporary files

**`tsconfig.json`** - Updated exclude list to prevent TypeScript from processing unnecessary files.

### 2. Token Usage Monitoring

**`lib/tokenUsageMonitor.ts`** - Utility for tracking and alerting on token usage:

```typescript
import { trackTokenUsage, getTokenUsageReport, logHighTokenOperation } from '@/lib/tokenUsageMonitor';

// Track an operation
trackTokenUsage('file_read', 500, 'components/MyComponent.tsx');

// Get usage report
const report = getTokenUsageReport();
console.log(report);

// Log high-token operations
logHighTokenOperation('context_scan', 'app/', 50000);
```

**Features:**
- Estimates token usage from text/file sizes
- Tracks operations with budgets
- Warns when thresholds are exceeded
- Provides detailed usage reports

### 3. Project Context Caching

**`lib/projectContextCache.ts`** - Caches frequently accessed data to reduce redundant scans:

```typescript
import { getCachedContext, setCachedContext, cacheFileContent } from '@/lib/projectContextCache';

// Cache data with TTL
setCachedContext('api_structure', apiData, 1000 * 60 * 15); // 15 min

// Retrieve cached data
const cached = getCachedContext('api_structure');

// Cache file content
cacheFileContent('lib/utils.ts', fileContent);
```

**Features:**
- 15-minute default TTL for cached contexts
- Project manifest defines scannable directories
- Helper functions for cache management
- Automatic expiration of stale data

## Best Practices

### 1. Be Specific with Queries

**❌ Bad (High Token Usage):**
```
"Analyze the entire codebase"
"Search everywhere for X"
"Review all components"
```

**✅ Good (Low Token Usage):**
```
"Check the authentication logic in app/api/auth/route.ts"
"Review the ChatBubble component in components/ChatBubble.tsx"
"Look at the API routes in app/api/"
```

### 2. Use Targeted File Operations

**❌ Bad:**
```typescript
// Broad search that includes node_modules
glob("**/*.ts")
```

**✅ Good:**
```typescript
// Targeted search in specific directories
glob("app/**/*.ts")
glob("components/**/*.tsx")
```

### 3. Avoid Redundant Operations

**❌ Bad:**
```
User: "Add a button"
Claude: *scans entire project*
User: "Make it blue"
Claude: *scans entire project again*
```

**✅ Good:**
```
User: "Add a blue button to components/Header.tsx"
Claude: *reads only Header.tsx and related files*
```

### 4. Leverage Caching

When working with frequently accessed data, use the caching system:

```typescript
// First check cache
let structure = getCachedProjectStructure();

if (!structure) {
  // Only scan if not cached
  structure = await scanProject();
  cacheProjectStructure(structure);
}
```

### 5. Monitor Token Usage

Regularly check token consumption:

```typescript
import { getTokenUsageSummary } from '@/lib/tokenUsageMonitor';

// Get summary
console.log(getTokenUsageSummary());
```

## Understanding Token Costs

Approximate token costs by operation:

| Operation | Estimated Tokens | Notes |
|-----------|-----------------|-------|
| Read single component | 200-500 | Small file |
| Read utility file | 100-300 | Helper functions |
| Read API route | 300-800 | Includes logic |
| Scan directory (10 files) | 2,000-5,000 | Without node_modules |
| Scan node_modules | 200,000-300,000 | **AVOID THIS** |
| Read package-lock.json | 50,000-100,000 | **AVOIDED VIA .bolt/ignore** |
| Full project context scan | 10,000-50,000 | With proper exclusions |

## Directory Structure

**Scannable directories (low token cost):**
```
app/           - Next.js app directory
components/    - React components
lib/           - Utility functions
hooks/         - Custom React hooks
```

**Excluded directories (prevent high token cost):**
```
node_modules/  - Dependencies (589MB)
.next/         - Build output
out/           - Static export
build/         - Build artifacts
coverage/      - Test coverage
```

## Monitoring Token Usage

### Real-time Monitoring

The token monitoring system logs warnings when operations exceed thresholds:

```
[Token Warning] Operation "file_read" used 3500 tokens (threshold: 3000)
[Token Alert] Operation "context_scan" exceeded budget! Used 55000 tokens (max: 50000)
```

### Usage Reports

Generate detailed reports:

```typescript
import { getTokenUsageReport } from '@/lib/tokenUsageMonitor';

const report = getTokenUsageReport();
// Returns:
// - totalTokens: number
// - operationBreakdown: by operation type
// - recentMetrics: last 20 operations
// - topConsumers: top 10 high-token operations
```

## Troubleshooting

### High Token Usage Issue

**Symptoms:**
- Simple queries consume 100k+ tokens
- Responses are slow
- Budget warnings appear frequently

**Diagnosis:**
1. Check if `.bolt/ignore` exists and is properly configured
2. Verify `node_modules` is excluded
3. Review recent operations with `getTokenUsageReport()`
4. Identify top consumers in the report

**Resolution:**
1. Ensure `.bolt/ignore` includes all large directories
2. Be more specific in queries
3. Use targeted file reads instead of broad scans
4. Clear cache if stale: `invalidateAllCache()`

### Cache Issues

**Symptoms:**
- Outdated data being returned
- Changes not reflected immediately

**Resolution:**
```typescript
import { invalidateCache, invalidateAllCache } from '@/lib/projectContextCache';

// Invalidate specific cache
invalidateCache('project_structure');

// Clear all cache
invalidateAllCache();
```

## Expected Token Usage

With these optimizations in place:

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Simple question ("perfect") | 600k | 5k-10k | **98%** |
| Read single file | 50k | 1k-2k | **96%** |
| Project analysis | 300k | 20k-40k | **90%** |
| Component modification | 100k | 5k-15k | **92%** |

## Maintenance

### Regular Tasks

1. **Review .bolt/ignore** - Add new patterns for large files/directories
2. **Monitor token reports** - Check weekly for unexpected spikes
3. **Update cache TTLs** - Adjust based on development patterns
4. **Clean up old caches** - Reset if development patterns change

### When Adding New Dependencies

1. Ensure they're installed in `node_modules` (auto-excluded)
2. Don't commit `package-lock.json` to version control
3. Update `.bolt/ignore` if adding custom large directories

## Summary

Token optimization is achieved through:
1. **Exclusion** - `.bolt/ignore` prevents scanning unnecessary files
2. **Monitoring** - Track usage and identify bottlenecks
3. **Caching** - Avoid redundant scans
4. **Best practices** - Specific queries and targeted operations

Expected result: **90-98% reduction in token usage** for common operations.
