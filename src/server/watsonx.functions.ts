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
    const ctxBlock = [
      ctx.topic && `Topic: ${ctx.topic}`,
      ctx.background && `Background: ${ctx.background}`,
      ctx.problem && `Problem: ${ctx.problem}`,
      ctx.outcome && `Expected outcome: ${ctx.outcome}`,
      ctx.other && `Other: ${ctx.other}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = [
      "You are Albert, a research assistant. Analyse the given paper for a researcher with this context:",
      ctxBlock || "(No research context — score relevance generically.)",
      "",
      `PAPER TITLE: ${data.title}`,
      "PAPER TEXT (truncated):",
      data.text.slice(0, 12000),
      "",
      'Respond with ONLY a JSON object, no prose, matching: {"relevance": <integer 0-100>, "tags": [<3-5 short topic tags, lowercase, kebab-case>], "excerpt": "<1-2 sentence plain-language summary, max 220 chars>", "keywords": [<6-12 short keywords or noun-phrases, lowercase, that BOTH appear-in-or-paraphrase the paper AND match the researcher\'s topic/background/problem/outcome above; these will be used as retrieval keywords for RAG, so prefer specific technical terms over generic words>]}.',
    ].join("\n");

    try {
      const { text } = await generateText(prompt, { max_new_tokens: 450, temperature: 0.1 });
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return { relevance: 50, tags: [] as string[], excerpt: data.text.slice(0, 200), keywords: [] as string[], error: null as string | null };
      }
      const parsed = JSON.parse(match[0]) as {
        relevance?: number;
        tags?: string[];
        excerpt?: string;
        keywords?: string[];
      };
      return {
        relevance: Math.max(0, Math.min(100, Math.round(Number(parsed.relevance ?? 50)))),
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
      return { relevance: 50, tags: [] as string[], excerpt: data.text.slice(0, 200), keywords: [] as string[], error: message };
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
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
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
