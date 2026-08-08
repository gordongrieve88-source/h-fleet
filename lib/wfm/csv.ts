/**
 * CSV writing for exports (timesheets, BI feeds). RFC4180 quoting, and a
 * leading apostrophe guard on values Excel would otherwise treat as a
 * formula — exported rosters get opened in Excel constantly.
 */

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\r\n");
}
