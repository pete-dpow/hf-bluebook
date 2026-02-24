/**
 * Regulation-specific scraping logic.
 * Uses fetch() + HTML parsing by default (works on Vercel).
 * Falls back to Playwright via Inngest for complex JS-rendered pages.
 *
 * Site-specific parsers:
 * - legislation.gov.uk — fetches whole-Act pages, parses section headings
 * - Generic fallback — heading-based HTML extraction
 */

import { generateEmbedding } from "@/lib/embeddingService";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface ScrapedSection {
  section_ref: string;
  section_title: string;
  section_text: string;
  page_number?: number;
}

export interface RegulationScraperConfig {
  source_url: string;
  section_selector: string;
  content_selector: string;
  section_ref_selector?: string;
  type?: string;            // e.g. "legislation_gov_uk"
  provision_type?: string;  // e.g. "section", "regulation", "article"
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0; +https://hf-bluebook.vercel.app)",
  "Accept": "text/html,application/xhtml+xml",
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Fetch and extract sections from a regulation source URL.
 * Routes to site-specific parsers when available.
 */
export async function fetchRegulationSections(
  config: RegulationScraperConfig
): Promise<ScrapedSection[]> {
  // Route: legislation.gov.uk
  if (
    config.type === "legislation_gov_uk" ||
    config.source_url.includes("legislation.gov.uk")
  ) {
    return fetchLegislationSections(config);
  }

  // Generic fallback
  const res = await fetch(config.source_url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${config.source_url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  return extractSectionsFromHtml(html);
}

// ---------------------------------------------------------------------------
// legislation.gov.uk scraper
// ---------------------------------------------------------------------------

/**
 * Scrape legislation.gov.uk — fetches the whole-Act page and extracts
 * each Section/Regulation/Article as a separate ScrapedSection.
 */
async function fetchLegislationSections(
  config: RegulationScraperConfig
): Promise<ScrapedSection[]> {
  // Convert /contents/ URL to whole-Act URL
  let url = config.source_url;
  url = url.replace(/\/contents\//, "/");

  // Determine provision type from URL or config
  const provisionType = config.provision_type || detectProvisionType(url);

  // Fetch the whole-Act page (larger page, longer timeout)
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();

  if (html.length < 1000) {
    throw new Error(`legislation.gov.uk returned very short response (${html.length} chars) — possibly a redirect or empty page`);
  }

  const sections = parseLegislationHtml(html, provisionType);

  // Fallback: if heading-based parser found nothing, try generic HTML extraction
  if (sections.length === 0) {
    console.warn(`[legislation] Heading-based parser found 0 sections for ${url}, falling back to generic HTML extraction`);
    return extractSectionsFromHtml(html);
  }

  return sections;
}

/**
 * Detect provision type from a legislation.gov.uk URL.
 * - /ukpga/ = Primary legislation → "Section"
 * - /uksi/  = Statutory Instrument → "Regulation" (or "Article" for some SIs)
 */
function detectProvisionType(url: string): string {
  if (url.includes("/ukpga/")) return "section";
  if (url.includes("/uksi/")) return "regulation";
  return "section";
}

/**
 * Parse legislation.gov.uk HTML into sections.
 *
 * legislation.gov.uk uses headings where the provision number is directly
 * concatenated with the title, e.g.:
 *   <h3>88Keeping information about higher-risk buildings</h3>
 *   <h3>1Citation, commencement and application</h3>
 *
 * Part headings look like:
 *   <h2>Part 4Higher-Risk Buildings</h2>
 *
 * Schedule headings look like:
 *   <h2>Schedule 1Amendments...</h2>
 */
function parseLegislationHtml(
  html: string,
  provisionType: string
): ScrapedSection[] {
  // Strip non-content elements
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const sections: ScrapedSection[] = [];
  let currentPart = "";

  // Find ALL headings with their positions
  const allHeadings: {
    index: number;
    endIndex: number;
    level: number;
    rawTitle: string;
    type: "part" | "provision" | "schedule" | "other";
    number: string;
    title: string;
  }[] = [];

  const headingPattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = headingPattern.exec(cleaned)) !== null) {
    const rawTitle = stripHtml(match[2]).trim();
    if (!rawTitle || rawTitle.length < 2) continue;

    const level = parseInt(match[1]);

    // Check if this is a provision heading (number + title)
    // Pattern: starts with digits, optionally followed by a letter (e.g., 88A)
    const provisionMatch = rawTitle.match(/^(\d+[A-Z]?)\s*(.*)/);

    // Check if this is a Part heading
    const partMatch = rawTitle.match(/^Part\s+(\d+[A-Z]?)\s*(.*)/i);

    // Check if this is a Schedule heading
    const scheduleMatch = rawTitle.match(/^Schedule\s+(\d+[A-Z]?)\s*(.*)/i);

    if (partMatch) {
      allHeadings.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        level,
        rawTitle,
        type: "part",
        number: partMatch[1],
        title: partMatch[2] || "",
      });
    } else if (scheduleMatch) {
      allHeadings.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        level,
        rawTitle,
        type: "schedule",
        number: scheduleMatch[1],
        title: scheduleMatch[2] || "",
      });
    } else if (provisionMatch && /^\d/.test(rawTitle)) {
      allHeadings.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        level,
        rawTitle,
        type: "provision",
        number: provisionMatch[1],
        title: provisionMatch[2] || "",
      });
    } else {
      allHeadings.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        level,
        rawTitle,
        type: "other",
        number: "",
        title: rawTitle,
      });
    }
  }

  // Extract content for each provision heading
  for (let i = 0; i < allHeadings.length; i++) {
    const heading = allHeadings[i];

    // Track current Part for metadata
    if (heading.type === "part") {
      currentPart = `Part ${heading.number}${heading.title ? " — " + heading.title : ""}`;
      continue;
    }

    // Skip non-provision headings (other, schedule for now)
    if (heading.type !== "provision") continue;

    // Get content between this heading and the next heading
    const contentStart = heading.endIndex;
    const contentEnd = i + 1 < allHeadings.length
      ? allHeadings[i + 1].index
      : cleaned.length;

    const block = cleaned.substring(contentStart, contentEnd);
    const sectionText = extractTextContent(block);

    // Skip empty sections
    if (!sectionText || sectionText.length < 10) continue;

    // Build the proper label
    const provLabel = provisionType === "regulation"
      ? "Regulation"
      : provisionType === "article"
        ? "Article"
        : "Section";

    const sectionRef = `${provLabel} ${heading.number}`;
    const sectionTitle = heading.title || heading.rawTitle;

    // Handle oversized sections — split at subsection boundaries
    if (sectionText.length > 4000) {
      const chunks = splitAtSubsections(sectionText, 4000);
      for (let c = 0; c < chunks.length; c++) {
        sections.push({
          section_ref: sectionRef + (chunks.length > 1 ? ` (${c + 1}/${chunks.length})` : ""),
          section_title: sectionTitle,
          section_text: chunks[c],
        });
      }
    } else {
      sections.push({
        section_ref: sectionRef,
        section_title: sectionTitle,
        section_text: sectionText,
      });
    }
  }

  return sections;
}

