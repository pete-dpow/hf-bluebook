/**
 * AI-powered universal scraper.
 * Uses Playwright to fetch pages and GPT-4o to understand them.
 * No regex patterns or CSS selectors needed — just a website URL.
 */

import OpenAI from "openai";
import type { ScrapedProduct } from "./playwrightScraper";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-placeholder" });

// ── Types ──

export interface DiscoveryResult {
  product_urls: string[];
  method: "sitemap" | "ai-navigation" | "both";
}

// ── HTML Sanitization ──

/**
 * Strip scripts, styles, nav, footer, and excess attributes from HTML.
 * Keeps structural elements GPT-4o needs: headings, paragraphs, tables, links, images.
 * Target: ~15KB clean content ≈ ~4000 GPT-4o tokens.
 */
export function sanitizeHtml(rawHtml: string, maxChars: number = 15000): string {
  let html = rawHtml;

  // Remove script/style/noscript/svg/iframe blocks entirely
  html = html.replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // Remove header/footer/nav blocks
  html = html.replace(/<(header|footer|nav)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Remove common non-content elements
  html = html.replace(/<(aside|form|button|input|select|textarea)[^>]*>[\s\S]*?<\/\1>/gi, "");
  html = html.replace(/<(aside|form|button|input|select|textarea)[^>]*\/?>/gi, "");

  // Strip all attributes except href and src
  html = html.replace(/<(\w+)(\s+[^>]*?)>/gi, (match, tag, attrs) => {
    const hrefMatch = attrs.match(/\bhref\s*=\s*"([^"]*)"/i);
    const srcMatch = attrs.match(/\bsrc\s*=\s*"([^"]*)"/i);
    const kept: string[] = [];
    if (hrefMatch) kept.push(`href="${hrefMatch[1]}"`);
    if (srcMatch) kept.push(`src="${srcMatch[1]}"`);
    return kept.length > 0 ? `<${tag} ${kept.join(" ")}>` : `<${tag}>`;
  });

  // Collapse whitespace
  html = html.replace(/\s+/g, " ");

  // Remove empty tags
  html = html.replace(/<(\w+)>\s*<\/\1>/gi, "");

  // Truncate
  if (html.length > maxChars) {
    html = html.slice(0, maxChars) + "\n[TRUNCATED]";
  }

  return html.trim();
}

// ── Sitemap Discovery ──

/**
 * Try /sitemap.xml, /sitemap_index.xml, and /robots.txt to discover product URLs.
 * No Playwright needed — sitemaps are plain XML served over HTTP.
 */
