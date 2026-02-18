import { chromium, type Browser, type Page } from "playwright";

interface ScraperConfig {
  product_list_url: string;
  product_list_selector: string;
  product_name_selector: string;
  product_link_selector: string;
  product_detail_selectors: {
    description?: string;
    specs?: string;
    price?: string;
    pdf_link?: string;
  };
  pagination?: {
    type: "next_button" | "load_more" | "none";
    selector?: string;
    max_pages?: number;
  };
}

interface RegulationScraperConfig {
  source_url: string;
  section_selector: string;
  content_selector: string;
  section_ref_selector?: string;
}

export interface ScrapedProduct {
  product_name: string;
  product_code?: string;
  description?: string;
  specifications: Record<string, string>;
  price_text?: string;
  pdf_urls: string[];
  image_urls?: string[];
  source_url: string;
}

export interface ScrapedSection {
  section_ref?: string;
  section_title?: string;
  section_text: string;
  page_number?: number;
}

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

export async function scrapeManufacturerProducts(
  config: ScraperConfig,
  onProgress?: (current: number, total: number, found: number) => void
): Promise<ScrapedProduct[]> {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const products: ScrapedProduct[] = [];

  try {
    let currentPage = 1;
    const maxPages = config.pagination?.max_pages || 50;

    await page.goto(config.product_list_url, { waitUntil: "networkidle", timeout: 30000 });

    while (currentPage <= maxPages) {
      // Get product links on current page
      const productLinks = await page.$$eval(
        config.product_list_selector,
        (els, selectors) => {
          return els.map((el) => {
            const nameEl = el.querySelector(selectors.name);
            const linkEl = el.querySelector(selectors.link) as HTMLAnchorElement | null;
            return {
              name: nameEl?.textContent?.trim() || "",
              url: linkEl?.href || "",
            };
          });
        },
        { name: config.product_name_selector, link: config.product_link_selector }
      );

      // Scrape each product detail page
      for (const link of productLinks) {
        if (!link.url) continue;
        try {
          const product = await scrapeProductDetail(page, link.url, link.name, config);
          products.push(product);
        } catch (err) {
          console.error(`Failed to scrape ${link.url}:`, err);
        }
      }

      onProgress?.(currentPage, maxPages, products.length);

      // Handle pagination
      if (config.pagination?.type === "next_button" && config.pagination.selector) {
        const nextBtn = await page.$(config.pagination.selector);
        if (!nextBtn) break;
        await nextBtn.click();
        await page.waitForLoadState("networkidle");
        currentPage++;
      } else {
        break;
      }
    }
  } finally {
    await browser.close();
  }

  return products;
}

async function scrapeProductDetail(
  page: Page,
  url: string,
  name: string,
  config: ScraperConfig
): Promise<ScrapedProduct> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  const selectors = config.product_detail_selectors;

  const description = selectors.description
    ? await page.$eval(selectors.description, (el) => el.textContent?.trim() || "").catch(() => "")
    : "";

  const specifications: Record<string, string> = {};
  if (selectors.specs) {
    const rows = await page.$$(selectors.specs);
    for (const row of rows) {
      const cells = await row.$$("td, th");
      if (cells.length >= 2) {
        const key = await cells[0].textContent();
        const val = await cells[1].textContent();
        if (key && val) {
          specifications[key.trim()] = val.trim();
        }
      }
    }
  }

  const priceText = selectors.price
    ? await page.$eval(selectors.price, (el) => el.textContent?.trim() || "").catch(() => "")
    : "";

  const pdfUrls: string[] = [];
  if (selectors.pdf_link) {
    const links = await page.$$(selectors.pdf_link);
    for (const link of links) {
      const href = await link.getAttribute("href");
      if (href) pdfUrls.push(new URL(href, url).toString());
    }
  }

  return {
    product_name: name,
    description: description as string,
    specifications,
    price_text: priceText as string,
    pdf_urls: pdfUrls,
    source_url: url,
  };
}

export async function scrapeRegulationSections(
  config: RegulationScraperConfig
): Promise<ScrapedSection[]> {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  const sections: ScrapedSection[] = [];

  try {
    await page.goto(config.source_url, { waitUntil: "networkidle", timeout: 30000 });

    const elements = await page.$$(config.section_selector);

    for (const el of elements) {
      const title = await el.textContent();
      const ref = config.section_ref_selector
        ? await el.$eval(config.section_ref_selector, (r) => r.textContent?.trim() || "").catch(() => "")
        : "";

      // Get content following this section header
      const content = await el.evaluate((node, contentSel) => {
        const texts: string[] = [];
        let sibling = node.nextElementSibling;
        while (sibling && !sibling.matches(contentSel)) {
          texts.push(sibling.textContent?.trim() || "");
          sibling = sibling.nextElementSibling;
        }
        return texts.filter(Boolean).join("\n");
      }, config.section_selector);

      if (title || content) {
        sections.push({
          section_ref: ref as string,
          section_title: title?.trim() || "",
          section_text: content || title?.trim() || "",
        });
      }
    }
  } finally {
    await browser.close();
  }

  return sections;
}
