/**
 * Test: Enhanced discovery — does the AI scraper find section URLs
 * (resources, documentation, downloads) from the homepage?
 */
import { sanitizeHtml, analyzePageWithAi } from "../lib/scrapers/aiScraper";

const HOMEPAGE = "https://www.rockwool.com/uk/";
const RESOURCE_PAGE = "https://www.rockwool.com/uk/resources-and-tools/product-documentation/";

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function main() {
  // Test 1: Does the homepage reveal section URLs?
  console.log(`\n━━━ Test 1: Homepage section discovery ━━━`);
  console.log(`Fetching: ${HOMEPAGE}\n`);

  const homepageHtml = await fetchPage(HOMEPAGE);
  if (!homepageHtml) { console.log("Failed to fetch homepage"); return; }

  const homeSanitized = sanitizeHtml(homepageHtml);
  console.log(`Raw: ${homepageHtml.length} → Sanitized: ${homeSanitized.length} chars\n`);

  const homeAnalysis = await analyzePageWithAi(homeSanitized, HOMEPAGE, {
    manufacturer_name: "Rockwool",
    goal: "Find the products/catalogue section AND any resources/documentation/downloads sections of this fire protection manufacturer website",
  });

  console.log(`Page type: ${homeAnalysis.page_type} (confidence: ${homeAnalysis.confidence})`);
  console.log(`Catalogue link: ${homeAnalysis.catalogue_link || "none"}`);
  console.log(`Product URLs: ${homeAnalysis.product_urls.length}`);
  console.log(`Section URLs: ${homeAnalysis.section_urls.length}`);
  if (homeAnalysis.section_urls.length > 0) {
    console.log("Sections found:");
    for (const u of homeAnalysis.section_urls) console.log(`  ✓ ${u}`);
  }
  console.log(`PDF URLs: ${homeAnalysis.pdf_urls.length}`);

  // Test 2: What does the resource/documentation page look like?
  console.log(`\n━━━ Test 2: Resource page analysis ━━━`);
  console.log(`Fetching: ${RESOURCE_PAGE}\n`);

  const resourceHtml = await fetchPage(RESOURCE_PAGE);
  if (!resourceHtml) { console.log("Failed to fetch resource page"); return; }

  const resSanitized = sanitizeHtml(resourceHtml);
  console.log(`Raw: ${resourceHtml.length} → Sanitized: ${resSanitized.length} chars\n`);

  const resAnalysis = await analyzePageWithAi(resSanitized, RESOURCE_PAGE, {
    manufacturer_name: "Rockwool",
    goal: "Extract product page URLs, PDF download links (datasheets, technical data sheets, certificates, installation guides), and any sub-section links from this page",
  });

  console.log(`Page type: ${resAnalysis.page_type} (confidence: ${resAnalysis.confidence})`);
  console.log(`Product URLs: ${resAnalysis.product_urls.length}`);
  if (resAnalysis.product_urls.length > 0) {
    console.log("Product URLs:");
    for (const u of resAnalysis.product_urls.slice(0, 10)) console.log(`  ${u}`);
  }
  console.log(`Section URLs: ${resAnalysis.section_urls.length}`);
  if (resAnalysis.section_urls.length > 0) {
    console.log("Sub-sections:");
    for (const u of resAnalysis.section_urls) console.log(`  ✓ ${u}`);
  }
  console.log(`PDF URLs: ${resAnalysis.pdf_urls.length}`);
  if (resAnalysis.pdf_urls.length > 0) {
    console.log("PDFs found:");
    for (const u of resAnalysis.pdf_urls.slice(0, 10)) console.log(`  📄 ${u}`);
  }

  console.log(`\n━━━ Done ━━━\n`);
}

main().catch(console.error);
