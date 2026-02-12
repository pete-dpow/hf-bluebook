/**
 * Structure-aware chunker for bluebook PDFs.
 * Splits on section headers and table boundaries, keeping
 * fire test configurations as atomic units.
 */

export interface Chunk {
  text: string;
  chunkType: "text" | "table" | "image_description";
  pageNumber: number;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

// Patterns that indicate a section header
const SECTION_HEADER_PATTERNS = [
  /^\d+(\.\d+)*\s+[A-Z]/m,           // "1.2 Fire Test Results"
  /^(Section|Part|Chapter|Appendix)\s+/im,
  /^[A-Z][A-Z\s]{4,}$/m,             // ALL CAPS LINE (min 5 chars)
  /^(Table|Figure)\s+\d+/im,         // "Table 1" or "Figure 3"
];

// Patterns that indicate fire test data — keep atomic
const FIRE_TEST_PATTERNS = [
  /fire\s+test/i,
  /test\s+report/i,
  /fire\s+resistance/i,
  /integrity.*insulation/i,
  /BS\s*476/i,
  /EN\s*1366/i,
  /EN\s*1634/i,
];

const MAX_CHUNK_TOKENS = 500;
const MIN_CHUNK_TOKENS = 50;

// Rough token estimate: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function isFireTestBlock(text: string): boolean {
  return FIRE_TEST_PATTERNS.some((p) => p.test(text));
}

function isSectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return false;
  return SECTION_HEADER_PATTERNS.some((p) => p.test(trimmed));
}

function isTableLine(line: string): boolean {
  // Heuristic: lines with 3+ pipe chars or tab-separated columns
  const pipeCount = (line.match(/\|/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  return pipeCount >= 3 || tabCount >= 2;
}

interface PageText {
  pageNumber: number;
  text: string;
}

/**
 * Parse PDF buffer into per-page text using pdf-parse.
 */
export async function extractPagesFromPdf(buffer: Buffer): Promise<PageText[]> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require("pdf-parse") as (buf: Buffer, opts?: any) => Promise<{ text: string; numpages: number }>;

  const pages: PageText[] = [];

  // Use full text, split on form feeds for per-page
  const result = await pdfParse(buffer);
  const fullText = result.text;
  const rawPages = fullText.split(/\f/);

  for (let i = 0; i < rawPages.length; i++) {
    if (rawPages[i].trim()) {
      pages.push({ pageNumber: i + 1, text: rawPages[i] });
    }
  }

  // If no form feeds found, treat as single page
  if (pages.length === 0 && fullText.trim()) {
    pages.push({ pageNumber: 1, text: fullText });
  }

  return pages;
}

/**
 * Split a large block into sub-chunks at sentence boundaries.
 */
function splitLargeBlock(text: string, maxTokens: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const subChunks: string[] = [];
  let current: string[] = [];

  for (const sentence of sentences) {
    current.push(sentence);
    if (estimateTokens(current.join(" ")) > maxTokens) {
      if (current.length > 1) {
        const last = current.pop()!;
        subChunks.push(current.join(" "));
        current = [last];
      } else {
        subChunks.push(current.join(" "));
        current = [];
      }
    }
  }

  if (current.length > 0) {
    subChunks.push(current.join(" "));
  }

  return subChunks.filter((s) => s.trim().length > 0);
}

/**
 * Flush a block of lines into chunks. Returns true if a chunk was created.
 */
function flushBlock(
  currentBlock: string[],
  currentType: Chunk["chunkType"],
  inFireTest: boolean,
  pageNumber: number,
  chunks: Chunk[],
  globalChunkIndex: { value: number }
): boolean {
  const blockText = currentBlock.join("\n").trim();
  if (!blockText || estimateTokens(blockText) < MIN_CHUNK_TOKENS) {
    return false;
  }

  if (estimateTokens(blockText) > MAX_CHUNK_TOKENS && !inFireTest) {
    const subChunks = splitLargeBlock(blockText, MAX_CHUNK_TOKENS);
    for (const sub of subChunks) {
      chunks.push({
        text: sub,
        chunkType: currentType,
        pageNumber,
        chunkIndex: globalChunkIndex.value++,
        metadata: {},
      });
    }
  } else {
    chunks.push({
      text: blockText,
      chunkType: currentType,
      pageNumber,
      chunkIndex: globalChunkIndex.value++,
      metadata: inFireTest ? { fire_test_block: true } : {},
    });
  }

  return true;
}

/**
 * Structure-aware chunking of page text.
 * - Splits on section headers and table boundaries
 * - Keeps fire test configurations as atomic units
 * - Respects max token limits
 */
export function chunkPages(pages: PageText[]): Chunk[] {
  const chunks: Chunk[] = [];
  const globalChunkIndex = { value: 0 };

  for (const page of pages) {
    const lines = page.text.split("\n");
    let currentBlock: string[] = [];
    let currentType: Chunk["chunkType"] = "text";
    let inFireTest = false;

    for (const line of lines) {
      // Detect table lines
      if (isTableLine(line)) {
        if (currentType !== "table" && currentBlock.length > 0) {
          flushBlock(currentBlock, currentType, inFireTest, page.pageNumber, chunks, globalChunkIndex);
          currentBlock = [];
          currentType = "text";
          inFireTest = false;
        }
        currentType = "table";
        currentBlock.push(line);
        continue;
      }

      // Detect section headers — start new block
      if (isSectionHeader(line) && currentBlock.length > 0) {
        flushBlock(currentBlock, currentType, inFireTest, page.pageNumber, chunks, globalChunkIndex);
        currentBlock = [];
        currentType = "text";
        inFireTest = false;
      }

      // Detect fire test blocks — keep atomic
      if (isFireTestBlock(line)) {
        inFireTest = true;
      }

      currentBlock.push(line);

      // Check if we've exceeded max (and not in a fire test block)
      const blockText = currentBlock.join("\n");
      if (estimateTokens(blockText) > MAX_CHUNK_TOKENS && !inFireTest) {
        flushBlock(currentBlock, currentType, inFireTest, page.pageNumber, chunks, globalChunkIndex);
        currentBlock = [];
        currentType = "text";
        inFireTest = false;
      }
    }

    // Flush remaining
    if (currentBlock.length > 0) {
      const blockText = currentBlock.join("\n").trim();
      if (blockText) {
        chunks.push({
          text: blockText,
          chunkType: currentType,
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex.value++,
          metadata: inFireTest ? { fire_test_block: true } : {},
        });
      }
    }
  }

  return chunks;
}