/**
 * Extract readable text content from an HTML block.
 * Preserves subsection numbering like (1), (2), (a), (b).
 */
function extractTextContent(html: string): string {
  // Extract text from paragraph-like elements
  const parts: string[] = [];
  const contentPattern = /<(?:p|li|td|dd|blockquote|div|span)[^>]*>([\s\S]*?)<\/(?:p|li|td|dd|blockquote|div|span)>/gi;
  let contentMatch;
  while ((contentMatch = contentPattern.exec(html)) !== null) {
    const text = stripHtml(contentMatch[1]).trim();
    if (text && text.length > 3) {
      parts.push(text);
    }
  }

  if (parts.length > 0) {
    return parts.join("\n");
  }

  // Fallback: strip all HTML and return cleaned text
  const plainText = stripHtml(html).trim();
  return plainText.length > 10 ? plainText : "";
}

/**
 * Split oversized section text at subsection boundaries: (1), (2), etc.
 */
function splitAtSubsections(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  // Split at subsection markers like "(1)", "(2)", "(3)"
  const parts = text.split(/(?=\(\d+\)\s)/);

  let current = "";
  for (const part of parts) {
    if (current.length + part.length > maxLength && current.length > 100) {
      chunks.push(current.trim());
      current = "";
    }
    current += part;
  }
  if (current.trim().length > 10) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

// ---------------------------------------------------------------------------
// Generic HTML scraper (fallback for non-legislation sites)
// ---------------------------------------------------------------------------

/**
 * Extract meaningful sections from raw HTML.
 * Strategy: split by heading tags (h1-h6) and collect following paragraph content.
 */
function extractSectionsFromHtml(html: string): ScrapedSection[] {
  // Strip script, style, nav, header, footer tags and their content
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const sections: ScrapedSection[] = [];

  // Split by heading tags — capture heading content and everything until next heading
  const headingPattern = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings: { index: number; level: number; title: string }[] = [];

  let match;
  while ((match = headingPattern.exec(cleaned)) !== null) {
    const title = stripHtml(match[2]).trim();
    if (title && title.length > 2 && title.length < 500) {
      headings.push({ index: match.index, level: parseInt(match[1]), title });
    }
  }

  // Extract content between headings
  for (let i = 0; i < headings.length; i++) {
    const startIdx = headings[i].index;
    const endIdx = i + 1 < headings.length ? headings[i + 1].index : cleaned.length;
    const block = cleaned.substring(startIdx, endIdx);

    // Extract paragraph and list content from the block
    const contentParts: string[] = [];
    const contentPattern = /<(?:p|li|td|dd|blockquote)[^>]*>([\s\S]*?)<\/(?:p|li|td|dd|blockquote)>/gi;
    let contentMatch;
    while ((contentMatch = contentPattern.exec(block)) !== null) {
      const text = stripHtml(contentMatch[1]).trim();
      if (text && text.length > 10) {
        contentParts.push(text);
      }
    }

    const sectionText = contentParts.join("\n");

    // Only include sections with meaningful content
    if (sectionText.length > 20) {
      // Try to extract a section reference (e.g., "Section 4", "Regulation 7", "Part B")
      const refMatch = headings[i].title.match(
        /^(Section\s+\d+[\w.]*|Regulation\s+\d+[\w.]*|Part\s+[A-Z\d]+|Article\s+\d+[\w.]*|Clause\s+\d+[\w.]*)/i
      );

      sections.push({
        section_ref: refMatch ? refMatch[1] : "",
        section_title: headings[i].title,
        section_text: sectionText.substring(0, 4000), // Cap at 4000 chars per section
      });
    }
  }

  // If no heading-based sections found, try splitting by <section> or <article> tags
  if (sections.length === 0) {
    const sectionPattern = /<(?:section|article)[^>]*>([\s\S]*?)<\/(?:section|article)>/gi;
    let idx = 0;
    while ((match = sectionPattern.exec(cleaned)) !== null) {
      const text = stripHtml(match[1]).trim();
      if (text.length > 50) {
        const firstLine = text.split("\n")[0] || "";
        sections.push({
          section_ref: "",
          section_title: firstLine.substring(0, 200),
          section_text: text.substring(0, 4000),
        });
        idx++;
        if (idx >= 50) break; // Limit to 50 sections
      }
    }
  }

  // Last resort: split the whole body text into chunks
  if (sections.length === 0) {
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyText = stripHtml(bodyMatch ? bodyMatch[1] : cleaned).trim();
    if (bodyText.length > 100) {
      // Split into ~2000 char chunks at paragraph boundaries
      const paragraphs = bodyText.split(/\n\s*\n/).filter((p) => p.trim().length > 20);
      let chunk = "";
      let chunkIdx = 0;
      for (const para of paragraphs) {
        if (chunk.length + para.length > 2000 && chunk.length > 100) {
          sections.push({
            section_ref: "",
            section_title: `Section ${chunkIdx + 1}`,
            section_text: chunk.trim(),
          });
          chunk = "";
          chunkIdx++;
          if (chunkIdx >= 30) break;
        }
        chunk += para + "\n\n";
      }
      if (chunk.trim().length > 100) {
        sections.push({
          section_ref: "",
          section_title: `Section ${chunkIdx + 1}`,
          section_text: chunk.trim(),
        });
      }
    }
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Orchestrator — scrape, embed, store
// ---------------------------------------------------------------------------

/**
 * Scrape a regulation from its source URL, embed sections, and store in regulation_sections.
 * Uses fetch()-based scraping by default (works on Vercel serverless).
 */
export async function scrapeAndStoreRegulation(
  regulationId: string,
  config: RegulationScraperConfig,
  onProgress?: (scraped: number, embedded: number) => void
): Promise<{ sections_scraped: number; sections_stored: number }> {
  // Scrape sections using fetch (lightweight, no Playwright)
  const scrapedSections = await fetchRegulationSections(config);

  if (scrapedSections.length === 0) {
    throw new Error("No sections found on the page. The page may require JavaScript rendering or have a different structure.");
  }

  onProgress?.(scrapedSections.length, 0);

  // Delete existing sections for this regulation (re-scrape replaces)
  await supabaseAdmin
    .from("regulation_sections")
    .delete()
    .eq("regulation_id", regulationId);

  // Embed and store each section
  let stored = 0;

  for (let i = 0; i < scrapedSections.length; i++) {
    const section = scrapedSections[i];
    const textForEmbedding = [section.section_title, section.section_text]
      .filter(Boolean)
      .join(". ");

    if (!textForEmbedding.trim()) continue;

    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(textForEmbedding);
    } catch {
      // Skip embedding on failure — section still gets stored without vector
    }

    const { error } = await supabaseAdmin
      .from("regulation_sections")
      .insert({
        regulation_id: regulationId,
        section_ref: section.section_ref || null,
        section_title: section.section_title || null,
        section_text: section.section_text,
        page_number: section.page_number || null,
        chunk_index: i,
        embedding,
        metadata: {},
      });

    if (!error) stored++;

    onProgress?.(scrapedSections.length, stored);
  }

  // Update regulation last_scraped_at
  await supabaseAdmin
    .from("regulations")
    .update({
      last_scraped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", regulationId);

  return { sections_scraped: scrapedSections.length, sections_stored: stored };
}
