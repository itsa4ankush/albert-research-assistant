import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "./watsonx.server";

const askSchema = z.object({
  question: z.string().min(1).max(4000),
  contextChunks: z.array(z.string().max(8000)).max(8).default([]),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(10)
    .default([]),
});

function buildPrompt(input: z.infer<typeof askSchema>): string {
  const ctx = input.contextChunks.length
    ? input.contextChunks
        .map((c, i) => `[Excerpt ${i + 1}]\n${c}`)
        .join("\n\n")
    : "(No paper context provided.)";

  const hist = input.history
    .map((m) => `${m.role === "user" ? "User" : "Albert"}: ${m.content}`)
    .join("\n");

  return [
    "You are Albert, a precise research assistant. Answer using ONLY the excerpts when relevant. If the excerpts do not contain the answer, say so plainly. Be concise and cite excerpt numbers like [1], [2] when you rely on them.",
    "",
    "PAPER EXCERPTS:",
    ctx,
    "",
    hist ? `CONVERSATION SO FAR:\n${hist}\n` : "",
    `User: ${input.question}`,
    "Albert:",
  ].join("\n");
}

export const askWatsonx = createServerFn({ method: "POST" })
  .inputValidator((data) => askSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const prompt = buildPrompt(data);
      const { text } = await generateText(prompt, { max_new_tokens: 700 });
      return { text: text.trim(), error: null as string | null };
    } catch (err) {
      console.error("askWatsonx failed:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      return { text: "", error: message };
    }
  });

export const watsonxHello = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { text } = await generateText(
        "Reply with exactly: Albert is online.",
        { max_new_tokens: 20 }
      );
      return { text: text.trim(), error: null as string | null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { text: "", error: message };
    }
  }
);

// ---------- Paper analysis ----------

const analyzeSchema = z.object({
  title: z.string().max(500),
  text: z.string().min(50).max(40000),
  researchContext: z
    .object({
      topic: z.string().optional(),
      background: z.string().optional(),
      problem: z.string().optional(),
      outcome: z.string().optional(),
      other: z.string().optional(),
    })
    .partial()
    .optional()
    .default({}),
});

