// lib/cde/doc-number.ts — ISO 19650 document number parser + generator
//
// Format: {PROJECT}-{ORIGINATOR}-{FUNCTIONAL}-{SPATIAL}-{DOCTYPE}-{ROLE}-{SEQ}
// Example: PRJ001-HF-FD-ZZ-FRA-S-0001
//
// Also handles revision letters: A, B, C, ... Z, AA, AB, ...

import { DOC_TYPE_CODES, FUNCTIONAL_CODES, SPATIAL_CODES, ROLE_CODES } from "./picklists";

export interface ParsedDocNumber {
  projectCode: string;
  originator: string;
  functional: string;
  spatial: string;
  docType: string;
  role: string;
  sequence: string;
  revision?: string; // Extracted if filename contains _RevX or -RevX suffix
  isValid: boolean;
  raw: string;
}

// ── Parser ──────────────────────────────────────────────────────

const DOC_NUMBER_REGEX = /^([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9]+)-(\d+)/i;
const REVISION_REGEX = /[_-](?:Rev|R)\.?([A-Z]{1,2}|\d+)/i;

export function parseDocNumber(input: string): ParsedDocNumber {
  // Strip file extension if present
  const baseName = input.replace(/\.[^.]+$/, "");

  // Try to extract revision from suffix
  const revMatch = baseName.match(REVISION_REGEX);
  const revision = revMatch ? revMatch[1].toUpperCase() : undefined;

  // Remove revision suffix for number parsing
  const cleanName = revMatch ? baseName.replace(REVISION_REGEX, "") : baseName;

  const match = cleanName.match(DOC_NUMBER_REGEX);

  if (!match) {
    return {
      projectCode: "",
      originator: "",
      functional: "",
      spatial: "",
      docType: "",
      role: "",
      sequence: "",
      revision,
      isValid: false,
      raw: input,
    };
  }

  return {
    projectCode: match[1].toUpperCase(),
    originator: match[2].toUpperCase(),
    functional: match[3].toUpperCase(),
    spatial: match[4].toUpperCase(),
    docType: match[5].toUpperCase(),
    role: match[6].toUpperCase(),
    sequence: match[7],
    revision,
    isValid: true,
    raw: input,
  };
}

// Try to extract doc type from filename even if it's not ISO formatted
export function guessDocType(fileName: string): string | null {
  const upper = fileName.toUpperCase();

  for (const code of DOC_TYPE_CODES) {
    if (upper.includes(code)) return code;
  }

  // Common file extension mappings
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "RPT";
  if (ext === "dwg" || ext === "dxf") return "DWG";
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return "PHO";

  return null;
}

// ── Generator ───────────────────────────────────────────────────

export interface DocNumberParts {
  projectCode: string;
  originator?: string; // defaults to "HF"
  functional: string;
  spatial?: string; // defaults to "ZZ"
  docType: string;
  role?: string; // defaults to "S" (Surveyor)
  sequence: number;
}

export function generateDocNumber(parts: DocNumberParts): string {
  const {
    projectCode,
    originator = "HF",
    functional,
    spatial = "ZZ",
    docType,
    role = "S",
    sequence,
  } = parts;

  const seq = String(sequence).padStart(4, "0");

  return `${projectCode}-${originator}-${functional}-${spatial}-${docType}-${role}-${seq}`.toUpperCase();
}

// ── Revision Helpers ────────────────────────────────────────────

// Convert revision letter(s) to a sortable number: A=1, B=2, ... Z=26, AA=27
export function revisionToNumber(rev: string): number {
  const upper = rev.toUpperCase();
  if (upper.length === 1) {
    return upper.charCodeAt(0) - 64; // A=1
  }
  if (upper.length === 2) {
    return 26 + (upper.charCodeAt(0) - 64 - 1) * 26 + (upper.charCodeAt(1) - 64);
  }
  return 0;
}

// Convert number back to revision letter(s): 1=A, 26=Z, 27=AA
export function numberToRevision(num: number): string {
  if (num <= 0) return "A";
  if (num <= 26) {
    return String.fromCharCode(64 + num);
  }
  const adjusted = num - 27;
  const first = String.fromCharCode(65 + Math.floor(adjusted / 26));
  const second = String.fromCharCode(65 + (adjusted % 26));
  return first + second;
}

// Get next revision: A→B, Z→AA, AA→AB
export function nextRevision(current: string): string {
  const num = revisionToNumber(current);
  return numberToRevision(num + 1);
}

// ── Filename Helpers ────────────────────────────────────────────

// Build full filename with revision: PRJ001-HF-FD-ZZ-FRA-S-0001_RevA.pdf
export function buildFileName(docNumber: string, revision: string, extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `${docNumber}_Rev${revision}${ext}`;
}

// Extract file extension from filename
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

// Check if two filenames refer to the same document (ignoring revision)
export function isSameDocument(fileA: string, fileB: string): boolean {
  const parsedA = parseDocNumber(fileA);
  const parsedB = parseDocNumber(fileB);

  if (!parsedA.isValid || !parsedB.isValid) return false;

  return (
    parsedA.projectCode === parsedB.projectCode &&
    parsedA.originator === parsedB.originator &&
    parsedA.functional === parsedB.functional &&
    parsedA.spatial === parsedB.spatial &&
    parsedA.docType === parsedB.docType &&
    parsedA.role === parsedB.role &&
    parsedA.sequence === parsedB.sequence
  );
}

// Compare revisions: returns negative if a < b, 0 if equal, positive if a > b
export function compareRevisions(revA: string, revB: string): number {
  return revisionToNumber(revA) - revisionToNumber(revB);
}
