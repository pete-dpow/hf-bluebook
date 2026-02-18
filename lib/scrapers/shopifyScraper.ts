/**
 * Shopify JSON API product scraper.
 * Fetches structured product data from /products.json — no Playwright needed.
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

  return allProducts;
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

  // Add tags as category
  if (product.tags.length > 0) {
    specs["Category"] = product.tags.join(", ");
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
  specs["Vendor"] = product.vendor || "Quelfire";

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
