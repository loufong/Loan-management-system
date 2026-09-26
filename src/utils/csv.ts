import { Response } from 'express';

export interface CsvColumn<T = any> {
  header: string;
  accessor: keyof T | ((row: T) => any);
}

/**
 * Escapes and sanitizes a cell value for standard CSV output
 * Prevents CSV formula injection for spreadsheets (Excel, Google Sheets)
 */
export function formatCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }

  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
  }

  let str = String(value);

  // Prevent formula injection in spreadsheet software
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts an array of objects to RFC 4180 compliant CSV string
 */
export function generateCsv<T = any>(
  columns: CsvColumn<T>[] | string[],
  data: T[]
): string {
  if (!data || data.length === 0) {
    if (columns.length > 0 && typeof columns[0] === 'object') {
      return (columns as CsvColumn<T>[]).map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',') + '\r\n';
    }
    return '';
  }

  let headers: string[] = [];
  let accessors: ((row: T) => any)[] = [];

  if (typeof columns[0] === 'string') {
    headers = columns as string[];
    accessors = headers.map((h) => (row: any) => row[h]);
  } else {
    const colDefs = columns as CsvColumn<T>[];
    headers = colDefs.map((c) => c.header);
    accessors = colDefs.map((c) => {
      if (typeof c.accessor === 'function') {
        return c.accessor;
      }
      return (row: any) => row[c.accessor];
    });
  }

  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of data) {
    const rowValues = accessors.map((fn) => formatCsvCell(fn(row)));
    csvRows.push(rowValues.join(','));
  }

  return csvRows.join('\r\n');
}

/**
 * Sends a standard CSV file response with appropriate headers
 */
export function sendCsvResponse(res: Response, filename: string, csvContent: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).send(csvContent);
}
