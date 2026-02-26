/**
 * Playwright-based batch page fetcher.
 * Launches Chromium and fetches multiple URLs concurrently using tabs.
 * Returns raw HTML per URL — extraction is handled by htmlScraper helpers.
 */

import { chromium, type Browser, type BrowserContext } from "playwright";

export interface FetchResult {
  url: string;
  html: string | null;
  error?: string;
}

export interface PlaywrightFetchOptions {
  /** Max concurrent tabs open at once (default: 3) */
  concurrency?: number;
  /** Page load timeout in ms (default: 30_000) */
  timeoutMs?: number;
  /** Wait for networkidle after navigation (default: true) */
  waitForNetworkIdle?: boolean;
  /** Progress callback */
  onProgress?: (fetched: number, total: number) => void;
}

/**
 * Fetch multiple URLs using Playwright headless Chromium.
 * Opens `concurrency` tabs at a time, returns HTML for each URL.
 */
export async function fetchPagesWithPlaywright(
  urls: string[],
  options: PlaywrightFetchOptions = {}
): Promise<FetchResult[]> {
  const {
    concurrency = 3,
    timeoutMs = 30_000,
    waitForNetworkIdle = true,
    onProgress,
  } = options;

  if (urls.length === 0) return [];

  const results: FetchResult[] = [];
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    // Process URLs in batches of `concurrency`
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(async (url) => {
          const page = await context!.newPage();
          try {
            await page.goto(url, {
              waitUntil: waitForNetworkIdle ? "networkidle" : "domcontentloaded",
              timeout: timeoutMs,
            });
            const html = await page.content();
            return { url, html } as FetchResult;
          } catch (err: any) {
            return { url, html: null, error: err.message } as FetchResult;
          } finally {
            await page.close().catch(() => {});
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          // Should not happen since we catch inside, but safety net
          results.push({ url: batch[results.length - i] || "unknown", html: null, error: result.reason?.message });
        }
      }

      onProgress?.(Math.min(i + concurrency, urls.length), urls.length);
    }
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }

  return results;
}
