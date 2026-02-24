/**
 * Shopify product scraper.
 * 1. Fetches product catalogue from /products.json (structured data)
 * 2. Fetches each product's HTML page to extract PDF download links
 * 3. Fetches install/application pages for technical details
 * Works on Vercel serverless — no Playwright needed.
 */

import type { ScrapedProduct } from "./playwrightScraper";

export interface ShopifyScraperConfig {
  type: "shopify";
  store_url: string;
  default_pillar?: string;
  installation_details_url?: string;
}

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  price: string;
  available: boolean;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: ShopifyVariant[];
  images: { src: string }[];
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

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

/**
 * Extract test standard references from HTML description.
 */
function extractTestStandards(html: string): string[] {
  if (!html) return [];
  const text = stripHtml(html);
  const standards: string[] = [];

  const enMatches = text.match(/(?:BS\s+)?EN\s+\d[\d\-.:]+/gi);
  if (enMatches) {
    for (const m of enMatches) {
      const normalized = m.replace(/\s+/g, " ").trim();
      if (!standards.includes(normalized)) standards.push(normalized);
    }
  }

  const ratingMatches = text.match(/EI\s*\d{2,3}/gi);
  if (ratingMatches) {
    for (const m of ratingMatches) {
      const normalized = m.replace(/\s+/g, " ").trim().toUpperCase();
      if (!standards.includes(normalized)) standards.push(normalized);
    }
  }

  return standards;
}

/**
 * Fetch a product's HTML page and extract all PDF URLs.
 * PDFs are hosted on S3 (quelfire.s3.eu-west-2.amazonaws.com) and embedded in the HTML.
 */
async function extractPdfUrls(productPageUrl: string): Promise<string[]> {
  try {
    const res = await fetch(productPageUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract all PDF URLs from the page HTML
    const pdfRegex = /https?:\/\/[^"'\s<>]+\.pdf/gi;
    const matches = html.match(pdfRegex) || [];

    // Deduplicate
    return Array.from(new Set(matches));
  } catch {
    return [];
  }
}

/**
 * Categorise a PDF URL by its S3 path.
 * Returns a human-readable type like "Product Data Sheet", "Installation Instructions", etc.
 */
function categorizePdf(url: string): { type: string; name: string } {
  const path = url.toLowerCase();
  const filename = url.split("/").pop() || url;
  const name = filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (path.includes("product-data-sheet")) return { type: "datasheet", name };
  if (path.includes("installation-instruction")) return { type: "installation_guide", name };
  if (path.includes("coshh")) return { type: "certificate", name };
  if (path.includes("declaration-of-performance") || path.includes("dop")) return { type: "certificate", name };
  if (path.includes("certificate-of-constancy") || path.includes("ccp")) return { type: "certificate", name };
  if (path.includes("standard-installation-detail")) return { type: "installation_guide", name };
  if (path.includes("acoustic")) return { type: "datasheet", name };
  return { type: "other", name };
}

/**
 * Derive the product code prefix from SKU for install page lookup.
 */
function deriveCodePrefix(sku: string): string {
  return sku
    .replace(/[\d\/\-].*/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Try to fetch a Shopify page's body_html via the JSON API.
 */
async function fetchPageContent(storeUrl: string, pageHandle: string): Promise<string | null> {
  try {
    const url = `${storeUrl}/pages/${pageHandle}.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const html = data?.page?.body_html;
    if (!html || html.trim().length < 20) return null;
    return stripHtml(html);
  } catch {
    return null;
  }
}

export type ScrapeProgressCallback = (progress: {
  stage: string;
  current: number;
  total: number;
  found: number;
}) => void;

const MAX_RUNTIME_MS = 50_000; // stop 10s before Vercel 60s limit

export async function scrapeShopifyProducts(
  config: ShopifyScraperConfig,
  onProgress?: ScrapeProgressCallback
): Promise<ScrapedProduct[]> {
  const startTime = Date.now();
  const storeUrl = config.store_url.replace(/\/+$/, "");
  const allProducts: ScrapedProduct[] = [];
  let page = 1;

  // Step 1: Fetch product catalogue from JSON API
  onProgress?.({ stage: "Fetching product catalog", current: 0, total: 0, found: 0 });

  while (page <= 10) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      console.warn(`[shopifyScraper] Timeout approaching — stopping at page ${page}`);
      break;
    }

    const url = `${storeUrl}/products.json?limit=250&page=${page}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0; +https://hf-bluebook.vercel.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const products: ShopifyProduct[] = data.products || [];

    if (products.length === 0) break;

    for (const product of products) {
      const mapped = mapShopifyProduct(product, storeUrl);
      if (mapped) allProducts.push(mapped);
    }

    onProgress?.({ stage: "Fetching product catalog", current: page, total: 10, found: allProducts.length });

    if (products.length < 250) break;
    page++;
  }

  console.log(`[shopifyScraper] Fetched ${allProducts.length} products from ${page} pages`);

  // Step 2: Fetch each product's HTML page to extract PDF download links
  const batchSize = 5;
  for (let i = 0; i < allProducts.length; i += batchSize) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      console.warn(`[shopifyScraper] Timeout approaching — extracted PDFs for ${i}/${allProducts.length} products`);
      break;
    }

    const batch = allProducts.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((p) => extractPdfUrls(p.source_url))
    );
    for (let j = 0; j < batch.length; j++) {
      if (results[j].status === "fulfilled") {
        batch[j].pdf_urls = (results[j] as PromiseFulfilledResult<string[]>).value;
      }
    }

    onProgress?.({ stage: "Extracting PDF links", current: Math.min(i + batchSize, allProducts.length), total: allProducts.length, found: allProducts.length });
  }

  // Step 3: Enrich with install/application page content (only if time remains)
  if (Date.now() - startTime < MAX_RUNTIME_MS - 5000) {
    onProgress?.({ stage: "Fetching install guides", current: 0, total: allProducts.length, found: allProducts.length });
    await enrichWithInstallPages(allProducts, storeUrl);
  } else {
    console.warn(`[shopifyScraper] Skipping install page enrichment — low on time`);
  }

  onProgress?.({ stage: "Complete", current: allProducts.length, total: allProducts.length, found: allProducts.length });
  return allProducts;
}

/**
 * For each product, try to fetch install/application pages from Shopify.
 */
async function enrichWithInstallPages(
  products: ScrapedProduct[],
  storeUrl: string
): Promise<void> {
  const enrichTasks: { product: ScrapedProduct; codePrefix: string }[] = [];

  for (const p of products) {
    if (!p.product_code) continue;
    const prefix = deriveCodePrefix(p.product_code);
    if (prefix && prefix.length >= 2) {
      enrichTasks.push({ product: p, codePrefix: prefix });
    }
  }

  const seen = new Set<string>();
  const uniqueTasks = enrichTasks.filter((t) => {
    if (seen.has(t.codePrefix)) return false;
    seen.add(t.codePrefix);
    return true;
  });

  const batchSize = 10;
  for (let i = 0; i < uniqueTasks.length; i += batchSize) {
    const batch = uniqueTasks.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.flatMap((t) => [
        fetchPageContent(storeUrl, `install${t.codePrefix}`).then((content) => ({
          codePrefix: t.codePrefix,
          type: "installation" as const,
          content,
        })),
        fetchPageContent(storeUrl, `application${t.codePrefix}`).then((content) => ({
          codePrefix: t.codePrefix,
          type: "application" as const,
          content,
        })),
      ])
    );

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.content) continue;
      const { codePrefix, type, content } = result.value;

      for (const task of enrichTasks) {
        if (task.codePrefix === codePrefix) {
          const key = type === "installation" ? "Installation Details" : "Application Guide";
          task.product.specifications[key] = content.slice(0, 2000);
        }
      }
    }
  }
}

