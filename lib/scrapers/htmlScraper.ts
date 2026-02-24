/**
 * Generic HTML scraper engine.
 * Works on Vercel serverless — no Playwright needed.
 * Supports four extraction methods:
 *   - "html"         : regex-based extraction from product detail pages
 *   - "json-ld"      : parse <script type="application/ld+json"> from detail pages
 *   - "listing-only" : extract all data from listing page cards (no detail page fetch)
 *   - "sitemap"      : extract product data from sitemap XML URLs (no page fetch needed)
 * Also supports a JSON API mode via the optional `api` config.
 */

import type { ScrapedProduct } from "./playwrightScraper";

export interface HtmlScraperConfig {
  type: "html";
  base_url: string;
  default_pillar: string;
  listing: {
    urls: string[];
    pagination?: string;           // URL template with {page} placeholder
    max_pages?: number;
    product_link_pattern: string;  // regex string
  };
  detail: {
    method: "html" | "json-ld" | "listing-only" | "sitemap";
    name_pattern?: string;
    description_pattern?: string;
    spec_table_pattern?: string;
    pdf_pattern?: string;
    image_pattern?: string;
    json_ld_type?: string;
  };
  api?: {
    url: string;
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body_template?: string;
    results_path?: string;
    name_field?: string;
    description_field?: string;
    url_field?: string;
    code_field?: string;
  };
  request?: {
    delay_ms?: number;
    timeout_ms?: number;
    batch_size?: number;
    headers?: Record<string, string>;
  };
}

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const MAX_RUNTIME_MS = 50_000; // stop 10s before Vercel 60s limit

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

