import * as XLSX from 'xlsx';
import { createHash } from 'crypto';

export interface ExcelFileMetadata {
  filename: string;
  fileHash: string;
  totalRows: number;
  totalColumns: number;
  columnHeaders: string[];
}

export interface ExcelRowData {
  rowIndex: number;
  rowData: Record<string, any>;
  rowText: string;
}

export interface ProcessedExcelFile {
  metadata: ExcelFileMetadata;
  rows: ExcelRowData[];
}

export function calculateFileHash(buffer: ArrayBuffer): string {
  const hash = createHash('sha256');
  hash.update(Buffer.from(buffer));
  return hash.digest('hex');
}

export function processExcelFile(buffer: ArrayBuffer, filename: string): ProcessedExcelFile {
  const workbook = XLSX.read(buffer, { type: 'array' });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No sheets found in Excel file');
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) {
    throw new Error('Unable to read first sheet');
  }

  const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

  if (jsonData.length < 2) {
    throw new Error('Excel file must contain at least a header row and one data row');
  }

  const headers = jsonData[0] as string[];
  const dataRows = jsonData.slice(1);

  const fileHash = calculateFileHash(buffer);

  const rows: ExcelRowData[] = dataRows.map((row, index) => {
    const rowData: Record<string, any> = {};
    const textParts: string[] = [];

    headers.forEach((header, colIndex) => {
      const value = row[colIndex];
      if (value !== undefined && value !== null && value !== '') {
        rowData[header] = value;
        textParts.push(`${header}: ${value}`);
      }
    });

    const rowText = textParts.join('; ');

    return {
      rowIndex: index + 2,
      rowData,
      rowText,
    };
  });

  const metadata: ExcelFileMetadata = {
    filename,
    fileHash,
    totalRows: rows.length,
    totalColumns: headers.length,
    columnHeaders: headers,
  };

  return {
    metadata,
    rows,
  };
}

export function rowMatchesKeywords(row: ExcelRowData, keywords: string[]): boolean {
  const searchText = row.rowText.toLowerCase();
  return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
}

export function extractKeywordsFromQuery(query: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'when', 'where', 'who', 'which', 'how', 'why']);

  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return Array.from(new Set(words));
}
