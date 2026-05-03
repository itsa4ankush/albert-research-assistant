import { Link } from "@tanstack/react-router";
import type { Paper } from "@/lib/types";
import { deletePaper } from "@/lib/store";
import { Trash2, Loader2, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { pickRelevantChunks } from "@/lib/pdf";
import { askWatsonx } from "@/functions/watsonx.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColor(score: number): string {
  if (score >= 75) return "bg-coral text-accent-foreground";
  if (score >= 50) return "bg-coral/30 text-foreground";
  return "bg-muted text-muted-foreground";
}

export function PaperCard({
  paper,
  onChange,
}: {
  paper: Paper;
  onChange?: () => void;
}) {
  const excerpt =
    paper.excerpt ?? paper.fullText.slice(0, 220).replace(/\s+/g, " ");
  const score = paper.relevanceScore;
  const [askExpanded, setAskExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!question.trim() || loading) return;

    setLoading(true);
    setAnswer("");

    try {
      // Pick top 3 relevant chunks for token economy
      const relevantChunks = pickRelevantChunks(question, paper.chunks, 3);
      
      const result = await askWatsonx({
        data: { question: question.trim(), contextChunks: relevantChunks, history: [] },
      });

      if (result.error) {
        setAnswer(`Error: ${result.error}`);
      } else {
        setAnswer(result.text || "No response received.");
      }
    } catch (err) {
      setAnswer(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAsk = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAskExpanded(!askExpanded);
    if (askExpanded) {
      // Reset state when collapsing
      setQuestion("");
      setAnswer("");
    }
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-paper">
      <Link
        to="/papers/$paperId"
        params={{ paperId: paper.id }}
        className="flex flex-col p-6"
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>{formatDate(paper.uploadedAt)}</span>
          <span>{paper.pageCount} pp</span>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <h3 className="line-clamp-2 flex-1 font-display text-2xl font-semibold leading-tight tracking-tight text-balance">
            {paper.title}
          </h3>
          {paper.analyzing ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing
            </span>
          ) : typeof score === "number" ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${scoreColor(score)}`}
              title="Relevance to your research context"
            >
              {score}
            </span>
          ) : null}
        </div>

        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
          {excerpt}
          {!paper.excerpt && "…"}
        </p>

        {paper.tags && paper.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {paper.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-paper-deep/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {paper.keywords && paper.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" title="Keywords matched to your research context">
            {paper.keywords.slice(0, 6).map((k) => (
              <span
                key={k}
                className="rounded-md bg-coral/15 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80"
              >
                {k}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-5 text-xs">
          <span className="font-mono truncate text-muted-foreground">
            {paper.filename}
          </span>
          <button
            type="button"
            aria-label="Delete paper"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Remove this paper and its chat?")) {
                deletePaper(paper.id);
                onChange?.();
              }
            }}
            className="rounded-full p-2 text-muted-foreground opacity-0 transition hover:bg-paper-deep hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </Link>

      {/* Quick Ask Bob Section */}
      <div className="border-t border-border px-6 pb-4">
        <button
          type="button"
          onClick={toggleAsk}
          className="flex w-full items-center justify-between py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Ask Bob about this paper
          </span>
          {askExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {askExpanded && (
          <div className="space-y-3">
            <form onSubmit={handleAsk} className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a quick question…"
                disabled={loading}
                className="h-9 flex-1 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !question.trim()}
                className="h-9 bg-coral text-accent-foreground hover:bg-coral/90"
                onClick={(e) => e.stopPropagation()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            {answer && (
              <div className="rounded-lg border border-border bg-paper-deep/40 p-3 text-sm text-foreground">
                {answer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PaperCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="mt-4 h-7 w-5/6" />
      <Skeleton className="mt-2 h-7 w-3/4" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-11/12" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

// Made with Bob