function resolveUrl(href: string, baseUrl: string): string {
  if (href.startsWith("http")) return href;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return baseUrl.replace(/\/+$/, "") + (href.startsWith("/") ? href : "/" + href);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeFetch(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[htmlScraper] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    return await res.text();
  } catch (err: any) {
    console.warn(`[htmlScraper] Fetch failed — ${url}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// JSON-LD extraction
// ---------------------------------------------------------------------------

function extractJsonLd(html: string, targetType: string): Record<string, any> | null {
  const regex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data["@type"] === targetType) return data;
      if (Array.isArray(data)) {
        const found = data.find((item: any) => item["@type"] === targetType);
        if (found) return found;
      }
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        const found = data["@graph"].find((item: any) => item["@type"] === targetType);
        if (found) return found;
      }
    } catch { /* skip malformed JSON-LD */ }
  }
  return null;
}

function jsonLdToProduct(ld: Record<string, any>, sourceUrl: string): ScrapedProduct {
  const specs: Record<string, string> = {};

  if (ld.brand) specs["Brand"] = typeof ld.brand === "string" ? ld.brand : ld.brand.name || "";
  if (ld.category) specs["Category"] = ld.category;
  if (ld.material) specs["Material"] = ld.material;
  if (ld.weight) specs["Weight"] = typeof ld.weight === "string" ? ld.weight : ld.weight.value || "";

  if (ld.additionalProperty && Array.isArray(ld.additionalProperty)) {
    for (const prop of ld.additionalProperty) {
      if (prop.name && prop.value) specs[prop.name] = String(prop.value);
    }
  }

  const imageUrls: string[] = [];
  if (ld.image) {
    const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
    for (const img of imgs) {
      imageUrls.push(typeof img === "string" ? img : img.url || img.contentUrl || "");
    }
  }

  return {
    product_name: ld.name || "",
    product_code: ld.sku || ld.productID || undefined,
    description: ld.description ? stripHtml(ld.description) : undefined,
    specifications: specs,
    price_text: ld.offers?.price ? `£${ld.offers.price}` : undefined,
    pdf_urls: [],
    image_urls: imageUrls.filter(Boolean),
    source_url: sourceUrl,
  };
}

// ---------------------------------------------------------------------------
// Regex-based extraction
// ---------------------------------------------------------------------------

function firstMatch(html: string, patternStr: string | undefined): string | null {
  if (!patternStr) return null;
  try {
    const match = new RegExp(patternStr, "i").exec(html);
    return match ? stripHtml(match[1]) : null;
  } catch {
    return null;
  }
}

function allMatches(html: string, patternStr: string | undefined): string[] {
  if (!patternStr) return [];
  try {
    const regex = new RegExp(patternStr, "gi");
    const results: string[] = [];
    let m;
    while ((m = regex.exec(html)) !== null) {
      const val = m[1]?.trim();
      if (val && !results.includes(val)) results.push(val);
    }
    return results;
  } catch {
    return [];
  }
}

function extractSpecTable(html: string, patternStr: string | undefined): Record<string, string> {
  if (!patternStr) return {};
  const specs: Record<string, string> = {};
  try {
    const regex = new RegExp(patternStr, "gi");
    let m;
    while ((m = regex.exec(html)) !== null) {
      const key = stripHtml(m[1] || "");
      const val = stripHtml(m[2] || "");
      if (key && val) specs[key] = val;
    }
  } catch { /* ignore bad pattern */ }
  return specs;
}

// ---------------------------------------------------------------------------
// Listing-only extraction (e.g. Hilti technical library cards)
// ---------------------------------------------------------------------------

function extractFromListingHtml(
  html: string,
  config: HtmlScraperConfig
): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const { detail, base_url } = config;

  // Split HTML into per-product chunks using the link pattern
  // We extract the product link pattern matches and surrounding context
  const linkPattern = config.listing.product_link_pattern;
  const linkRegex = new RegExp(linkPattern, "gi");

  // For listing-only, we also need the name pattern to find product cards
  // Strategy: find all name matches and all link matches, then pair them
  const names = detail.name_pattern ? allMatches(html, detail.name_pattern) : [];
  const links = allMatches(html, linkPattern);
  const pdfUrls = detail.pdf_pattern ? allMatches(html, detail.pdf_pattern) : links;

  // Pair names with links (they appear in order on the page)
  const count = Math.min(names.length, pdfUrls.length || links.length);
  for (let i = 0; i < count; i++) {
    const rawUrl = pdfUrls[i] || links[i];
    const url = resolveUrl(rawUrl, base_url);
    products.push({
      product_name: names[i] || `Document ${i + 1}`,
      specifications: {},
      pdf_urls: rawUrl.match(/\.pdf/i) || rawUrl.match(/media-canonical/i) ? [url] : [],
      source_url: url,
    });
  }

  // Fallback: if no names found but links exist, use links as products
  if (count === 0 && links.length > 0) {
    for (const link of links) {
      const url = resolveUrl(link, base_url);
      const name = link.split("/").pop()?.replace(/[-_]/g, " ").replace(/\.\w+$/, "") || "Unknown";
      products.push({
        product_name: name,
        specifications: {},
        pdf_urls: [url],
        source_url: url,
      });
    }
  }

  return products;
}

// ---------------------------------------------------------------------------
// Sitemap-based extraction (for sites behind Cloudflare / JS walls)
// ---------------------------------------------------------------------------

function titleCase(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractFromSitemapUrls(urls: string[], baseUrl: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];

  for (const url of urls) {
    let path: string;
    try {
      path = new URL(url).pathname;
    } catch {
      continue;
    }

    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2) continue;

    const lastSegment = segments[segments.length - 1];

    // White Book Specification URLs:
    // /Specification/White-Book-Specification-Selector/{category}/{system}/{code}
    if (path.toLowerCase().includes("/white-book-specification-selector/")) {
      const selectorIdx = segments.findIndex(
        (s) => s.toLowerCase() === "white-book-specification-selector"
      );
      if (selectorIdx < 0 || selectorIdx + 3 > segments.length) continue;

      // Skip overview pages
      if (segments[selectorIdx + 1]?.toLowerCase() === "white-book-overview") continue;

      const category = segments[selectorIdx + 1]; // e.g. "shaftwall"
      const system = segments[selectorIdx + 2]; // e.g. "gypwall-shaft"
      const codeRaw = segments[selectorIdx + 3] || lastSegment; // e.g. "a306005-a-en"

      // Clean up code: remove -en suffix and -mr1 variants
      const code = codeRaw
        .replace(/-en$/, "")
        .toUpperCase();

      const systemName = titleCase(system);
      const categoryName = titleCase(category);

      products.push({
        product_name: `${systemName} ${code}`,
        product_code: code,
        description: `${systemName} system specification — ${categoryName}. British Gypsum White Book reference ${code}.`,
        specifications: {
          Category: categoryName,
          System: systemName,
          "Reference Code": code,
          "White Book Section": categoryName,
        },
        pdf_urls: [],
        source_url: url,
      });
      continue;
    }

    // Standard product URLs: /products/{category}/{product-slug}
    if (path.toLowerCase().includes("/products/")) {
      const prodIdx = segments.findIndex((s) => s.toLowerCase() === "products");
      if (prodIdx < 0) continue;

      const category = segments[prodIdx + 1] || "";
      const productSlug = segments[prodIdx + 2] || segments[prodIdx + 1] || lastSegment;

      const productName = titleCase(productSlug);
      const categoryName = titleCase(category);

      products.push({
        product_name: productName,
        product_code: productSlug,
        description: `${productName} — ${categoryName}. British Gypsum product.`,
        specifications: {
          Category: categoryName,
        },
        pdf_urls: [],
        source_url: url,
      });
      continue;
    }

    // Generic fallback: use last URL segment as product name
    const productName = titleCase(lastSegment);
    products.push({
      product_name: productName,
      product_code: lastSegment,
      specifications: {},
      pdf_urls: [],
      source_url: url,
    });
  }

  return products;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function scrapeWithHtmlConfig(
  config: HtmlScraperConfig
): Promise<ScrapedProduct[]> {
  if (config.api) {
    return fetchFromApi(config);
  }
  return discoverAndScrape(config);
}

async function discoverAndScrape(config: HtmlScraperConfig): Promise<ScrapedProduct[]> {
  const startTime = Date.now();
  const headers = { ...DEFAULT_HEADERS, ...config.request?.headers };
  const delay = config.request?.delay_ms ?? 500;
  const timeout = config.request?.timeout_ms ?? 10_000;
  const batchSize = config.request?.batch_size ?? 5;
  const allProducts: ScrapedProduct[] = [];

  // 1. Fetch all listing pages
  const listingHtmls: string[] = [];

  for (const url of config.listing.urls) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) break;
    const html = await safeFetch(url, headers, timeout);
    if (html) listingHtmls.push(html);
    if (delay > 0) await sleep(delay);
  }

  // Fetch paginated pages if configured
  if (config.listing.pagination) {
    const maxPages = config.listing.max_pages ?? 10;
    for (let page = 2; page <= maxPages; page++) {
      if (Date.now() - startTime > MAX_RUNTIME_MS) break;
      const url = config.listing.pagination.replace("{page}", String(page));
      const html = await safeFetch(url, headers, timeout);
      if (!html) break; // stop pagination on first failure
      listingHtmls.push(html);
      if (delay > 0) await sleep(delay);
    }
  }

  console.log(`[htmlScraper] Fetched ${listingHtmls.length} listing pages`);

  // 2. For listing-only method, extract directly from listing HTML
  if (config.detail.method === "listing-only") {
    for (const html of listingHtmls) {
      allProducts.push(...extractFromListingHtml(html, config));
    }
    console.log(`[htmlScraper] Extracted ${allProducts.length} products from listings`);
    return dedup(allProducts);
  }

  // 2b. For sitemap method, extract URLs from XML then parse product data from URLs
  if (config.detail.method === "sitemap") {
    const productUrls: string[] = [];
    const linkRegex = new RegExp(config.listing.product_link_pattern, "gi");

    for (const xml of listingHtmls) {
      let m;
      while ((m = linkRegex.exec(xml)) !== null) {
        const url = resolveUrl(m[1], config.base_url);
        if (!productUrls.includes(url)) productUrls.push(url);
      }
    }

    console.log(`[htmlScraper] Found ${productUrls.length} URLs from sitemap`);
    const products = extractFromSitemapUrls(productUrls, config.base_url);
    console.log(`[htmlScraper] Extracted ${products.length} products from sitemap URLs`);
    return dedup(products);
  }

  // 3. Extract product detail URLs from listing HTML
  const productUrls = new Set<string>();
  const linkRegex = new RegExp(config.listing.product_link_pattern, "gi");

  for (const html of listingHtmls) {
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const url = resolveUrl(m[1], config.base_url);
      productUrls.add(url);
    }
  }

  console.log(`[htmlScraper] Found ${productUrls.size} product URLs`);
  if (productUrls.size === 0) return [];

  // 4. Scrape detail pages in batches
  const urls = Array.from(productUrls);
  for (let i = 0; i < urls.length; i += batchSize) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      console.warn(`[htmlScraper] Timeout approaching — scraped ${allProducts.length}/${urls.length} products`);
      break;
    }

    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((url) => scrapeDetailPage(url, config, headers, timeout))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        allProducts.push(result.value);
      }
    }

    if (delay > 0 && i + batchSize < urls.length) {
      await sleep(delay);
    }
  }

  console.log(`[htmlScraper] Scraped ${allProducts.length} products from ${urls.length} detail pages`);
  return dedup(allProducts);
}

async function scrapeDetailPage(
  url: string,
  config: HtmlScraperConfig,
  headers: Record<string, string>,
  timeout: number
): Promise<ScrapedProduct | null> {
  const html = await safeFetch(url, headers, timeout);
  if (!html) return null;

  const { detail, base_url } = config;

  // JSON-LD method
  if (detail.method === "json-ld" && detail.json_ld_type) {
    const ld = extractJsonLd(html, detail.json_ld_type);
    if (ld) {
      const product = jsonLdToProduct(ld, url);
      // Also extract PDFs from HTML even if we got JSON-LD
      const pdfUrls = allMatches(html, detail.pdf_pattern).map((u) => resolveUrl(u, base_url));
      product.pdf_urls = pdfUrls;
      return product;
    }
    // Fall through to regex if no JSON-LD found
  }

  // Regex method
  const name = firstMatch(html, detail.name_pattern);
  if (!name) return null; // skip pages where we can't find a product name

  const description = firstMatch(html, detail.description_pattern);
  const specs = extractSpecTable(html, detail.spec_table_pattern);
  const pdfUrls = allMatches(html, detail.pdf_pattern).map((u) => resolveUrl(u, base_url));
  const imageUrls = allMatches(html, detail.image_pattern).map((u) => resolveUrl(u, base_url));

  return {
    product_name: name,
    description: description || undefined,
    specifications: specs,
    pdf_urls: pdfUrls,
    image_urls: imageUrls.length > 0 ? imageUrls : undefined,
    source_url: url,
  };
}

// ---------------------------------------------------------------------------
// JSON API mode
// ---------------------------------------------------------------------------

async function fetchFromApi(config: HtmlScraperConfig): Promise<ScrapedProduct[]> {
  const api = config.api!;
  const headers = { ...DEFAULT_HEADERS, ...api.headers, ...config.request?.headers };
  const timeout = config.request?.timeout_ms ?? 10_000;
  const products: ScrapedProduct[] = [];

  const method = api.method || "GET";
  const fetchOpts: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(timeout),
  };

  if (method === "POST" && api.body_template) {
    fetchOpts.body = api.body_template;
    (fetchOpts.headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(api.url, fetchOpts);
    if (!res.ok) {
      console.warn(`[htmlScraper] API ${res.status} — ${api.url}`);
      return [];
    }

    const json = await res.json();

    // Navigate to results array using dot path
    let items = json;
    if (api.results_path) {
      for (const key of api.results_path.split(".")) {
        items = items?.[key];
      }
    }
    if (!Array.isArray(items)) return [];

    for (const item of items) {
      const name = api.name_field ? item[api.name_field] : item.name || item.title;
      if (!name) continue;

      products.push({
        product_name: String(name),
        product_code: api.code_field ? String(item[api.code_field] || "") : undefined,
        description: api.description_field ? stripHtml(String(item[api.description_field] || "")) : undefined,
        specifications: {},
        pdf_urls: [],
        source_url: api.url_field ? resolveUrl(String(item[api.url_field] || ""), config.base_url) : config.base_url,
      });
    }
  } catch (err: any) {
    console.error(`[htmlScraper] API fetch failed:`, err.message);
  }

  return products;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function dedup(products: ScrapedProduct[]): ScrapedProduct[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const key = p.source_url || p.product_name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
