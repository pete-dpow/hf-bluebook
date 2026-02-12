/**
 * Regulation-specific scraping logic.
 * Wraps the shared playwrightScraper with embedding and storage for regulation_sections.
 */

import { scrapeRegulationSections, type ScrapedSection } from "@/lib/scrapers/playwrightScraper";
import { generateEmbedding } from "@/lib/embeddingService";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface RegulationScraperConfig {
  source_url: string;
  section_selector: string;
  content_selector: string;
  section_ref_selector?: string;
}

/**
 * Scrape a regulation from its source URL, embed sections, and store in regulation_sections.
 * Returns the count of sections created.
 */
export async function scrapeAndStoreRegulation(
  regulationId: string,
  config: RegulationScraperConfig,
  onProgress?: (scraped: number, embedded: number) => void
): Promise<{ sections_scraped: number; sections_stored: number }> {
  // Scrape sections using Playwright
  const scrapedSections = await scrapeRegulationSections(config);

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
