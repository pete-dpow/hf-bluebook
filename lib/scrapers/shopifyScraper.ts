/**
 * Shopify JSON API product scraper.
 * Fetches structured product data from /products.json — no Playwright needed.
 * Also enriches products with installation/application page content.
 * Works on Vercel serverless.
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
 * Looks for patterns like "BS EN 1366-3", "EN 13501-2", "EI 120", etc.
 */
function extractTestStandards(html: string): string[] {
  if (!html) return [];
  const text = stripHtml(html);
  const standards: string[] = [];

  // BS EN / EN standards
  const enMatches = text.match(/(?:BS\s+)?EN\s+\d[\d\-.:]+/gi);
  if (enMatches) {
    for (const m of enMatches) {
      const normalized = m.replace(/\s+/g, " ").trim();
      if (!standards.includes(normalized)) standards.push(normalized);
    }
  }

  // Fire ratings: EI 30, EI 60, EI 120, EI 240, etc.
  const ratingMatches = text.match(/EI\s*\d{2,3}/gi);
  if (ratingMatches) {
    for (const m of ratingMatches) {
      const normalized = m.replace(/\s+/g, " ").trim().toUpperCase();
      if (!standards.includes(normalized)) standards.push(normalized);
    }
  }

  // BS standards (without EN)
  const bsMatches = text.match(/BS\s+\d[\d\-.:]+/gi);
  if (bsMatches) {
    for (const m of bsMatches) {
      const normalized = m.replace(/\s+/g, " ").trim();
      // Skip if already captured as BS EN
      if (!standards.some((s) => s.includes(normalized))) standards.push(normalized);
    }
  }

  return standards;
}

/**
 * Derive the product code prefix from SKU for install page lookup.
 * e.g. "QWR25/CE" → "qwr", "PUTPAD-S" → "putpad", "QSS310ML" → "qss"
 */
function deriveCodePrefix(sku: string): string {
  // Remove trailing numbers, sizes, suffixes
  return sku
    .replace(/[\d\/\-].*/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Try to fetch a Shopify page's body_html via the JSON API.
 * Returns stripped text or null if the page doesn't exist or has no content.
 */
async function fetchPageContent(storeUrl: string, pageHandle: string): Promise<string | null> {
  try {
    const url = `${storeUrl}/pages/${pageHandle}.json`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0)",
      },
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

export async function scrapeShopifyProducts(
  config: ShopifyScraperConfig
): Promise<ScrapedProduct[]> {
  const storeUrl = config.store_url.replace(/\/+$/, "");
  const allProducts: ScrapedProduct[] = [];
  let page = 1;

  while (page <= 10) {
    const url = `${storeUrl}/products.json?limit=250&page=${page}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0; +https://hf-bluebook.vercel.app)",
        "Accept": "application/json",
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

    // Shopify returns up to 250 per page — if less, we've got everything
    if (products.length < 250) break;
    page++;
  }

  // Enrich products with install/application page content (parallel, best-effort)
  await enrichWithInstallPages(allProducts, storeUrl);

  return allProducts;
}

/**
 * For each product, try to fetch install/application pages from Shopify.
 * Pages follow the pattern /pages/install{code} and /pages/application{code}.
 */
async function enrichWithInstallPages(
  products: ScrapedProduct[],
  storeUrl: string
): Promise<void> {
  // Build a set of code prefixes we need to fetch
  const enrichTasks: { product: ScrapedProduct; codePrefix: string }[] = [];

  for (const p of products) {
    if (!p.product_code) continue;
    const prefix = deriveCodePrefix(p.product_code);
    if (prefix && prefix.length >= 2) {
      enrichTasks.push({ product: p, codePrefix: prefix });
    }
  }

  // Deduplicate by code prefix (multiple variants share the same install page)
  const seen = new Set<string>();
  const uniqueTasks = enrichTasks.filter((t) => {
    if (seen.has(t.codePrefix)) return false;
    seen.add(t.codePrefix);
    return true;
  });

  // Fetch install + application pages in parallel (max 10 concurrent)
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

    // Apply results to products
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value.content) continue;
      const { codePrefix, type, content } = result.value;

      // Apply to all products sharing this code prefix
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

  // Use first variant SKU as product code, fallback to handle
  const primarySku = product.variants.find((v) => v.sku)?.sku;
  const productCode = primarySku || product.handle;

  // Build specifications from variants and tags
  const specs: Record<string, string> = {};

  // Product type from Shopify
  if (product.product_type) {
    specs["Product Type"] = product.product_type;
  }

  // Add tags as category
  if (product.tags.length > 0) {
    specs["Category"] = product.tags.join(", ");
  }

  // Extract test standards from body_html
  const standards = extractTestStandards(product.body_html);
  if (standards.length > 0) {
    specs["Test Standards"] = standards.join(", ");
  }

  // Add variant info
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

  // Price — Shopify B2B often shows 0
  const firstPrice = product.variants[0]?.price;
  const priceText =
    firstPrice && parseFloat(firstPrice) > 0
      ? `£${firstPrice}`
      : "Quote on request";

  // Collect image URLs
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
