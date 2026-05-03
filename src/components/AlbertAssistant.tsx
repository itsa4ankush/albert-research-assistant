import { useState } from "react";
import { usePapers } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { askWatsonx } from "@/functions/watsonx.functions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, UserRound, Sparkles } from "lucide-react";
import type { Paper } from "@/lib/types";

type Message = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

/**
 * Simple keyword-based context matching across all papers.
 * Returns relevant excerpts from papers that match the question.
 */
function findRelevantContext(question: string, papers: Paper[], maxChunks = 5): string[] {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  // Score each paper's chunks
  const scored: { paperId: string; chunkIdx: number; score: number; text: string }[] = [];

  for (const paper of papers) {
    // Include paper metadata in scoring
    const titleLower = paper.title.toLowerCase();
    const tagsLower = (paper.tags ?? []).join(" ").toLowerCase();
    const keywordsLower = (paper.keywords ?? []).join(" ").toLowerCase();
    
    // Check research record fields
    const record = paper.researchRecord;
    const summaryLower = (record?.summary ?? "").toLowerCase();
    const alignmentLower = (record?.researchAlignment ?? "").toLowerCase();

    paper.chunks.forEach((chunk, idx) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      for (const term of terms) {
        // Score chunk content
        const chunkMatches = (chunkLower.match(new RegExp(term, "g")) || []).length;
        score += chunkMatches * 2;

        // Bonus for title matches
        if (titleLower.includes(term)) score += 5;
        
        // Bonus for tag/keyword matches
        if (tagsLower.includes(term)) score += 3;
        if (keywordsLower.includes(term)) score += 3;

        // Bonus for research record matches
        if (summaryLower.includes(term)) score += 2;
        if (alignmentLower.includes(term)) score += 2;
      }

      if (score > 0) {
        scored.push({
          paperId: paper.id,
          chunkIdx: idx,
          score,
          text: `[${paper.title}]\n${chunk}`,
        });
      }
    });
  }

  // Sort by score and take top chunks
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxChunks).map((s) => s.text);
}

/**
 * Build a compact research database summary for context
 */
function buildDatabaseSummary(papers: Paper[]): string {
  if (papers.length === 0) return "No papers in database yet.";

  const lines: string[] = ["RESEARCH DATABASE SUMMARY:"];
  
  papers.slice(0, 10).forEach((paper, idx) => {
    const record = paper.researchRecord;
    const score = record?.relevanceScore ?? paper.relevanceScore ?? 0;
    const tags = paper.tags?.slice(0, 3).join(", ") || "no tags";
    
    lines.push(
      `${idx + 1}. "${paper.title}" (relevance: ${score}/100, tags: ${tags})`
    );
    
    if (record?.summary) {
      lines.push(`   Summary: ${record.summary.slice(0, 150)}...`);
    }
  });

  if (papers.length > 10) {
    lines.push(`... and ${papers.length - 10} more papers`);
  }

  return lines.join("\n");
}

export function AlbertAssistant({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { papers } = usePapers();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Find relevant context from all papers
      const relevantChunks = findRelevantContext(input, papers, 5);
      
      // Build database summary for broader context
      const dbSummary = buildDatabaseSummary(papers);

      // Combine context
      const contextChunks = [
        `RESEARCHER PROFILE:\nName: ${profile?.display_name || "Unknown"}\nResearch Context: ${profile?.research_context?.topic || "Not specified"}`,
        dbSummary,
        ...relevantChunks,
      ];

      // Build conversation history (last 4 messages for context)
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await askWatsonx({
        data: { question: input.trim(), contextChunks, history },
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: result.error
          ? `Error: ${result.error}`
          : result.text || "No response received.",
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Clear conversation when closing
    setTimeout(() => {
      setMessages([]);
      setInput("");
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0"
      >
        <SheetHeader className="border-b border-border bg-coral/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-coral/15">
              <UserRound className="h-6 w-6 text-coral" strokeWidth={2.2} />
            </div>
            <div>
              <SheetTitle className="text-xl font-display">
                Talk with Albert
              </SheetTitle>
              <SheetDescription>
                Ask questions across your entire research database
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-coral/10">
                  <Sparkles className="h-8 w-8 text-coral" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">
                  How can I help?
                </h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  I can answer questions about your papers, help draft sections,
                  or suggest next steps based on your research database.
                </p>
                <div className="mt-6 space-y-2 text-left">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Try asking:
                  </p>
                  <div className="space-y-1.5">
                    <button
                      onClick={() =>
                        setInput("What are the main methodologies used across my papers?")
                      }
                      className="block w-full rounded-lg border border-border bg-card/40 px-3 py-2 text-left text-sm transition hover:border-coral hover:bg-card"
                    >
                      What are the main methodologies used across my papers?
                    </button>
                    <button
                      onClick={() =>
                        setInput("Summarize the key findings from my highest-rated papers")
                      }
                      className="block w-full rounded-lg border border-border bg-card/40 px-3 py-2 text-left text-sm transition hover:border-coral hover:bg-card"
                    >
                      Summarize the key findings from my highest-rated papers
                    </button>
                    <button
                      onClick={() =>
                        setInput("Help me draft an introduction for my research")
                      }
                      className="block w-full rounded-lg border border-border bg-card/40 px-3 py-2 text-left text-sm transition hover:border-coral hover:bg-card"
                    >
                      Help me draft an introduction for my research
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.ts}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral/15">
                      <UserRound className="h-4 w-4 text-coral" strokeWidth={2.2} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-coral text-accent-foreground"
                        : "border border-border bg-card"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral/15">
                  <UserRound className="h-4 w-4 text-coral" strokeWidth={2.2} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-coral" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card/40 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Albert anything about your research..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-coral text-accent-foreground hover:bg-coral/90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            {papers.length} {papers.length === 1 ? "paper" : "papers"} in your
            database
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Made with Bob