function mapShopifyProduct(
  product: ShopifyProduct,
  storeUrl: string
): ScrapedProduct {
  const description = product.body_html ? stripHtml(product.body_html) : "";

  const primarySku = product.variants.find((v) => v.sku)?.sku;
  const productCode = primarySku || product.handle;

  const specs: Record<string, string> = {};

  if (product.product_type) {
    specs["Product Type"] = product.product_type;
  }

  if (product.tags.length > 0) {
    specs["Category"] = product.tags.join(", ");
  }

  const standards = extractTestStandards(product.body_html);
  if (standards.length > 0) {
    specs["Test Standards"] = standards.join(", ");
  }

  if (product.variants.length > 1) {
    const variantSizes = product.variants
      .map((v) => v.title)
      .filter((t) => t !== "Default Title");
    if (variantSizes.length > 0) {
      specs["Available Sizes"] = variantSizes.join(", ");
    }

    const skus = product.variants
      .map((v) => v.sku)
      .filter(Boolean);
    if (skus.length > 0) {
      specs["SKUs"] = skus.join(", ");
    }
  }

  specs["Variants"] = String(product.variants.length);
  specs["Vendor"] = product.vendor || "Unknown";

  const firstPrice = product.variants[0]?.price;
  const priceText =
    firstPrice && parseFloat(firstPrice) > 0
      ? `£${firstPrice}`
      : "Quote on request";

  const imageUrls = product.images?.map((img) => img.src).filter(Boolean) || [];

  return {
    product_name: product.title,
    product_code: productCode,
    description,
    specifications: specs,
    price_text: priceText,
    pdf_urls: [],
    image_urls: imageUrls,
    source_url: `${storeUrl}/products/${product.handle}`,
  };
}

export { categorizePdf };
