import { getDocumentProxy } from "unpdf";

/**
 * Positioned text extraction: rebuild a PDF's visual lines so a tabular
 * allocation sheet comes out one row per line, columns separated by wide
 * gaps. Layout-agnostic on purpose — the Syncrotess parser matches tokens
 * against known fleet data rather than trusting column positions.
 */
export async function extractPdfLines(data: ArrayBuffer | Uint8Array): Promise<string[]> {
  // pdf.js insists on a plain Uint8Array — a Node Buffer (which IS a
  // Uint8Array) gets rejected, so re-wrap without copying.
  const bytes =
    data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const pdf = await getDocumentProxy(bytes);
  const lines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group items into lines by their y position (PDF y grows upward).
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      const x = item.transform[4] as number;
      const y = item.transform[5] as number;
      const key = Math.round(y / 3) * 3; // 3pt tolerance for slight baseline wobble
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push({ x, str: item.str });
    }

    const ordered = [...rows.entries()].sort((a, b) => b[0] - a[0]); // top of page first
    for (const [, items] of ordered) {
      items.sort((a, b) => a.x - b.x);
      let line = "";
      let prevEnd = -Infinity;
      for (const it of items) {
        // A visible horizontal jump means a new column — mark it clearly.
        line += it.x - prevEnd > 12 && line !== "" ? "\t" : line === "" ? "" : " ";
        line += it.str.trim();
        prevEnd = it.x + it.str.length * 4; // rough advance; only the gap heuristic uses it
      }
      if (line.trim() !== "") lines.push(line);
    }
  }
  return lines;
}