export const analyzePaper = createServerFn({ method: "POST" })
  .inputValidator((data) => analyzeSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = data.researchContext ?? {};
    
    // Build context block with proper formatting
    const topicLine = ctx.topic ? `Topic:            ${ctx.topic}` : "Topic:            (not specified)";
    const backgroundLine = ctx.background ? `Background:       ${ctx.background}` : "Background:       (not specified)";
    const problemLine = ctx.problem ? `Problem:          ${ctx.problem}` : "Problem:          (not specified)";
    const outcomeLine = ctx.outcome ? `Expected Outcome: ${ctx.outcome}` : "Expected Outcome: (not specified)";
    const otherLine = ctx.other ? `Additional Notes: ${ctx.other}` : "Additional Notes: (none)";

    const prompt = [
      "You are Albert, a precise academic research assistant.",
      "",
      "Your task: analyze the paper below against the researcher's specific context and return structured JSON.",
      "",
      "═══════════════════════════════",
      "RESEARCHER CONTEXT",
      "═══════════════════════════════",
      topicLine,
      backgroundLine,
      problemLine,
      outcomeLine,
      otherLine,
      "",
      "═══════════════════════════════",
      "PAPER",
      "═══════════════════════════════",
      `Title: ${data.title}`,
      "",
      data.text.slice(0, 12000),
      "",
      "═══════════════════════════════",
      "INSTRUCTIONS",
      "═══════════════════════════════",
      "Return ONLY a single valid JSON object. No prose, no markdown, no code fences.",
      "",
      "Reasoning order (internal, not output):",
      "1. Read the paper and identify its core contribution, method, and findings.",
      "2. Cross-reference each element of the researcher's context against the paper.",
      "3. Derive relevanceScore (0–100) from that alignment — high score requires direct overlap on topic, problem, AND expected outcome; partial overlap scores 40–69; tangential scores below 40.",
      "4. Populate every field below from steps 1–3.",
      "",
      "JSON schema (all strings unless noted):",
      "{",
      '  "summary": "Formal overview of the paper\'s contribution and findings. ≤500 words.",',
      '  "methodologySummary": "Methods, techniques, datasets, and experimental setup used. ≤500 words.",',
      '  "researchApproach": "One of: empirical | theoretical | survey | mixed | design-science — then a ≤500-word explanation of how the paper applies that approach.",',
      '  "outcome": "Key results, metrics, and conclusions. Be specific — cite numbers if present. ≤500 words.",',
      '  "researchAlignment": "Explain, field by field, how this paper relates to the researcher\'s Topic, Background, Problem, and Expected Outcome. Identify gaps where the paper does not address the researcher\'s needs. ≤500 words.",',
      '  "relevanceScore": <integer 0–100, must be numerically consistent with researchAlignment>,',
      '  "tags": ["3–5 lowercase kebab-case topic tags derived from the paper content"],',
      '  "excerpt": "1–2 sentence plain-language summary a non-expert can understand. ≤220 characters.",',
      '  "keywords": ["6–12 lowercase retrieval keywords that appear in both the paper AND the researcher\'s context"]',
      "}",
      "",
      "Hard rules:",
      "- relevanceScore must reflect the strength described in researchAlignment. Contradictions are invalid.",
      "- excerpt must be ≤220 characters. Count carefully.",
      "- keywords must appear in the paper text — no invented terms.",
      '- Do not pad fields. Omit filler phrases like "the paper explores", "this study aims to", "it is worth noting".',
      "- If the paper is only tangentially related to the researcher's context, say so explicitly in researchAlignment and score accordingly.",
      "- Output must parse as valid JSON. Escape all inner quotes.",
    ].join("\n");

    try {
      const { text } = await generateText(prompt, { max_new_tokens: 2000, temperature: 0.1 });
      
      // Extract JSON from response (handle potential markdown code fences or extra text)
      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonText) as {
        summary?: string;
        methodologySummary?: string;
        researchApproach?: string;
        outcome?: string;
        researchAlignment?: string;
        relevanceScore?: number;
        tags?: string[];
        excerpt?: string;
        keywords?: string[];
      };

      // Validate and sanitize all fields
      const relevanceScore = Math.max(0, Math.min(100, Math.round(Number(parsed.relevanceScore ?? 50))));
      
      return {
        // New research database fields
        summary: String(parsed.summary ?? "").slice(0, 5000),
        methodologySummary: String(parsed.methodologySummary ?? "").slice(0, 5000),
        researchApproach: String(parsed.researchApproach ?? "").slice(0, 5000),
        outcome: String(parsed.outcome ?? "").slice(0, 5000),
        researchAlignment: String(parsed.researchAlignment ?? "").slice(0, 5000),
        relevanceScore,
        // Existing fields (for backward compatibility)
        relevance: relevanceScore, // Keep both for consistency
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.slice(0, 6).map((t) => String(t).toLowerCase())
          : [],
        excerpt: String(parsed.excerpt ?? "").slice(0, 280),
        keywords: Array.isArray(parsed.keywords)
          ? Array.from(
              new Set(
                parsed.keywords
                  .slice(0, 16)
                  .map((k) => String(k).toLowerCase().trim())
                  .filter((k) => k.length > 1 && k.length <= 60)
              )
            )
          : [],
        error: null as string | null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("analyzePaper failed:", err);
      
      // Return safe fallback values - never crash the upload flow
      return {
        summary: "",
        methodologySummary: "",
        researchApproach: "",
        outcome: "",
        researchAlignment: "",
        relevanceScore: null,
        relevance: 50,
        tags: [] as string[],
        excerpt: data.text.slice(0, 200),
        keywords: [] as string[],
        error: message,
      };
    }
  });

// ---------- URL fetch + extract ----------

const urlSchema = z.object({ url: z.string().url() });

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string, fallback: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim().slice(0, 200);
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t?.[1]) return t[1].trim().slice(0, 200);
  return fallback;
}

export const fetchPaperFromUrl = createServerFn({ method: "POST" })
  .inputValidator((data) => urlSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AlbertBot/1.0; +https://lovable.app)",
          Accept: "text/html,application/pdf,*/*",
        },
        redirect: "follow",
      });
      if (!res.ok) {
        return { ok: false as const, error: `Fetch failed (${res.status})` };
      }
      const contentType = res.headers.get("content-type") || "";

      if (
        contentType.includes("application/pdf") ||
        data.url.toLowerCase().split("?")[0].endsWith(".pdf")
      ) {
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        const filename = data.url.split("/").pop()?.split("?")[0] || "paper.pdf";
        return {
          ok: true as const,
          kind: "pdf" as const,
          base64: b64,
          filename,
          title: filename.replace(/\.pdf$/i, ""),
        };
      }

      const html = await res.text();
      const title = extractTitle(html, data.url);
      const text = stripHtml(html);
      if (text.length < 200) {
        return { ok: false as const, error: "Could not extract enough text from that page." };
      }
      return {
        ok: true as const,
        kind: "html" as const,
        title,
        text: text.slice(0, 200_000),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { ok: false as const, error: message };
    }
  });

// Made with Bob
