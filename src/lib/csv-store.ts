// src/lib/csv-store.ts

import type { Profile, ResearchContext } from "./auth";
import type { Paper } from "./types";

const RESEARCHERS_KEY = "albert.csv.researchers";
const PAPERS_KEY = "albert.csv.papers";

// ── helpers ──────────────────────────────────────────────────────────────────

function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

// ── Researcher (Profile) CRUD ─────────────────────────────────────────────────

export function getAllResearchers(): Profile[] {
  return readStore<Profile[]>(RESEARCHERS_KEY, []);
}

export function getResearcher(id: string): Profile | null {
  return getAllResearchers().find((r) => r.id === id) ?? null;
}

export function upsertResearcher(profile: Profile): Profile {
  const all = getAllResearchers();
  const idx = all.findIndex((r) => r.id === profile.id);
  if (idx >= 0) all[idx] = profile;
  else all.push(profile);
  writeStore(RESEARCHERS_KEY, all);
  return profile;
}

export function deleteResearcher(id: string) {
  writeStore(
    RESEARCHERS_KEY,
    getAllResearchers().filter((r) => r.id !== id)
  );
}

// ── Paper CRUD ────────────────────────────────────────────────────────────────

export function getAllPapers(): Paper[] {
  return readStore<Paper[]>(PAPERS_KEY, []);
}

export function getPaperById(id: string): Paper | null {
  return getAllPapers().find((p) => p.id === id) ?? null;
}

export function upsertPaper(paper: Paper): Paper {
  const all = getAllPapers();
  const idx = all.findIndex((p) => p.id === paper.id);
  if (idx >= 0) all[idx] = paper;
  else all.unshift(paper);
  writeStore(PAPERS_KEY, all);
  return paper;
}

export function updatePaperFields(id: string, patch: Partial<Paper>): Paper | null {
  const all = getAllPapers();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch };
  writeStore(PAPERS_KEY, all);
  return all[idx];
}

export function deletePaper(id: string) {
  writeStore(
    PAPERS_KEY,
    getAllPapers().filter((p) => p.id !== id)
  );
}

// ── CSV Export utilities (download as real .csv files) ───────────────────────

export function exportResearchersCSV(): void {
  const rows = getAllResearchers();
  const headers = [
    "id","email","display_name","role","interests","onboarded",
    "topic","technology","industry","background","problem","outcome","other"
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.email ?? "",
        r.display_name ?? "",
        r.role ?? "",
        JSON.stringify(r.interests ?? []),
        r.onboarded ? "true" : "false",
        r.research_context?.topic ?? "",
        r.research_context?.technology ?? "",
        r.research_context?.industry ?? "",
        r.research_context?.background ?? "",
        r.research_context?.problem ?? "",
        r.research_context?.outcome ?? "",
        r.research_context?.other ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  downloadCSV("researchers.csv", lines.join("\n"));
}

export function exportPapersCSV(): void {
  const rows = getAllPapers();
  const headers = [
    "id","title","filename","uploaded_at","page_count","tags",
    "relevance_score","excerpt","keywords","research_alignment",
    "key_findings","methodology_summary","limitations","future_directions",
    "comments","custom_tags"
  ];
  const lines = [
    headers.join(","),
    ...rows.map((p) =>
      [
        p.id,
        p.title,
        p.filename,
        new Date(p.uploadedAt).toISOString(),
        p.pageCount,
        JSON.stringify(p.tags ?? []),
        p.relevanceScore ?? "",
        p.excerpt ?? "",
        JSON.stringify(p.keywords ?? []),
        p.researchRecord?.researchAlignment ?? "",
        p.researchRecord?.summary ?? "",
        p.researchRecord?.methodologySummary ?? "",
        p.researchRecord?.outcome ?? "",
        p.researchRecord?.comments ?? "",
        p.researchRecord?.comments ?? "",
        JSON.stringify(p.researchRecord?.customTags ?? []),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  downloadCSV("papers.csv", lines.join("\n"));
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Made with Bob
