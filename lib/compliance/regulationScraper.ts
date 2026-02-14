/**
 * Regulation-specific scraping logic.
 * Uses fetch() + HTML parsing by default (works on Vercel).
 * Falls back to Playwright via Inngest for complex JS-rendered pages.
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

interface RegulationScraperConfig {
  source_url: string;
  section_selector: string;
  content_selector: string;
  section_ref_selector?: string;
}

/**
 * Lightweight HTML section extractor using fetch() + regex.
 * Works on Vercel serverless — no Playwright required.
 * Extracts sections from static HTML pages (legislation.gov.uk, BSI, gov.uk, etc.)
 */
export async function fetchRegulationSections(
  config: RegulationScraperConfig
): Promise<ScrapedSection[]> {
  const res = await fetch(config.source_url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0; +https://hf-bluebook.vercel.app)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${config.source_url}: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  return extractSectionsFromHtml(html);
}

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