export async function discoverViaSitemap(websiteUrl: string): Promise<string[]> {
  let origin: string;
  try {
    origin = new URL(websiteUrl).origin;
  } catch {
    return [];
  }

  const allUrls: string[] = [];
  const sitemapUrls: string[] = [];

  // Try common sitemap locations
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ];

  // Check robots.txt for Sitemap directives
  try {
    const robotsRes = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0)" },
    });
    if (robotsRes.ok) {
      const text = await robotsRes.text();
      const matches = text.match(/^Sitemap:\s*(.+)$/gim);
      if (matches) {
        for (const m of matches) {
          const url = m.replace(/^Sitemap:\s*/i, "").trim();
          if (url && !candidates.includes(url)) candidates.push(url);
        }
      }
    }
  } catch { /* ignore */ }

  // Fetch each sitemap candidate
  for (const sitemapUrl of candidates) {
    try {
      const res = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0)" },
      });
      if (!res.ok) continue;
      const xml = await res.text();

      // Check if this is a sitemap index (contains other sitemaps)
      const indexMatches = xml.match(/<loc>([^<]+)<\/loc>/gi);
      if (indexMatches) {
        for (const m of indexMatches) {
          const url = m.replace(/<\/?loc>/gi, "").trim();
          if (url.includes("sitemap") && url.endsWith(".xml")) {
            sitemapUrls.push(url);
          } else {
            allUrls.push(url);
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Fetch child sitemaps
  for (const childSitemap of sitemapUrls.slice(0, 10)) {
    try {
      const res = await fetch(childSitemap, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0)" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const locMatches = xml.match(/<loc>([^<]+)<\/loc>/gi);
      if (locMatches) {
        for (const m of locMatches) {
          allUrls.push(m.replace(/<\/?loc>/gi, "").trim());
        }
      }
    } catch { /* ignore */ }
  }

  // Filter to product-like URLs
  const productPatterns = /\/(product|products|shop|item|catalogue|catalog|range|systems?|solutions?)\//i;
  const filtered = allUrls.filter((url) => productPatterns.test(url));

  // Deduplicate
  return Array.from(new Set(filtered)).slice(0, 500);
}

// ── AI Page Analysis ──

/**
 * Use GPT-4o to analyze a page and classify it + extract product links.
 */
export async function analyzePageWithAi(
  html: string,
  pageUrl: string,
  context: { manufacturer_name: string; goal: string }
): Promise<{
  page_type: "product_listing" | "product_detail" | "navigation" | "other";
  product_urls: string[];
  next_page_url: string | null;
  catalogue_link: string | null;
  confidence: number;
}> {
  const sanitized = sanitizeHtml(html);

  const prompt = `You are analyzing a web page from a fire protection product manufacturer's website.

PAGE URL: ${pageUrl}
MANUFACTURER: ${context.manufacturer_name}
GOAL: ${context.goal}

Analyze the HTML below and determine:
1. page_type: Is this a "product_listing" (shows multiple products with links to individual product pages), "product_detail" (single product with specs/description), "navigation" (homepage or category page with links to product sections), or "other"?
2. product_urls: Extract ALL href URLs that link to individual product pages. Return ABSOLUTE URLs only (resolve relative URLs against the page URL).
3. next_page_url: If this is a listing with pagination, what is the absolute URL for the "next page"? null if none.
4. catalogue_link: If this is a navigation/homepage, what absolute URL leads to the products catalogue or product listing? null if not applicable.
5. confidence: 0-100 how confident you are in this classification.

HTML:
${sanitized}

Return ONLY valid JSON:
{
  "page_type": "product_listing",
  "product_urls": ["https://..."],
  "next_page_url": null,
  "catalogue_link": null,
  "confidence": 85
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || "{}";
  try {
    const result = JSON.parse(content);
    return {
      page_type: result.page_type || "other",
      product_urls: Array.isArray(result.product_urls) ? result.product_urls : [],
      next_page_url: result.next_page_url || null,
      catalogue_link: result.catalogue_link || null,
      confidence: result.confidence || 0,
    };
  } catch {
    return { page_type: "other", product_urls: [], next_page_url: null, catalogue_link: null, confidence: 0 };
  }
}

// ── AI Product Extraction ──

/**
 * Use GPT-4o to extract structured product data from a product detail page.
 */
export async function extractProductWithAi(
  html: string,
  pageUrl: string,
  manufacturerName: string
): Promise<ScrapedProduct | null> {
  const sanitized = sanitizeHtml(html);

  const prompt = `You are a fire protection product data specialist. Extract structured product information from this web page.

MANUFACTURER: ${manufacturerName}
PAGE URL: ${pageUrl}

Extract the following fields:
- product_name (required): The main product name/title
- product_code: SKU, part number, or product reference code if visible
- description: First 500 characters of the main product description
- specifications: Key-value pairs from any specification table, feature list, or technical data (e.g. {"Fire Rating": "EI 120", "Material": "Steel"})
- price_text: Price if displayed (e.g. "£45.99 ex VAT")
- pdf_urls: Absolute URLs of any PDF downloads (datasheets, installation guides, certificates)
- image_urls: Absolute URLs of product images (not icons, logos, or decorative images)
- extraction_confidence: 0-100 confidence in extraction quality

PAGE HTML:
${sanitized}

RULES:
1. Only extract data that is clearly visible on the page. Do not invent or guess.
2. For specifications, extract key-value pairs from tables, definition lists, or bullet point lists.
3. PDF URLs often end in .pdf or link to document/download pages.
4. Ignore navigation images, social media icons, and banner ads.
5. If this page is NOT a product page, return {"product_name": null}.
6. Resolve all URLs to absolute URLs based on the page URL.

Return ONLY valid JSON:
{
  "product_name": "Product Name Here",
  "product_code": "SKU-123",
  "description": "Product description...",
  "specifications": {"Fire Rating": "EI 60", "Material": "Steel"},
  "price_text": null,
  "pdf_urls": ["https://example.com/datasheet.pdf"],
  "image_urls": ["https://example.com/product.jpg"],
  "extraction_confidence": 85
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || "{}";
  try {
    const result = JSON.parse(content);
    if (!result.product_name) return null;

    return {
      product_name: result.product_name,
      product_code: result.product_code || undefined,
      description: result.description || undefined,
      specifications: result.specifications || {},
      price_text: result.price_text || undefined,
      pdf_urls: Array.isArray(result.pdf_urls) ? result.pdf_urls : [],
      image_urls: Array.isArray(result.image_urls) ? result.image_urls : undefined,
      source_url: pageUrl,
    };
  } catch {
    return null;
  }
}

// ── Full Discovery Pipeline ──

/**
 * Discover product URLs from a manufacturer's website.
 * Strategy: sitemap first (cheap), then AI navigation (smart).
 */
export async function discoverProductUrls(
  websiteUrl: string,
  manufacturerName: string,
  fetchPageHtml: (url: string) => Promise<string | null>,
  onProgress?: (stage: string, detail: string) => void
): Promise<DiscoveryResult> {
  onProgress?.("Checking sitemap", websiteUrl);

  // Step 1: Try sitemap
  const sitemapUrls = await discoverViaSitemap(websiteUrl);
  if (sitemapUrls.length >= 5) {
    onProgress?.("Sitemap found", `${sitemapUrls.length} product URLs`);
    return { product_urls: sitemapUrls, method: "sitemap" };
  }

  // Step 2: AI navigation — use Playwright to visit pages
  onProgress?.("AI navigation", "Analyzing homepage");
  const allProductUrls = [...sitemapUrls];

  const homepageHtml = await fetchPageHtml(websiteUrl);
  if (!homepageHtml) {
    return { product_urls: allProductUrls, method: sitemapUrls.length > 0 ? "sitemap" : "ai-navigation" };
  }

  const homeAnalysis = await analyzePageWithAi(homepageHtml, websiteUrl, {
    manufacturer_name: manufacturerName,
    goal: "Find the products/catalogue section of this fire protection manufacturer website",
  });

  // If homepage is a listing, collect URLs directly
  if (homeAnalysis.page_type === "product_listing") {
    allProductUrls.push(...homeAnalysis.product_urls);
  }

  // If homepage is navigation, follow the catalogue link
  if (homeAnalysis.page_type === "navigation" && homeAnalysis.catalogue_link) {
    onProgress?.("AI navigation", `Following catalogue: ${homeAnalysis.catalogue_link}`);
    const catalogueHtml = await fetchPageHtml(homeAnalysis.catalogue_link);
    if (catalogueHtml) {
      const catAnalysis = await analyzePageWithAi(catalogueHtml, homeAnalysis.catalogue_link, {
        manufacturer_name: manufacturerName,
        goal: "Extract all product page URLs from this product listing or catalogue page",
      });
      allProductUrls.push(...catAnalysis.product_urls);

      // Follow pagination (up to 20 pages)
      let nextUrl = catAnalysis.next_page_url;
      let pageCount = 0;
      while (nextUrl && pageCount < 20) {
        pageCount++;
        onProgress?.("AI navigation", `Page ${pageCount + 1}: ${nextUrl}`);
        const pageHtml = await fetchPageHtml(nextUrl);
        if (!pageHtml) break;

        const pageAnalysis = await analyzePageWithAi(pageHtml, nextUrl, {
          manufacturer_name: manufacturerName,
          goal: "Extract all product page URLs from this product listing page",
        });
        allProductUrls.push(...pageAnalysis.product_urls);
        nextUrl = pageAnalysis.next_page_url;
      }
    }
  }

  // If we still haven't found enough, check product_urls from homepage too
  if (homeAnalysis.product_urls.length > 0) {
    allProductUrls.push(...homeAnalysis.product_urls);
  }

  // Deduplicate and cap
  const unique = Array.from(new Set(allProductUrls)).slice(0, 500);

  return {
    product_urls: unique,
    method: sitemapUrls.length > 0 ? "both" : "ai-navigation",
  };
}
