/**
 * Product file parser — extracts text from uploaded PDF/DXF product files.
 * Sprint 9 task 9.1: parsers for product file uploads.
 * NOTE: Only runs on Inngest (server-side), never bundled for browser.
 */

export interface ParsedProductFile {
  text: string;
  pageCount: number;
  metadata: Record<string, string>;
}

/** Parse a PDF product file and extract text content */
export async function parseProductPdf(buffer: Buffer): Promise<ParsedProductFile> {
  // Dynamic require bypasses webpack bundling — pdf-parse ESM has pdfjs-dist compat issues
  // This only runs on Inngest infrastructure (Node.js), never in browser
  const pdfParse = await (Function('return import("pdf-parse")')() as Promise<any>);
  const parse = pdfParse.default || pdfParse;
  const result = await parse(buffer);

  return {
    text: result.text || "",
    pageCount: result.numpages || 0,
    metadata: {
      title: result.info?.Title || "",
      author: result.info?.Author || "",
      creator: result.info?.Creator || "",
    },
  };
}

/** Parse a DXF file and extract text entities */
export function parseProductDxf(content: string): ParsedProductFile {
  const textEntities: string[] = [];

  // Extract TEXT and MTEXT entity values from DXF
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Group code 1 = primary text value in TEXT/MTEXT entities
    if (trimmed === "1" && i + 1 < lines.length) {
      const value = lines[i + 1].trim();
      if (value && !value.startsWith("{") && value.length > 1) {
        textEntities.push(value);
      }
    }
  }

  return {
    text: textEntities.join("\n"),
    pageCount: 1,
    metadata: {},
  };
}

/** Parse product file based on extension */
export async function parseProductFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedProductFile> {
  const ext = filename.toLowerCase().split(".").pop();

  switch (ext) {
    case "pdf":
      return parseProductPdf(buffer);
    case "dxf":
      return parseProductDxf(buffer.toString("utf-8"));
    default:
      throw new Error(`Unsupported file format: .${ext}`);
  }
}
