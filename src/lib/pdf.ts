// Browser-only PDF text extraction using pdfjs-dist.
// Returns full text + naive chunks suitable for keyword retrieval.

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
}

export type ParsedPdf = {
  fullText: string;
  pageCount: number;
  chunks: string[];
  inferredTitle: string;
};

export async function parsePdf(file: File): Promise<ParsedPdf> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  const fullText = pages.join("\n\n").trim();

  // chunk ~1200 chars with overlap
  const chunks: string[] = [];
  const size = 1200;
  const overlap = 150;
  for (let i = 0; i < fullText.length; i += size - overlap) {
    chunks.push(fullText.slice(i, i + size));
  }

  // crude title: first non-trivial line of page 1, max 120 chars
  const firstLine = (pages[0] || file.name)
    .split(/\.|\n/)
    .map((s) => s.trim())
    .find((s) => s.length > 12 && s.length < 160) || file.name.replace(/\.pdf$/i, "");

  return {
    fullText,
    pageCount: pdf.numPages,
    chunks,
    inferredTitle: firstLine.slice(0, 140),
  };
}

const STOP = new Set([
  "the","a","an","of","and","or","to","in","is","it","that","this","for","on","with","as","by","be","are","was","were","at","from","we","you","i","but","not","have","has","had","can","will","do","does","did","what","which","who","whom","how","why","when","where",
]);

export function pickRelevantChunks(
  question: string,
  chunks: string[],
  k = 4
): string[] {
  if (chunks.length <= k) return chunks;
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

  const scored = chunks.map((c, idx) => {
    const lc = c.toLowerCase();
    let score = 0;
    for (const t of terms) {
      const m = lc.split(t).length - 1;
      score += m;
    }
    return { idx, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k).filter((s) => s.score > 0);
  if (top.length === 0) return chunks.slice(0, k); // fallback: first k
  return top.sort((a, b) => a.idx - b.idx).map((s) => chunks[s.idx]);
}

// Chunk arbitrary text (e.g. extracted from an HTML page) into the same shape
// as parsePdf output so it can be stored as a Paper.
export function chunkText(fullText: string): { fullText: string; chunks: string[] } {
  const chunks: string[] = [];
  const size = 1200;
  const overlap = 150;
  for (let i = 0; i < fullText.length; i += size - overlap) {
    chunks.push(fullText.slice(i, i + size));
  }
  return { fullText, chunks };
}
