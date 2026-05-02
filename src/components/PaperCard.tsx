import { Link } from "@tanstack/react-router";
import type { Paper } from "@/lib/types";
import { deletePaper } from "@/lib/store";
import { Trash2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  return (
    <Link
      to="/papers/$paperId"
      params={{ paperId: paper.id }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-paper"
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
