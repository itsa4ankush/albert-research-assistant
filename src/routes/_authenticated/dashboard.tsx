import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePapers } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { PaperCard, PaperCardSkeleton } from "@/components/PaperCard";
import { UploadPaperDialog } from "@/components/UploadPaperDialog";
import { updatePaper } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { X, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Paper, ResearchDatabaseRow } from "@/lib/types";
import { Plus, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Library — Albert" },
      { name: "description", content: "Your uploaded papers." },
    ],
  }),
  component: Dashboard,
});

type SortKey = "relevance" | "date" | "tag";

function getResearchRow(paper: Paper): ResearchDatabaseRow {
  return (
    paper.researchRecord ?? {
      paperTitle: paper.title,
      summary: "",
      methodologySummary: "",
      researchApproach: "",
      outcome: "",
      researchAlignment: "",
      relevanceScore: null,
      comments: "",
      customTags: [],
    }
  );
}

function blankValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  return value;
}

function Dashboard() {
  const { profile, hydrated, profileLoading } = useAuth();
  const { papers } = usePapers();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Send users who haven't completed onboarding back to /onboarding
  useEffect(() => {
    if (hydrated && !profileLoading && profile && !profile.onboarded) {
      navigate({ to: "/onboarding" });
    }
  }, [hydrated, profileLoading, profile, navigate]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of papers) for (const t of p.tags ?? []) set.add(t);
    return Array.from(set).sort();
  }, [papers]);

  const visible = useMemo(() => {
    let list = papers;
    if (tagFilter !== "all") {
      list = list.filter((p) => (p.tags ?? []).includes(tagFilter));
    }
    const sorted = [...list];
    if (sort === "relevance") {
      sorted.sort((a, b) => (b.relevanceScore ?? -1) - (a.relevanceScore ?? -1));
    } else if (sort === "date") {
      sorted.sort((a, b) => b.uploadedAt - a.uploadedAt);
    } else if (sort === "tag") {
      sorted.sort((a, b) =>
        (a.tags?.[0] ?? "zzz").localeCompare(b.tags?.[0] ?? "zzz")
      );
    }
    return sorted;
  }, [papers, sort, tagFilter]);

  const analyzingCount = papers.filter((p) => p.analyzing).length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            Your library
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Papers, in one place.
          </h1>
        </div>
        <Button
          size="lg"
          className="bg-coral text-accent-foreground hover:bg-coral/90"
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add paper
        </Button>
      </div>

      {papers.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <>
          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {visible.length} {visible.length === 1 ? "paper" : "papers"}
              {analyzingCount > 0 && (
                <span className="ml-2 text-coral">
                  · {analyzingCount} analyzing
                </span>
              )}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Sort: Relevance</SelectItem>
                  <SelectItem value="date">Sort: Date added</SelectItem>
                  <SelectItem value="tag">Sort: Tag</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Filter tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {allTags.map((t) => (
                    <SelectItem key={t} value={t}>
                      #{t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-coral">
                  Research database
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                  My research work database
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Each upload now creates a local research record row with blank fields,
                  ready for future AI filling and manual comments or chapter tags.
                </p>
              </div>
              <Button
                className="group h-14 gap-3 rounded-xl bg-coral px-8 text-lg font-semibold text-accent-foreground shadow-soft transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-coral hover:shadow-[0_14px_36px_-10px_var(--coral),0_0_0_4px_color-mix(in_oklab,var(--coral)_25%,transparent)] focus-visible:-translate-y-1 focus-visible:shadow-[0_14px_36px_-10px_var(--coral),0_0_0_4px_color-mix(in_oklab,var(--coral)_35%,transparent)] active:translate-y-0"
                onClick={() => {
                  const first = papers[0];
                  if (first) navigate({ to: "/papers/$paperId", params: { paperId: first.id } });
                }}
              >
                <UserRound className="!h-7 !w-7 transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110" strokeWidth={2.2} />
                Talk with Albert!
              </Button>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Paper title</TableHead>
                    <TableHead className="min-w-[220px]">Summary</TableHead>
                    <TableHead className="min-w-[220px]">Methodology summary</TableHead>
                    <TableHead className="min-w-[220px]">Research approach</TableHead>
                    <TableHead className="min-w-[220px]">Outcome</TableHead>
                    <TableHead className="min-w-[220px]">Research alignment</TableHead>
                    <TableHead className="min-w-[120px]">Relevance score</TableHead>
                    <TableHead className="min-w-[220px]">Comments</TableHead>
                    <TableHead className="min-w-[180px]">Tags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {papers.map((paper) => {
                    const row = getResearchRow(paper);

                    return (
                      <TableRow key={`research-row-${paper.id}`}>
                        <TableCell className="font-medium">{row.paperTitle}</TableCell>
                        <TableCell>{blankValue(row.summary)}</TableCell>
                        <TableCell>{blankValue(row.methodologySummary)}</TableCell>
                        <TableCell>{blankValue(row.researchApproach)}</TableCell>
                        <TableCell>{blankValue(row.outcome)}</TableCell>
                        <TableCell>{blankValue(row.researchAlignment)}</TableCell>
                        <TableCell>{blankValue(row.relevanceScore)}</TableCell>
                        <TableCell>{blankValue(row.comments)}</TableCell>
                        <TableCell>
                          <CustomTagsCell paper={paper} tags={row.customTags} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          <div
            key={tick}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((p) => (
              <PaperCard
                key={p.id}
                paper={p}
                onChange={() => setTick((t) => t + 1)}
              />
            ))}
            {analyzingCount > 0 &&
              visible.length === 0 &&
              Array.from({ length: 3 }).map((_, i) => (
                <PaperCardSkeleton key={`sk-${i}`} />
              ))}
          </div>

        </>
      )}

      <UploadPaperDialog open={open} onOpenChange={setOpen} />
    </main>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-border bg-paper-deep/40 px-8 py-20 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-coral/15 text-coral">
        <FileText className="h-10 w-10" strokeWidth={1.5} />
      </div>
      <h2 className="mt-6 font-display text-3xl">An empty desk.</h2>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        Add your first paper — paste a link or drop a PDF. Albert reads it,
        scores how relevant it is to your research, and is ready to chat.
      </p>
      <Button
        size="lg"
        className="mt-8 bg-coral text-accent-foreground hover:bg-coral/90"
        onClick={onAdd}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add your first paper
      </Button>
    </div>
  );
}

const TAG_SUGGESTIONS = [
  "Review of literature",
  "Results discussion",
  "Hypothesis framework",
  "Idea",
  "Methodology",
];

function CustomTagsCell({ paper, tags }: { paper: Paper; tags: string[] }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  const blank: ResearchDatabaseRow = {
    paperTitle: paper.title,
    summary: "",
    methodologySummary: "",
    researchApproach: "",
    outcome: "",
    researchAlignment: "",
    relevanceScore: null,
    comments: "",
    customTags: [],
  };

  const commit = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const record = paper.researchRecord ?? blank;
    if (record.customTags.includes(t)) return;
    updatePaper(paper.id, {
      researchRecord: { ...record, customTags: [...record.customTags, t] },
    });
    setValue("");
    setAdding(false);
  };

  const remove = (t: string) => {
    const record = paper.researchRecord ?? blank;
    updatePaper(paper.id, {
      researchRecord: {
        ...record,
        customTags: record.customTags.filter((x) => x !== t),
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-medium text-foreground"
        >
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            className="rounded-full text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${t}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {adding ? (
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            commit(value);
            setAdding(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(value);
            } else if (e.key === "Escape") {
              setValue("");
              setAdding(false);
            }
          }}
          list={`tag-suggestions-${paper.id}`}
          placeholder="e.g. Review of literature"
          className="h-7 w-[180px] text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-coral hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add custom tag
        </button>
      )}
      <datalist id={`tag-suggestions-${paper.id}`}>
        {TAG_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
